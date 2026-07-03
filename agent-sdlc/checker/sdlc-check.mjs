// sdlc-check — enforcement-spine CLI skeleton.
// Zero-dependency, bare Node ESM. Parses the CLI surface (spec path + repeatable --require) and
// establishes the exit-code contract: any error path exits nonzero with a message on stderr
// naming the problem; nothing here ever exits 0 on failure (fail-closed).
import { parseArgs, promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

export function run(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        require: { type: 'string', multiple: true, default: [] },
      },
    });
  } catch (err) {
    process.stderr.write(`sdlc-check: could not parse arguments: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const [specPath] = parsed.positionals;

  if (!specPath) {
    process.stderr.write('sdlc-check: missing required spec path argument\n');
    process.exitCode = 1;
    return;
  }

  if (!existsSync(specPath)) {
    process.stderr.write(`sdlc-check: spec path does not exist: ${specPath}\n`);
    process.exitCode = 1;
    return;
  }

  // Later tasks: read the spec, apply --require'd artifact checks, report results.
  // For now, an existing spec path with no further checks is not yet a pass or fail decision —
  // this task only implements the missing/unparseable-input failure path.
}

// --- Spec parser (T-2): sections, AC/C/T IDs, trace references ------------------------------
//
// parseSpec() is pure — it takes text, not a path (a thin fs read belongs at the CLI edge, wired
// in a later task) — so it is trivially testable with inline fixture strings. It never throws:
// missing/empty/unparseable input returns a typed failure `{ ok: false, error }` naming the file
// and the problem, never an empty-model `{ ok: true }` that would later read as a pass.
//
// Model grown across tasks (T-3 adds markers/evidence/proof-map rows to this same success shape):
//   { ok: true, sections, ids, components, traces, provenance, untraced }
//   sections   — the consolidated spec's "##" sections, in order: { name, line, body }.
//   ids        — every AC-N/T-N/C-N ID at its DEFINITION site: { id, kind, section, line, text }.
//                C-N is synthesized from a Design "### Components" numbered list entry's own
//                ordinal (the grammar's only component-numbering convention observed in practice;
//                components are otherwise cited by name, not by a literal "C-N" token).
//   components — the C-N definitions again, denormalized for name lookup: { id, name, section, line }.
//   traces     — every place one artifact CITES an ID: a task's *Advances:*/*Component:*/*Deps:*
//                field, or a coverage/criterion-to-component map table row: { from, kind, refs,
//                raw, line }. `refs` are the cited IDs — a *Component:* field citing a component by
//                NAME is resolved against `components` to its C-N id. T-4's rules consume this to
//                find dangling/unreached links; this task only produces the model.
//   provenance — (T-3) a materialized section's leading HTML-comment marker (see
//                getting-started/reference/input-resolution.md): { section, line, raw, source,
//                date, malformed }. `source`/`date` are `null` when absent; `malformed` is true
//                when either is missing OR `date` is not an absolute `YYYY-MM-DD` date — this is a
//                MODEL fact (AC-6's rule flags it), never a parse failure. A hand-authored section
//                (no leading HTML comment) contributes no entry.
//   untraced   — (T-3) an explicit `AC: untraced (reason)` marker on a task, scoped to the same
//                top-level-bullet ownership as a trace field: { from, reason, raw, section, line }.
//                `reason` is `''` when no parenthetical is given (still recorded, never dropped) —
//                T-4's rule renders this as a coverage note rather than a dangling-reference failure.

// --- Ledger (build-report.md) — task table + green-bar evidence blocks (T-3) ----------------
//
// parseLedger() mirrors parseSpec(): pure (text in, model or typed failure out), never throws.
//   success: { ok: true, tasks, evidence }
//   failure: { ok: false, error: { file, problem } }
//   tasks    — the "## Task ledger" table, one row per task: { task, status, commit, acAdvanced,
//              notes, line }. Column lookup is by header name (case-insensitive), not position.
//   evidence — one entry per "### T-N (@ SHA)" heading (ADR-0001's green-bar evidence shape):
//              { task, sha, blocks, text, commands, line }. `blocks` is the raw text of each fenced
//              code block found before the next heading (usually one); `text` is them joined
//              (T-7's AC-14 name-appearance search target); `commands` are the `$ `-prefixed lines
//              across all blocks. A heading with NO fenced block still gets an entry with
//              `blocks: []`, `text: ''` — a bare claim, present but evidence-less (AC-5's rule
//              needs exactly this present-vs-bare distinction, not a dropped/absent task).
//   A typed failure is reserved for genuinely unreadable input: missing/non-string/empty text, or
//   text with neither a task table nor any evidence heading at all (not a ledger).

// --- Verification report (verification-report.md) — AC → proof-map rows (T-3) ---------------
//
// parseVerificationReport() mirrors parseSpec(): pure, never throws.
//   success: { ok: true, rows }
//   failure: { ok: false, error: { file, problem } }
//   rows — one per criterion row in the "Criterion | Type | Proof" table (the grammar this task
//          designs from the `## Design` data contract — ship writes this file at T-12; no example
//          exists yet): { criterion, type, proof, line }. `type` normalizes to 'test-backed' /
//          'reviewer-checked' when the cell says so (case/spacing-tolerant), else the raw cell
//          text verbatim. `proof` is the named test identifier(s) (test-backed) or the answered
//          pass/fail question (reviewer-checked) — trimmed verbatim, including '' when the cell is
//          empty (a MODEL fact for T-7's AC-13 completeness rule to flag, not a parse failure).

const ID_DEFINITION_RE = /\*\*(AC|C|T)-(\d+)\b/g;
const COMPONENT_LIST_ITEM_RE = /^\s*(\d+)\.\s+\*\*([^*]+)\*\*/;
const SECTION_HEADING_RE = /^##(?!#)\s+(.+?)\s*$/;
const SUBHEADING_RE = /^###\s+(.+?)\s*$/;
const TOP_BULLET_RE = /^-\s+\*\*/;
// Field capture stops at the first '.' after the marker. Not hit by any current spec field (no
// field value contains an internal period — the slash-run and parenthetical forms observed in
// practice never do), so left as-is: distinguishing a field-ending period from one inside
// following prose would need a stronger terminator (e.g. lookahead for the next `*Field:*` marker
// or end-of-bullet) and risks swallowing extra prose into the captured raw text for no observed
// benefit. Revisit if a real field value is ever seen with an internal period.
const TRACE_FIELD_RE = /\*(Advances|Component|Deps):\*\s*([^.]*)\./g;
// Left word boundary so an out-of-scope `NC-N` never leaks its embedded `C-N` (no boundary exists
// between two word characters, so `\b` cannot start a match inside "NC-3"). The optional
// slash-run tail (`(?:\/\d+)*`) matches the spec's slash-abbreviated citation form
// (`AC-1/2/3`, `AC-3/5/6/13/14`) — the prefix carries across the run; expanded into individual
// IDs in extractIdRefs(), not here.
const ID_REF_RE = /\b(AC|C|T)-\d+(?:\/\d+)*\b/g;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|[\s:-]+\|\s*$/;
// A provenance marker is the whole first non-blank line of a materialized section's body, an HTML
// comment (see getting-started/reference/input-resolution.md). Any leading HTML comment there is
// treated as a marker ATTEMPT — parsed for source/date and flagged malformed if either is missing,
// rather than silently skipped, so "present but malformed" (AC-6) has a representation.
const PROVENANCE_MARKER_RE = /^<!--\s*(.*?)\s*-->\s*$/;
const PROVENANCE_SOURCE_RE = /source\s*:\s*([^·|]*?)(?=\s*(?:·|\||\bingested\b)|$)/i;
const PROVENANCE_DATE_RE = /\bingested\b\s+([^\s].*?)\s*$/i;
const ABSOLUTE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// `AC: untraced` — the input-resolution contract's marker for a task with no real upstream
// criterion. The parenthetical reason is optional in the grammar (never required to keep the
// marker from being dropped); capture it when present.
const UNTRACED_RE = /AC:\s*untraced\b\s*(?:\(([^)]*)\))?/gi;
// Ledger: a green-bar evidence heading, "### T-N (@ `SHA`)" (backticks optional/tolerant).
const LEDGER_EVIDENCE_HEADING_RE = /^###\s+(T-\d+)\s*\(@\s*`?([^`)]*?)`?\s*\)/;
const HEADING_RE = /^#{1,6}\s+/;
const FENCE_LINE_RE = /^```/;

export function parseSpec(text, file = '<unknown spec file>') {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: { file, problem: 'missing or empty spec content' } };
  }

  const lines = text.split(/\r\n|\r|\n/);
  const sections = extractSections(lines);
  if (sections.length === 0) {
    return {
      ok: false,
      error: { file, problem: 'no "##" sections found — unparseable spec content' },
    };
  }

  const components = extractComponents(sections);
  const componentsByName = new Map(components.map((c) => [c.name.toLowerCase(), c.id]));
  const ids = [
    ...extractExplicitIds(sections),
    ...components.map(({ id, name, section, line }) => ({ id, kind: 'C', section, line, text: name })),
  ];

  const traces = [];
  for (const section of sections) {
    traces.push(...extractFieldTraces(section, componentsByName));
    traces.push(...extractTableTraces(section, componentsByName));
  }

  const provenance = extractProvenanceMarkers(sections);
  const untraced = extractUntracedMarkers(sections);

  return { ok: true, sections, ids, components, traces, provenance, untraced };
}

function extractSections(lines) {
  const sections = [];
  let current = null;
  lines.forEach((line, idx) => {
    const heading = SECTION_HEADING_RE.exec(line);
    if (heading) {
      if (current) sections.push(current);
      current = { name: heading[1], line: idx + 1, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  });
  if (current) sections.push(current);
  return sections.map((s) => ({ name: s.name, line: s.line, body: s.bodyLines.join('\n') }));
}

// A component is DEFINED as a numbered, bolded-lead list entry under a "### Components"
// subheading (the exact grammar of `## Design`'s "1. **CLI shell** — ..." list) — scoped to that
// subheading so an unrelated numbered/bold list elsewhere (e.g. "1. **Mechanical promises...") is
// never mistaken for a component.
function extractComponents(sections) {
  const components = [];
  for (const section of sections) {
    const bodyLines = section.body.split('\n');
    let inComponents = false;
    bodyLines.forEach((line, i) => {
      const heading = SUBHEADING_RE.exec(line);
      if (heading) {
        inComponents = /^components?$/i.test(heading[1].trim());
        return;
      }
      if (!inComponents) return;
      const item = COMPONENT_LIST_ITEM_RE.exec(line);
      if (item) {
        components.push({
          id: `C-${item[1]}`,
          name: item[2].trim(),
          section: section.name,
          line: section.line + i + 1,
        });
      }
    });
  }
  return components;
}

// An ID is DEFINED where it leads a bold span (`**AC-1**`, `**T-1 — Title.**`) — distinguishing a
// definition from a plain-text citation elsewhere (e.g. `*Advances:* AC-1`, unbolded).
function extractExplicitIds(sections) {
  const ids = [];
  const seen = new Set();
  for (const section of sections) {
    const bodyLines = section.body.split('\n');
    bodyLines.forEach((line, i) => {
      ID_DEFINITION_RE.lastIndex = 0;
      let m;
      while ((m = ID_DEFINITION_RE.exec(line))) {
        const id = `${m[1]}-${m[2]}`;
        if (seen.has(id)) continue; // keep the first definition site
        seen.add(id);
        ids.push({ id, kind: m[1], section: section.name, line: section.line + i + 1, text: line.trim() });
      }
    });
  }
  return ids;
}

// Cited IDs in free text: any literal AC-N/C-N/T-N token, including a slash-abbreviated run
// (`AC-1/2/3`, `AC-3/5/6/13/14`) — the prefix from the first token carries across the run and each
// slash-separated number becomes its own ref.
function extractIdRefs(text) {
  const refs = new Set();
  ID_REF_RE.lastIndex = 0;
  let m;
  while ((m = ID_REF_RE.exec(text))) {
    const prefix = m[1];
    const nums = m[0].slice(prefix.length + 1).split('/');
    for (const n of nums) refs.add(`${prefix}-${n}`);
  }
  return refs;
}

// By-name component resolution: a *Component:* field or a component/map-row table row may cite a
// component by NAME (an unanchored substring match) rather than by ID. Scoped to those two trace
// kinds only — an *Advances:*/*Deps:* field is a plain ID citation, and applying substring
// name-matching there would let a component name mentioned in passing (e.g. "Reporter") inject a
// false C-ref.
function resolveComponentRefs(text, componentsByName) {
  const lower = text.toLowerCase();
  const ids = [];
  for (const [name, id] of componentsByName) {
    if (lower.includes(name)) ids.push(id);
  }
  return ids;
}

// Groups a section's lines into top-level bullet blocks (a line starting a bold-led bullet, plus
// its wrapped continuation lines) so an *Advances:*/*Component:*/*Deps:* field is attributed to
// the ID that OWNS that bullet, not a neighbouring one.
function splitTopBullets(bodyLines) {
  const blocks = [];
  let current = null;
  bodyLines.forEach((line, i) => {
    if (TOP_BULLET_RE.test(line)) {
      if (current) blocks.push(current);
      current = { startIdx: i, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  });
  if (current) blocks.push(current);
  return blocks;
}

function extractFieldTraces(section, componentsByName) {
  const traces = [];
  const blocks = splitTopBullets(section.body.split('\n'));
  for (const block of blocks) {
    const blockText = block.lines.join('\n');
    ID_DEFINITION_RE.lastIndex = 0;
    const owner = ID_DEFINITION_RE.exec(blockText);
    if (!owner) continue; // a bullet with no leading ID defines nothing to trace from
    const fromId = `${owner[1]}-${owner[2]}`;

    TRACE_FIELD_RE.lastIndex = 0;
    let m;
    while ((m = TRACE_FIELD_RE.exec(blockText))) {
      const raw = m[2].trim();
      const kind = m[1].toLowerCase();
      const refs = extractIdRefs(raw);
      if (kind === 'component') {
        for (const id of resolveComponentRefs(raw, componentsByName)) refs.add(id);
      }
      traces.push({
        from: fromId,
        kind,
        refs: [...refs],
        raw,
        line: section.line + block.startIdx + 1,
      });
    }
  }
  return traces;
}

function splitTableCells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

// A table row is a trace reference only in a table whose 2nd column names a citation of
// components/advancement (the "Criterion-to-component map" / "Task-to-criterion coverage map"
// grammar) — a table like the Verification map (`Oracle kind`) or Component-to-product map
// (`Product`) is not a trace map and is left alone.
function extractTableTraces(section, componentsByName) {
  const traces = [];
  const bodyLines = section.body.split('\n');
  let i = 0;
  while (i < bodyLines.length) {
    if (!TABLE_ROW_RE.test(bodyLines[i])) {
      i += 1;
      continue;
    }
    const header = splitTableCells(bodyLines[i]);
    let j = i + 1;
    if (j < bodyLines.length && TABLE_SEPARATOR_RE.test(bodyLines[j])) j += 1;
    const isTraceTable = header.length >= 2 && /advanced by|component/i.test(header[1]);
    while (j < bodyLines.length && TABLE_ROW_RE.test(bodyLines[j])) {
      if (isTraceTable) {
        const cells = splitTableCells(bodyLines[j]);
        const fromId = /^(AC|C|T)-\d+$/.test(cells[0]) ? cells[0] : null;
        if (fromId && cells[1]) {
          const refs = extractIdRefs(cells[1]);
          for (const id of resolveComponentRefs(cells[1], componentsByName)) refs.add(id);
          if (refs.size > 0) {
            traces.push({
              from: fromId,
              kind: 'map-row',
              table: header[1],
              refs: [...refs],
              raw: cells[1],
              line: section.line + j + 1,
            });
          }
        }
      }
      j += 1;
    }
    i = j;
  }
  return traces;
}

// A provenance marker is looked for on a section's first NON-BLANK body line only (the documented
// convention places it immediately under the "##" heading) — a comment appearing later in the body
// is prose, not the section's stamp.
function extractProvenanceMarkers(sections) {
  const markers = [];
  for (const section of sections) {
    const bodyLines = section.body.split('\n');
    const firstIdx = bodyLines.findIndex((l) => l.trim() !== '');
    if (firstIdx === -1) continue;
    const candidate = bodyLines[firstIdx].trim();
    const m = PROVENANCE_MARKER_RE.exec(candidate);
    if (!m) continue; // not an HTML comment at all — a hand-authored section, no marker
    const inner = m[1];
    const sourceMatch = PROVENANCE_SOURCE_RE.exec(inner);
    const dateMatch = PROVENANCE_DATE_RE.exec(inner);
    const source = sourceMatch ? sourceMatch[1].trim() : '';
    const date = dateMatch ? dateMatch[1].trim() : '';
    markers.push({
      section: section.name,
      line: section.line + firstIdx + 1,
      raw: candidate,
      source: source || null,
      date: date || null,
      malformed: !source || !date || !ABSOLUTE_DATE_RE.test(date),
    });
  }
  return markers;
}

// An `untraced` marker is scoped to the same top-level-bullet ownership as a trace field (T-2's
// splitTopBullets) — it marks a specific task/link, not the section at large.
function extractUntracedMarkers(sections) {
  const markers = [];
  for (const section of sections) {
    const blocks = splitTopBullets(section.body.split('\n'));
    for (const block of blocks) {
      const blockText = block.lines.join('\n');
      ID_DEFINITION_RE.lastIndex = 0;
      const owner = ID_DEFINITION_RE.exec(blockText);
      const fromId = owner ? `${owner[1]}-${owner[2]}` : null;
      UNTRACED_RE.lastIndex = 0;
      let m;
      while ((m = UNTRACED_RE.exec(blockText))) {
        markers.push({
          from: fromId,
          reason: (m[1] || '').trim(),
          raw: m[0].trim(),
          section: section.name,
          line: section.line + block.startIdx + 1,
        });
      }
    }
  }
  return markers;
}

// --- Ledger parser (T-3): task table + green-bar evidence blocks ----------------------------

export function parseLedger(text, file = '<unknown ledger file>') {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: { file, problem: 'missing or empty ledger content' } };
  }
  const lines = text.split(/\r\n|\r|\n/);
  const tasks = extractLedgerTasks(lines);
  const evidence = extractLedgerEvidence(lines);
  if (tasks.length === 0 && evidence.length === 0) {
    return {
      ok: false,
      error: { file, problem: 'no task ledger table or evidence blocks found — unparseable ledger content' },
    };
  }
  return { ok: true, tasks, evidence };
}

// The "## Task ledger" table — columns looked up by header name (case-insensitive), not position,
// so column reordering does not silently misattribute cells.
function extractLedgerTasks(lines) {
  const tasks = [];
  let i = 0;
  while (i < lines.length) {
    if (!TABLE_ROW_RE.test(lines[i])) {
      i += 1;
      continue;
    }
    const header = splitTableCells(lines[i]);
    const col = {
      task: header.findIndex((h) => /^task$/i.test(h)),
      status: header.findIndex((h) => /^status$/i.test(h)),
      commit: header.findIndex((h) => /^commit$/i.test(h)),
      ac: header.findIndex((h) => /ac advanced/i.test(h)),
      notes: header.findIndex((h) => /^notes$/i.test(h)),
    };
    let j = i + 1;
    if (col.task === -1 || col.status === -1) {
      i = j;
      continue; // not the task table
    }
    if (j < lines.length && TABLE_SEPARATOR_RE.test(lines[j])) j += 1;
    while (j < lines.length && TABLE_ROW_RE.test(lines[j])) {
      const cells = splitTableCells(lines[j]);
      const taskId = cells[col.task];
      if (/^T-\d+$/.test(taskId)) {
        tasks.push({
          task: taskId,
          status: (cells[col.status] || '').trim(),
          commit: col.commit >= 0 ? cells[col.commit].replace(/`/g, '').trim() : null,
          acAdvanced: col.ac >= 0 ? cells[col.ac].trim() : null,
          notes: col.notes >= 0 ? cells[col.notes].trim() : null,
          line: j + 1,
        });
      }
      j += 1;
    }
    i = j;
  }
  return tasks;
}

// One entry per "### T-N (@ SHA)" heading, gathering every fenced code block up to the next
// heading (any level) or end of text. A heading with zero fenced blocks still yields an entry with
// `blocks: []` / `text: ''` — present-but-evidence-less, never silently dropped (AC-5).
function extractLedgerEvidence(lines) {
  const evidence = [];
  let i = 0;
  while (i < lines.length) {
    const heading = LEDGER_EVIDENCE_HEADING_RE.exec(lines[i]);
    if (!heading) {
      i += 1;
      continue;
    }
    const headingLine = i + 1;
    let j = i + 1;
    const blocks = [];
    while (j < lines.length && !HEADING_RE.test(lines[j])) {
      if (FENCE_LINE_RE.test(lines[j])) {
        let k = j + 1;
        while (k < lines.length && !FENCE_LINE_RE.test(lines[k])) k += 1;
        blocks.push(lines.slice(j + 1, k).join('\n'));
        j = k + 1;
        continue;
      }
      j += 1;
    }
    evidence.push({
      task: heading[1],
      sha: heading[2].trim() || null,
      line: headingLine,
      blocks,
      text: blocks.join('\n'),
      commands: blocks.flatMap(extractCommandLines),
    });
    i = j;
  }
  return evidence;
}

function extractCommandLines(blockText) {
  return blockText
    .split('\n')
    .filter((l) => l.trim().startsWith('$ '))
    .map((l) => l.trim().slice(2).trim());
}

// --- Verification report parser (T-3): AC → proof-map rows ----------------------------------
//
// No verification-report.md exists yet (ship writes it at T-12) — this grammar is designed from
// the `## Design` data contract + AC-13/14 wording: a "Criterion | Type | Proof" table, one row
// per criterion.

function normalizeProofType(raw) {
  const t = raw.trim();
  if (/test/i.test(t)) return 'test-backed';
  if (/reviewer/i.test(t)) return 'reviewer-checked';
  return t;
}

export function parseVerificationReport(text, file = '<unknown verification report file>') {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: { file, problem: 'missing or empty verification report content' } };
  }
  const lines = text.split(/\r\n|\r|\n/);
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    if (!TABLE_ROW_RE.test(lines[i])) {
      i += 1;
      continue;
    }
    const header = splitTableCells(lines[i]);
    const col = {
      criterion: header.findIndex((h) => /criterion/i.test(h)),
      type: header.findIndex((h) => /type/i.test(h)),
      proof: header.findIndex((h) => /proof/i.test(h)),
    };
    let j = i + 1;
    if (col.criterion === -1) {
      i = j;
      continue; // not the proof-map table
    }
    if (j < lines.length && TABLE_SEPARATOR_RE.test(lines[j])) j += 1;
    while (j < lines.length && TABLE_ROW_RE.test(lines[j])) {
      const cells = splitTableCells(lines[j]);
      const criterion = cells[col.criterion];
      if (/^(AC|NC)-\d+$/.test(criterion)) {
        rows.push({
          criterion,
          type: col.type >= 0 ? normalizeProofType(cells[col.type]) : null,
          proof: col.proof >= 0 ? cells[col.proof].trim() : '',
          line: j + 1,
        });
      }
      j += 1;
    }
    i = j;
  }
  if (rows.length === 0) {
    return {
      ok: false,
      error: { file, problem: 'no criterion proof-map rows found — unparseable verification report content' },
    };
  }
  return { ok: true, rows };
}

// --- Rules (T-4): trace integrity + bidirectional coverage ----------------------------------
//
// Pure predicates over a parseSpec() SUCCESS model (the `{ ok: true, ... }` payload itself) — no
// file reads, no git, no process.exit. Each rule returns an array of items sharing one shape so a
// later reporter (T-8) can tell findings from notes by one field alone, and later rule tasks
// (T-5/T-6/T-7) reuse the same shape:
//   { type: 'finding' | 'note', rule, message, ids }
//   type    — 'finding' fails the gate; 'note' is informational (an explicit `untraced` marker is
//             a deliberate, surfaced decision, not a defect). T-8 derives exit status from findings
//             only and renders notes as notes, never as failures.
//   rule    — the rule's stable name, so a later reporter/config can address one rule specifically.
//   message — a human-readable, self-contained description of the one problem/note.
//   ids     — every ID the item is ABOUT (the offending/named ID(s)) — always non-empty, so a
//             consumer never has to re-derive "which ID is this about" by parsing `message`.
// Every rule returns ALL items, never short-circuits at the first — exhaustive rendering is a
// reporter concern (T-8/AC-9), but a rule that stops early can never be made exhaustive downstream.

function definedIdSet(model) {
  return new Set(model.ids.map((i) => i.id));
}

// AC-1 — trace integrity: every ID cited in ANY trace's `refs` must resolve to a real definition
// (an AC/C/T `ids` entry — components are already synthesized into `ids` by parseSpec, so no
// separate lookup against `components` is needed). NC IDs never reach `refs` — T-2's grammar
// excludes them at the source (no word boundary inside "NC-3") — so nothing here re-admits them;
// this rule only ever sees what parseSpec already scoped to AC/C/T.
export function checkTraceIntegrity(model) {
  const defined = definedIdSet(model);
  const findings = [];
  for (const trace of model.traces) {
    for (const ref of trace.refs) {
      if (defined.has(ref)) continue;
      findings.push({
        type: 'finding',
        rule: 'trace-integrity',
        message: `${trace.from} cites ${ref} (${trace.kind}, line ${trace.line}), which is not defined anywhere in the spec`,
        ids: [ref],
      });
    }
  }
  return findings;
}

// Shared task<->criterion link relation (T-4 refactor, post-Critical-fix): the SINGLE source of
// "is this task linked to this AC" that both checkForwardCoverage (AC-2) and checkBackwardCoverage
// (AC-3) consume — neither rule may compute "is linked" independently anymore. Before this, the
// two rules read different subsets of the same two sources (forward read both; backward read only
// the *Advances:* field), which produced a real false-positive: a task reached ONLY via a
// Task-to-criterion coverage-map row (no *Advances:* field of its own) passed forward coverage but
// was wrongly flagged by backward coverage. Building the union ONCE makes that asymmetry class
// impossible even as a third rule joins later.
//
// The union of the plan's two authoritative link sources:
//   (i)  an `advances` trace — a task's own *Advances:* field;
//   (ii) a `map-row` trace FROM an AC — a Task-to-criterion coverage-map row's "Advanced by" column.
// A Criterion-to-component map row (refs are C-N, `from` is an AC but naming a component, not a
// task) is never a source here — table shape (ii) requires a T- ref to produce a link at all.
//
// Every link is checked against REAL, DEFINED ids on BOTH sides:
//   - the AC side must be a defined AC-N (a dangling-AC cite, already flagged by
//     checkTraceIntegrity, never discharges a task — AC-3's own guard, preserved);
//   - the task side must be a defined T-N (closes the Minor: an `advances` trace whose `from` is
//     some other ID kind, or a map-row ref that isn't actually a task, can never fabricate
//     coverage by pretending to be a task link).
// Returns Array<{ task: 'T-N', ac: 'AC-N' }>, one entry per (task, ac) pair found — duplicates are
// harmless since both consumers only test set membership.
function buildTaskAcLinks(model) {
  const definedAc = new Set(model.ids.filter((i) => i.kind === 'AC').map((i) => i.id));
  const definedTask = new Set(model.ids.filter((i) => i.kind === 'T').map((i) => i.id));
  const links = [];
  for (const trace of model.traces) {
    if (trace.kind === 'advances' && definedTask.has(trace.from)) {
      for (const ref of trace.refs) {
        if (definedAc.has(ref)) links.push({ task: trace.from, ac: ref });
      }
    } else if (trace.kind === 'map-row' && definedAc.has(trace.from)) {
      for (const ref of trace.refs) {
        if (definedTask.has(ref)) links.push({ task: ref, ac: trace.from });
      }
    }
  }
  return links;
}

// AC-2 — forward coverage: every defined AC-N must be reached by at least one task, per the
// shared task<->criterion link relation (buildTaskAcLinks) above.
export function checkForwardCoverage(model) {
  const acIds = model.ids.filter((i) => i.kind === 'AC').map((i) => i.id);
  const reached = new Set(buildTaskAcLinks(model).map((l) => l.ac));
  return acIds
    .filter((ac) => !reached.has(ac))
    .map((ac) => ({
      type: 'finding',
      rule: 'coverage-forward',
      message: `${ac} is not reached by any task (no *Advances:* field and no Task-to-criterion coverage-map row names it)`,
      ids: [ac],
    }));
}

// AC-3 — backward coverage: every defined T-N must either appear as a `task` in the shared
// task<->criterion link relation (buildTaskAcLinks — an *Advances:* field OR a coverage-map row,
// same relation AC-2 reads), or carry an explicit `untraced` marker. A task with an `untraced`
// marker surfaces as a coverage NOTE (a deliberate, surfaced decision), never a finding; a task
// with neither is a finding naming the task.
export function checkBackwardCoverage(model) {
  const taskIds = model.ids.filter((i) => i.kind === 'T').map((i) => i.id);
  const linkedTasks = new Set(buildTaskAcLinks(model).map((l) => l.task));
  const items = [];
  for (const taskId of taskIds) {
    if (linkedTasks.has(taskId)) continue;
    const marker = model.untraced.find((u) => u.from === taskId);
    if (marker) {
      items.push({
        type: 'note',
        rule: 'coverage-backward',
        message: `${taskId} is explicitly untraced${marker.reason ? `: ${marker.reason}` : ' (no reason given)'}`,
        ids: [taskId],
      });
    } else {
      items.push({
        type: 'finding',
        rule: 'coverage-backward',
        message: `${taskId} has no acceptance-criterion reference (inline *Advances:* or coverage-map row) and no explicit untraced marker`,
        ids: [taskId],
      });
    }
  }
  return items;
}

// AC-6 — provenance marker well-formedness: a marker that IS present (parseSpec already only
// records an entry for a first-body-line HTML comment — a hand-authored section with none
// contributes nothing here, by design; see NC-4 note in the plan) but `malformed` names WHICH
// field is bad, re-deriving it from the fields the parser already exposes rather than re-parsing
// the date itself: `!source` -> missing source; `source && !date` -> missing date; otherwise
// (both fields present but still `malformed`) the date failed the parser's absolute-date check.
function describeMalformedProvenance(marker) {
  if (!marker.source) return 'missing source';
  if (!marker.date) return 'missing date';
  return 'date is not an absolute (YYYY-MM-DD) date';
}

export function checkProvenanceMarkers(model) {
  const findings = [];
  for (const marker of model.provenance) {
    if (!marker.malformed) continue;
    findings.push({
      type: 'finding',
      rule: 'provenance-marker',
      message: `${marker.section} (line ${marker.line}) has a malformed provenance marker: ${describeMalformedProvenance(marker)}`,
      ids: [marker.section],
    });
  }
  return findings;
}

// AC-5 — green-bar evidence presence: a task marked "done" in the ledger table asserts the green
// bar passed for it; that claim is backed iff a corresponding "### T-N (@ SHA)" evidence entry
// exists AND carries at least one non-empty captured block (evidence is captured text, never a
// checkbox — `## Design`). A done task with no evidence entry, or an entry present but empty
// (`blocks: []` / `text: ''` — parseLedger's present-but-bare shape), is an unbacked claim: a
// finding naming the task. A task not marked done makes no claim yet, so it is never checked here
// (pending/blocked tasks are silently out of scope, not a miss). Takes the parseLedger() model
// (not the spec model) — this rule's only input is the ledger.
export function checkGreenBarEvidence(ledger) {
  const findings = [];
  for (const t of ledger.tasks) {
    if (!/^done$/i.test(t.status)) continue;
    const entry = ledger.evidence.find((e) => e.task === t.task);
    if (!entry || entry.blocks.length === 0 || entry.text.trim() === '') {
      findings.push({
        type: 'finding',
        rule: 'green-bar-evidence',
        message: `${t.task} is marked done but has no captured green-bar evidence block`,
        ids: [t.task],
      });
    }
  }
  return findings;
}

// --- Repo facts reader (T-6): git commit history, read-only --------------------------------
//
// readRepoFacts() is the ONLY component in this file that touches git: one async `execFile` call
// over an argv array (no shell), read-only `git log` only (NC-1: local git only, no network — the
// invoked git subcommand never talks to a remote). Mirrors the parsers' typed-failure discipline:
// git absent or `repoPath` not a repo returns `{ ok: false, error: { path, problem } }` — it never
// throws to top and never returns an empty-and-passing commit list (a spawn failure and "no
// commits" must not be confused).
//   success: { ok: true, commits }
//   commits — one entry per commit, in `git log`'s own (newest-first) order — order is irrelevant
//             to the ledger-vs-git rule below, which only counts: { id, message } (component
//             contract's "commit list (id, message)"; `id` is the full commit hash).
//   `taskIds` (optional, the component contract's "task IDs of interest") narrows the RETURNED
//   list to commits whose message references at least one of them — a relevance filter only; it
//   never changes what counts as a reference (that stays in the pure rule below, over whatever
//   messages are returned) and never drops a commit that could matter (a commit referencing none
//   of `taskIds` is, by definition, not evidence for any task the caller asked about).
//
// Commit records are read with `-z` (NUL record separator between commits) and `%x00` as the
// intra-record field separator between hash and subject — verified against the `git log` docs
// (`-z`: "Separate the commits with NULs instead of newlines"; `%x00` inserts a raw NUL byte in
// `--format`) and empirically (`git log -z --format='%H%x00%s'` on git 2.53.0): the whole output
// is one NUL-delimited stream, so splitting on `\0` and pairing consecutive fields recovers each
// commit. A commit message cannot itself contain a NUL byte (git strips/rejects them), so this
// delimiter can never be spoofed by message content — unlike a newline or comma-based format.
const GIT_LOG_FORMAT = '%H%x00%s';
const TASK_TOKEN_RE = /\bT-\d+\b/g;

// Distinct T-N tokens appearing in a commit's SUBJECT LINE only (the `%s` readRepoFacts captures
// via `git log --format=%H%x00%s` — the commit body is never read). Subject-only is the intended
// scope for AC-4, not an oversight: the repo's commit convention puts the authoritative task scope
// in the subject (`feat(T-N): …`); whole-message matching would be WORSE — a legitimately atomic
// commit whose BODY mentions another task in prose ("supersedes T-3", "unlike T-2's approach")
// would falsely read as multi-task and false-positive AC-4, blocking a good history. (Content
// atomicity — whether the commit's diff touches only that task's files — is explicitly out of
// AC-4's scope by design; it stays with build's review.) `\bT-\d+\b`'s `\d+` is greedy so it always
// consumes the FULL run of digits before the trailing `\b` is checked — "T-1" can never match as a
// prefix inside "T-12" (the same token-boundary class as the T-2 parser's ID regex).
function distinctTaskTokens(message) {
  const tokens = new Set();
  TASK_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TASK_TOKEN_RE.exec(message))) tokens.add(m[0]);
  return tokens;
}

export async function readRepoFacts(repoPath, taskIds) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(
      'git',
      ['-C', repoPath, 'log', '-z', `--format=${GIT_LOG_FORMAT}`],
      { encoding: 'utf8' },
    ));
  } catch (err) {
    // Covers both failure modes the contract names: git absent (ENOENT spawn error) and
    // `repoPath` not a repo (git exits 128, "fatal: not a git repository ..."). Either way this
    // is a typed failure, never a throw and never an empty `{ ok: true, commits: [] }`.
    return { ok: false, error: { path: repoPath, problem: `git log failed: ${err.message}` } };
  }

  const fields = stdout.split('\0').filter((f) => f !== '');
  const all = [];
  for (let i = 0; i + 1 < fields.length; i += 2) {
    all.push({ id: fields[i], message: fields[i + 1] });
  }
  const of = Array.isArray(taskIds) && taskIds.length > 0 ? new Set(taskIds) : null;
  const commits = of
    ? all.filter((c) => [...distinctTaskTokens(c.message)].some((tok) => of.has(tok)))
    : all;
  return { ok: true, commits };
}

// AC-4 — ledger-vs-git: for each `done` task, git history must contain EXACTLY ONE commit whose
// SUBJECT LINE references EXACTLY that task ID (see distinctTaskTokens above for why subject-only
// is the intended scope, not the whole commit message).
//
// Exact rule: map each commit's subject line to its distinct-token set (distinctTaskTokens above);
// a done task T is backed iff exactly one commit's token set CONTAINS T, and that same commit's
// token set is EXACTLY `{T}`. This is mechanically decidable — it supports NC-4's no-judgment
// constraint, though it is not itself "the NC-4 rule" (NC-4 is the reviewer-checked constraint that
// every shipped check has a deterministic oracle; this is one such oracle). Three ways to fail,
// each its own finding naming T:
//   - zero commits contain T                         -> "no commit references it";
//   - more than one commit contains T                -> "N commits reference it" (ambiguous);
//   - exactly one commit contains T, but its token
//     set has other members too (a multi-task commit) -> that commit also names another task, so
//     it cannot be "exactly that task ID"; found via the *same* commit, so this and the ">1
//     commits" case are mutually exclusive per task.
// A commit scoping two tasks (`feat(T-3, T-4): ...`) therefore fails BOTH T-3 and T-4 if both are
// done (each sees its one matching commit's token set as `{T-3, T-4}`, not `{itself}`).
//
// Pure: no I/O (repoFacts is already the reader's resolved success model — same convention as
// checkGreenBarEvidence(ledger) above, which assumes its parseLedger() input already succeeded;
// a repoFacts failure is fail-closed CLI wiring, out of scope here per the plan — see T-9).
// Exhaustive: every offending done task is reported, never just the first.
export function checkLedgerVsGit(ledger, repoFacts) {
  const findings = [];
  for (const t of ledger.tasks) {
    if (!/^done$/i.test(t.status)) continue;
    const matches = repoFacts.commits.filter((c) => distinctTaskTokens(c.message).has(t.task));
    if (matches.length === 0) {
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but no commit in git history references it`,
        ids: [t.task],
      });
      continue;
    }
    if (matches.length > 1) {
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but ${matches.length} commits reference it (expected exactly one)`,
        ids: [t.task],
      });
      continue;
    }
    const tokens = distinctTaskTokens(matches[0].message);
    if (tokens.size > 1) {
      const others = [...tokens].filter((tok) => tok !== t.task);
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but its one matching commit (${matches[0].id}) also references ${others.join(', ')} — a commit must reference exactly one task`,
        ids: [t.task],
      });
    }
  }
  return findings;
}

// AC-13 — proof-map completeness: every DEFINED acceptance criterion (`AC-N` from
// `parseSpec().ids`, kind === 'AC') must have a row in the verification report's proof map, and
// that row's `proof` cell must be non-empty. A criterion with no row at all -> a finding naming
// it; a row present but with an empty `proof` -> a finding naming it too (parseVerificationReport
// already trims the cell, so `''` is the exact absent-proof signal — no re-trimming needed).
// Exhaustive: both checked for every AC, never short-circuited.
//
// NC-N coverage decision (plan asked to decide + justify): NC-N criteria are OUT of this rule's
// scope — the universe iterated here is `parseSpec().ids` filtered to kind === 'AC', and NC-N
// never reaches that set at all: T-2's own ID-definition grammar (`ID_DEFINITION_RE`, prefix
// `AC|C|T` only) does not recognize an `NC-` prefix, so a `**NC-1**` heading is prose from
// parseSpec's point of view, never a defined id (the same fact `checkTraceIntegrity`'s comment
// already relies on for `refs`). Re-deriving an NC universe here would mean inventing a second,
// parallel NC-parsing mechanism inside a rule function — scope creep on T-2/T-3's committed
// grammar, which this task may not touch. The spec's own artifacts corroborate this split: the
// per-row proof-map data contract and every criterion list in `enforcement-spine.md` name the
// artifact "AC -> proof map" (never "AC/NC -> proof map"), and the Task-to-criterion coverage map
// treats NC-1/NC-2 as riding on AC-11/AC-12's own oracle (no row of their own expected) and
// NC-3/NC-4 as "reviewed at ship" (a whole-PR judgment, not a per-criterion recorded row).
// `parseVerificationReport` still ACCEPTS an `NC-\d+` criterion cell (it does not reject one an
// author chooses to add), but nothing here requires one to exist.
export function checkProofMapCompleteness(model, verificationReport) {
  const acIds = model.ids.filter((i) => i.kind === 'AC').map((i) => i.id);
  const rowByCriterion = new Map(verificationReport.rows.map((r) => [r.criterion, r]));
  const findings = [];
  for (const ac of acIds) {
    const row = rowByCriterion.get(ac);
    if (!row) {
      findings.push({
        type: 'finding',
        rule: 'proof-map-completeness',
        message: `${ac} has no row in the verification report's proof map`,
        ids: [ac],
      });
      continue;
    }
    if (row.proof === '') {
      findings.push({
        type: 'finding',
        rule: 'proof-map-completeness',
        message: `${ac}'s proof-map row has an empty proof`,
        ids: [ac],
      });
    }
  }
  return findings;
}

// Test identifiers named in a test-backed proof cell are comma-separated (a row "may name one or
// several" per the plan) — the same low-risk separator this file already uses for a multi-value
// field elsewhere (`*Advances:* AC-1, AC-97, AC-98`, a `T-1, T-99` coverage-map cell): a markdown
// table cell cannot itself contain an unescaped `|`, and a plain-text test identifier (a file path
// plus a `>`-joined runner description, e.g. `tests/foo.test.mjs > case one`) never contains a
// literal comma in practice, so splitting on `,` cannot misparse a single identifier into two.
function extractTestIdentifiers(proof) {
  return proof
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

// AC-14 — proof-evidence linkage (ADR-0001's name-appearance contract): for each test-backed proof-
// map row, every test identifier named in its `proof` cell must appear (plain substring —
// name-appearance, never an interpretation of pass/fail) somewhere in the ledger's captured
// green-bar evidence text. The search haystack is the UNION of every evidence entry's `text`
// across the whole ledger: a proof-map row names a CRITERION, not a task, so there is no per-row
// task to narrow the search to — ADR-0001 speaks of "the captured green-bar evidence" generically,
// and the plan brief names the union as the reading. Reviewer-checked rows are exempt (their proof
// is a recorded answer, not a test) — AC-13 above already covers their presence. A row with an
// empty proof yields zero identifiers here (nothing to check appearance for) — AC-13 already
// names that as a completeness failure, so AC-14 does not double-report it. Exhaustive: every
// missing identifier across every row is reported, never just the first.
export function checkProofEvidenceLinkage(verificationReport, ledger) {
  const haystack = ledger.evidence.map((e) => e.text).join('\n');
  const findings = [];
  for (const row of verificationReport.rows) {
    if (row.type !== 'test-backed') continue;
    for (const testId of extractTestIdentifiers(row.proof)) {
      if (haystack.includes(testId)) continue;
      findings.push({
        type: 'finding',
        rule: 'proof-evidence-linkage',
        message: `${row.criterion}'s proof-map row names a test ("${testId}") that does not appear in the captured green-bar evidence`,
        ids: [row.criterion],
      });
    }
  }
  return findings;
}

// Portable ESM main-guard: `import.meta.main` only exists from Node v22.18.0 (undefined, thus
// falsy, on the declared floor's earlier 22.x patches — a false guard there would silently no-op
// instead of failing closed). Compare resolved URLs instead: pathToFileURL() resolves the argv
// path absolutely and percent-encodes URL control characters, so this holds under a relative
// invocation (`node ./sdlc-check.mjs`) the same as an absolute one. `process.argv[1]` is guarded
// for undefined (e.g. `node -e '...'`, no script file) since pathToFileURL() throws on non-string
// input.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2));
}
