// sdlc-check — enforcement-spine CLI shell (T-9: full pipeline wiring).
// Zero-dependency, bare Node ESM. Wires: parse the spec (always required) -> read the ledger and
// verification report when present (siblings of the spec file) -> for each done ledger task, read
// its ledger-RECORDED commit subject from git (per-SHA `readCommitSubject`) so the ledger-vs-git
// rule can verify the recorded commit exists and matches -> run every rule the artifacts present
// support -> format the report -> print + set process.exitCode. Rules AUTO-SCOPE to the artifacts
// present (## Design): no ledger -> ledger rules don't run; no verification report -> proof-map
// rules don't run. `--require <artifact>` flips a missing artifact into a finding instead of a
// silent skip. Every error path exits nonzero with a message naming the problem; nothing here ever
// exits 0 on failure (fail-closed) — a parse failure, a systemic git-reader failure while the
// ledger's rules would run (git absent / not a repo -> a fail-closed `ledger-vs-git` finding, never
// a silent pass), and any internal throw (caught at the main guard below) all exit nonzero, never 0.
import { parseArgs, promisify } from 'node:util';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';

const execFileAsync = promisify(execFile);

// --require tokens (decided here, T-9): `ledger` and `verification-report` — the two artifacts
// whose rules otherwise auto-scope away when absent. `spec` is deliberately NOT a token: it is
// already unconditionally required (the positional argument + the existsSync check above), so a
// `--require spec` would be a no-op token, not a real second gate.
const REQUIRABLE_ARTIFACTS = new Set(['ledger', 'verification-report']);

export async function run(argv) {
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

  for (const token of parsed.values.require) {
    if (!REQUIRABLE_ARTIFACTS.has(token)) {
      process.stderr.write(
        `sdlc-check: unrecognized --require artifact '${token}' (valid: ${[...REQUIRABLE_ARTIFACTS].join(', ')})\n`,
      );
      process.exitCode = 1;
      return;
    }
  }
  const required = new Set(parsed.values.require);

  // The spec is always required and always parsed first: a parse failure is fail-closed (AC-10) —
  // name the problem, exit nonzero, never 0. (A read failure here — e.g. a permission error — is
  // an internal throw; it propagates to the main guard's catch below, which is itself the same
  // fail-closed exit path, so it needs no separate handling here.)
  const model = parseSpec(readFileSync(specPath, 'utf8'), specPath);
  if (!model.ok) {
    process.stderr.write(`sdlc-check: ${model.error.file}: ${model.error.problem}\n`);
    process.exitCode = 1;
    return;
  }

  const results = [
    ...checkTraceIntegrity(model),
    ...checkForwardCoverage(model),
    ...checkBackwardCoverage(model),
    ...checkProvenanceMarkers(model),
  ];

  // Ledger and verification report are siblings of the spec file — `build-report.md` /
  // `verification-report.md` (the artifact model: process state kept beside the spec, never
  // inside it; confirmed against `## Design`'s data contracts and CONTEXT.md's "verification
  // report" entry).
  const specDir = path.dirname(specPath);
  const ledgerPath = path.join(specDir, 'build-report.md');
  const reportPath = path.join(specDir, 'verification-report.md');

  let ledger = null;
  if (existsSync(ledgerPath)) {
    const parsedLedger = parseLedger(readFileSync(ledgerPath, 'utf8'), ledgerPath);
    if (!parsedLedger.ok) {
      // Present-but-unparseable is fail-closed, NOT auto-scoped away as "absent" — silently
      // reading a corrupted ledger as no-ledger would hide a broken artifact behind the same path
      // that legitimately skips a genuinely absent one.
      results.push({
        type: 'finding',
        rule: 'artifact-parse',
        message: `ledger present but unparseable (${ledgerPath}): ${parsedLedger.error.problem}`,
        ids: ['ledger'],
      });
    } else {
      ledger = parsedLedger;
    }
  } else if (required.has('ledger')) {
    results.push({
      type: 'finding',
      rule: 'required-artifact',
      message: `--require ledger: no ledger found at ${ledgerPath}`,
      ids: ['ledger'],
    });
  }

  if (ledger) {
    results.push(...checkGreenBarEvidence(ledger));

    // FIX 2: bound the git subprocesses. If the ledger records more distinct done-task commits than
    // MAX_LEDGER_COMMITS, refuse to spawn the per-SHA lookups and fail closed with one finding —
    // never the unbounded loop below.
    const capFinding = checkLedgerCommitCap(ledger);
    if (capFinding) {
      results.push(capFinding);
    } else {
      // recorded-commit model: the ledger is the authoritative task↔commit link, so verify each done
      // task's own RECORDED commit rather than re-deriving matches by walking git history. Read each
      // distinct recorded SHA once (the reader does the git I/O; checkLedgerVsGit stays pure over
      // the resolved `sha -> { found, reachable, subject }` map). A done task with no recorded SHA
      // (`t.commit` null) is handled inside the rule (AC-6 finding) — nothing to look up.
      const doneTasks = ledger.tasks.filter((t) => /^done$/i.test(t.status));
      const subjectsBySha = new Map();
      let readerFailure = null;
      for (const t of doneTasks) {
        if (!t.commit || subjectsBySha.has(t.commit)) continue;
        const res = await readCommitSubject(specDir, t.commit);
        if (res.ok) {
          subjectsBySha.set(t.commit, { found: true, reachable: true, subject: res.subject });
        } else if (res.unreachable) {
          // FIX 1: the object resolves but is not reachable from HEAD — found, but stale/orphaned.
          subjectsBySha.set(t.commit, { found: true, reachable: false, subject: null });
        } else if (res.notFound) {
          subjectsBySha.set(t.commit, { found: false, reachable: false, subject: null });
        } else {
          // Fail-closed (## Design trust/failure boundaries): a systemic reader failure — git absent,
          // `process.cwd()` not a repo, or a per-command timeout — while the ledger's rules would run
          // is itself a failed check, NEVER silently treated as "no facts" and skipped. Distinct from
          // a per-SHA not-found/unreachable (real ledger-vs-git findings the rule renders below).
          readerFailure = res.error;
          break;
        }
      }
      if (readerFailure) {
        results.push({
          type: 'finding',
          rule: 'ledger-vs-git',
          message: `ledger present but git commit subjects unavailable: ${readerFailure.problem}`,
          ids: ['ledger'],
        });
      } else {
        const anyNotFound = [...subjectsBySha.values()].some((e) => !e.found);
        const shallowRepo = anyNotFound ? await isShallowRepo(specDir) : false;
        results.push(...checkLedgerVsGit(ledger, subjectsBySha, { shallowRepo }));
      }
    }
  }

  let verificationReport = null;
  if (existsSync(reportPath)) {
    const parsedReport = parseVerificationReport(readFileSync(reportPath, 'utf8'), reportPath);
    if (!parsedReport.ok) {
      results.push({
        type: 'finding',
        rule: 'artifact-parse',
        message: `verification report present but unparseable (${reportPath}): ${parsedReport.error.problem}`,
        ids: ['verification-report'],
      });
    } else {
      verificationReport = parsedReport;
    }
  } else if (required.has('verification-report')) {
    results.push({
      type: 'finding',
      rule: 'required-artifact',
      message: `--require verification-report: no verification report found at ${reportPath}`,
      ids: ['verification-report'],
    });
  }

  if (verificationReport) {
    results.push(...checkProofMapCompleteness(model, verificationReport));
    // AC-14's evidence linkage needs the ledger's captured green-bar text; with no ledger present
    // there is nothing to search, so this half of the proof-map checks stays scoped to "both
    // present" (AC-13 completeness above already runs regardless).
    if (ledger) results.push(...checkProofEvidenceLinkage(verificationReport, ledger));
  }

  const version = resolveCheckerVersion();
  const { text, exitCode } = formatReport(results, version);
  process.stdout.write(text);
  process.exitCode = exitCode;
}

// --- Spec parser: sections, AC/C/T IDs, trace references ------------------------------
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
//   provenance — a materialized section's leading HTML-comment marker (see
//                getting-started/reference/input-resolution.md): { section, line, raw, source,
//                date, malformed }. `source`/`date` are `null` when absent; `malformed` is true
//                when either is missing OR `date` is not an absolute `YYYY-MM-DD` date — this is a
//                MODEL fact (AC-6's rule flags it), never a parse failure. A hand-authored section
//                (no leading HTML comment) contributes no entry.
//   untraced   — an explicit `AC: untraced (reason)` marker on a task, scoped to the same
//                top-level-bullet ownership as a trace field: { from, reason, raw, section, line }.
//                `reason` is `''` when no parenthetical is given (still recorded, never dropped) —
//                T-4's rule renders this as a coverage note rather than a dangling-reference failure.
//   acVerification — (SMA-465a) a Map<acId, 'reviewer-checked'|'test-backed'|null> classifying each
//                defined AC by the verification-type of its OWN bullet block (first definition site
//                wins). Detection is DECLARATION-FIRST: an authoritative `Verification type: **X**`
//                declaration in the block wins, so a topic-word mention of the OTHER type in the AC's
//                prose never flips it; only when the block carries no such declaration does it fall
//                back to a loose `reviewer-checked` / `test-backed` keyword scan (older spec forms
//                that lead with the bare type word). `null` when the block states neither type. Pure
//                over `sections`, never throws (mirrors the parser discipline) — checkForwardCoverage
//                reads it to sharpen the reviewer-checked unreached-AC hint (D2: parsed from the spec,
//                not the report).

// --- Ledger (build-report.md) — task table + green-bar evidence blocks ----------------
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

// --- Verification report (verification-report.md) — AC → proof-map rows ---------------
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
// The Design's structured "outside the checker" component list (SMA-419) — a `###` subheading
// whose text matches this (tolerating a trailing parenthetical like "(changed components)"). Its
// numbered entries are REAL components, assigned a distinct `C-ext-N` id namespace so an external
// list starting at `1.` never collides with an inside `### Components` `C-1`.
const OUTSIDE_CHECKER_HEADING_RE = /outside the checker/i;
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
// Ledger commit cell → the authoritative task commit is the FIRST SHA-shaped token in the cell
// (D6). A real ledger cell is not always a bare SHA: the enforcement-spine T-6 cell is
// "`4ddd29e` (+corrective `d3c4275`)" — the leading `4ddd29e` is the task commit, the trailing
// annotation is ignored. Backticks are non-word chars, so `\b` finds the SHA whether or not the
// cell is backtick-wrapped. A cell with no SHA-shaped token (e.g. the "—" no-commit marker) yields
// null (→ the rule's "records no commit" finding, AC-6).
const COMMIT_SHA_RE = /\b[0-9a-f]{7,64}\b/;

function extractFirstSha(cell) {
  const m = COMMIT_SHA_RE.exec(cell);
  return m ? m[0] : null;
}

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
  const acVerification = extractAcVerification(sections);

  return { ok: true, sections, ids, components, traces, provenance, untraced, acVerification };
}

// SMA-465a — per-AC verification type: classify each defined AC by the verification-type of its OWN
// top-level-bullet block, reusing splitTopBullets + ID_DEFINITION_RE so a type mention in a
// neighbouring AC's block is never misattributed. Detection is DECLARATION-FIRST: the AC's
// authoritative `Verification type: **X**` declaration wins, so a topic-word mention of the OTHER
// type in the AC's own prose (e.g. a test-backed AC whose statement discusses "reviewer-checked")
// never flips it; the loose `reviewer-checked` / `test-backed` keyword scan is only a FALLBACK, used
// when the block carries no such declaration (older spec forms that lead with the bare type word,
// e.g. `*(Reviewer-checked — axis …)*`). Pure over `sections`, never throws: ragged/empty input just
// yields fewer (or no) entries. Returns Map<acId, 'reviewer-checked'|'test-backed'|null> — first
// definition site wins; `null` when a block states neither type. Read at gate/build time by
// checkForwardCoverage (D2: the report is ship's artifact and often absent, so the type is read from
// the AC block's own declaration/keyword text — available whenever the rule runs).
export function extractAcVerification(sections) {
  const types = new Map();
  for (const section of sections) {
    const blocks = splitTopBullets(section.body.split('\n'));
    for (const block of blocks) {
      const blockText = block.lines.join('\n');
      ID_DEFINITION_RE.lastIndex = 0;
      const owner = ID_DEFINITION_RE.exec(blockText);
      if (!owner || owner[1] !== 'AC') continue; // only AC-owning blocks; first site wins below
      const id = `${owner[1]}-${owner[2]}`;
      if (types.has(id)) continue;
      // Prefer the authoritative "Verification type: **X**" declaration (a topic-word mention of the
      // other type in the AC's prose must not flip it); fall back to a loose keyword scan only when the
      // AC carries no such declaration (older spec forms lead with the bare type word).
      const decl = /verification type:\s*\*{0,2}\s*(reviewer[-\s]?checked|test[-\s]?backed)/i.exec(blockText);
      let type = null;
      if (decl) {
        type = /reviewer/i.test(decl[1]) ? 'reviewer-checked' : 'test-backed';
      } else if (/reviewer[-\s]?checked/i.test(blockText)) {
        type = 'reviewer-checked';
      } else if (/test[-\s]?backed/i.test(blockText)) {
        type = 'test-backed';
      }
      types.set(id, type);
    }
  }
  return types;
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

// A component is DEFINED as a numbered, bolded-lead list entry under one of two Design subheadings,
// scoped to that subheading so an unrelated numbered/bold list elsewhere (e.g. "1. **Mechanical
// promises...") is never mistaken for a component:
//   - `### Components` — the exact grammar of `## Design`'s "1. **CLI shell** — ..." list; entries
//     get `C-N` ids from their own ordinal ('inside' mode).
//   - `### Outside the checker (…)` — the structured declaration (SMA-419) of components that change
//     but are not numbered `### Components` (e.g. the `gate`/`build`/`ship` skill texts); entries
//     get `C-ext-N` ids from their own ordinal ('outside' mode), a distinct namespace so an external
//     list starting at `1.` never collides with an inside `C-1`.
// A non-matching `###` subheading resets the mode to null, so a later unrelated subheading never
// keeps absorbing list items (the existing scoping guarantee, preserved).
function extractComponents(sections) {
  const components = [];
  for (const section of sections) {
    const bodyLines = section.body.split('\n');
    let mode = null; // 'inside' | 'outside' | null
    bodyLines.forEach((line, i) => {
      const heading = SUBHEADING_RE.exec(line);
      if (heading) {
        const text = heading[1].trim();
        if (/^components?$/i.test(text)) mode = 'inside';
        else if (OUTSIDE_CHECKER_HEADING_RE.test(text)) mode = 'outside';
        else mode = null;
        return;
      }
      if (!mode) return;
      const item = COMPONENT_LIST_ITEM_RE.exec(line);
      if (item) {
        components.push({
          id: mode === 'outside' ? `C-ext-${item[1]}` : `C-${item[1]}`,
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
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveComponentRefs(text, componentsByName) {
  const ids = [];
  for (const [name, id] of componentsByName) {
    // Anchored, whole-name match: a dangling name that merely CONTAINS a real component name as a
    // substring (e.g. "Gateway" containing "Gate") must not resolve. Names can carry regex
    // metacharacters (`-`, `.`, `+`, `(`), so escape before building the boundary regex. Keys are
    // already lowercased; the 'i' flag makes the match robust either way (NC-3: zero-dep).
    // Explicit non-word lookarounds (not `\b`): `\b` only fires at a word/non-word transition, so a
    // name whose OWN edge is a non-word char (`C++`, `.NET`) never forms the boundary and would fail
    // to resolve. Anchoring on the surrounding text instead — no word char immediately before/after
    // the name — resolves such names while still rejecting substring collisions (after "Gate" in
    // "Gateway" comes `w`, a word char → lookahead fails → no match).
    if (new RegExp(`(?<![A-Za-z0-9_])${escapeRegExp(name)}(?![A-Za-z0-9_])`, 'i').test(text)) ids.push(id);
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

// A *Component:* field value of `none` is the field's established null marker (mirrors
// *Advances:*/*Deps:* fields, which are silently empty of refs the same way) — not a dangling
// citation. This is the ONLY non-dangling value: a "component outside the numbered `### Components`
// list" (e.g. a `gate`/`build`/`ship` skill text) is no longer a string escape hatch here — it must
// be declared as a real component under a `### Outside the checker (…)` subheading, which
// extractComponents parses into a resolvable `C-ext-N` component (SMA-419 dropped the former
// `/\bskill texts?\b/` allowlist). Any other name that resolves to no defined component (numbered
// or external) is a genuine dangling citation.
function isNonDanglingComponentValue(raw) {
  return raw.toLowerCase() === 'none';
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
      // A *Component:* field is the only trace kind that can cite by NAME (see
      // resolveComponentRefs) rather than by ID, so it's the only kind where a citation can go
      // completely unresolved without leaving so much as an ID token behind for checkTraceIntegrity
      // to flag (AC-1's component half — H1). `none` is the field's established null marker
      // (mirrors *Advances:*/*Deps:* fields, which are silently empty of refs the same way) and is
      // never a dangling citation.
      let unresolvedComponent = null;
      if (kind === 'component') {
        for (const id of resolveComponentRefs(raw, componentsByName)) refs.add(id);
        if (refs.size === 0 && raw && !isNonDanglingComponentValue(raw)) unresolvedComponent = raw;
      }
      traces.push({
        from: fromId,
        kind,
        refs: [...refs],
        raw,
        unresolvedComponent,
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
    // A component-citing map (2nd column "Component") cites a component by name — so a row citing a
    // name that resolves to nothing is a DANGLING component, symmetric with the *Component:* field
    // path (SMA-418). A coverage map ("Advanced by") cites task IDs, never components, so it can
    // never produce a dangling component here — only a component map can.
    const isComponentMap = header.length >= 2 && /component/i.test(header[1]);
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
          } else if (isComponentMap && !isNonDanglingComponentValue(cells[1])) {
            // A component-map row that resolved to nothing and isn't the `none` null marker is a
            // dangling component citation (an "outside the checker" component now resolves as a real
            // C-ext-N, so it never reaches here) — carry it as an
            // empty-refs trace with `unresolvedComponent`, mirroring extractFieldTraces' shape so
            // checkTraceIntegrity's dangling-component arm flags it. Empty `refs` keeps it harmless
            // to buildTaskAcLinks / coverage (both iterate `refs`).
            traces.push({
              from: fromId,
              kind: 'map-row',
              table: header[1],
              refs: [],
              raw: cells[1],
              unresolvedComponent: cells[1],
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

// --- Ledger parser: task table + green-bar evidence blocks ----------------------------

export function parseLedger(text, file = '<unknown ledger file>') {
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: { file, problem: 'missing or empty ledger content' } };
  }
  const lines = text.split(/\r\n|\r|\n/);
  const { tasks, error } = extractLedgerTasks(lines);
  if (error) return { ok: false, error: { file, problem: error.problem } };
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
      // A data row with fewer cells than its header is malformed — fail closed with a typed error
      // naming the offending line, never index past the row and throw a TypeError (AC-3).
      if (cells.length < header.length) {
        return { tasks, error: { problem: `ragged task ledger row (fewer cells than the header) at line ${j + 1}` } };
      }
      const taskId = cells[col.task];
      if (/^T-\d+$/.test(taskId)) {
        tasks.push({
          task: taskId,
          status: (cells[col.status] || '').trim(),
          commit: col.commit >= 0 ? extractFirstSha(cells[col.commit]) : null,
          acAdvanced: col.ac >= 0 ? cells[col.ac].trim() : null,
          notes: col.notes >= 0 ? cells[col.notes].trim() : null,
          line: j + 1,
        });
      }
      j += 1;
    }
    i = j;
  }
  return { tasks };
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

// --- Verification report parser: AC → proof-map rows ----------------------------------
//
// No verification-report.md exists yet (ship writes it at T-12) — this grammar is designed from
// the `## Design` data contract + AC-13/14 wording: a "Criterion | Type | Proof" table, one row
// per criterion.

function normalizeProofType(raw) {
  const t = raw.trim();
  if (/\btest\b/i.test(t)) return 'test-backed';
  if (/\breviewer\b/i.test(t)) return 'reviewer-checked';
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
      // A data row with fewer cells than its header is malformed — fail closed with a typed error
      // naming the offending line, never index past the row and throw a TypeError (AC-3).
      if (cells.length < header.length) {
        return {
          ok: false,
          error: { file, problem: `ragged proof-map row (fewer cells than the header) at line ${j + 1}` },
        };
      }
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

// --- Rules: trace integrity + bidirectional coverage ----------------------------------
//
// Pure predicates over a parseSpec() SUCCESS model (the `{ ok: true, ... }` payload itself) — no
// file reads, no git, no process.exit. Each rule returns an array of items sharing one shape so a
// later reporter can tell findings from notes by one field alone, and later rule tasks
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
    // H1 + SMA-418: a component citation by NAME that resolves to nothing (no C-N token, no name
    // match) is just as dangling as an unresolved ID ref above, but never reaches `trace.refs` at
    // all, so it needs its own arm here. Fires for ANY trace carrying `unresolvedComponent` — a
    // *Component:* field (kind 'component', extractFieldTraces) OR a Criterion-to-component map row
    // (kind 'map-row', extractTableTraces); only component-ish traces ever set it, so this is safe.
    if (trace.unresolvedComponent) {
      findings.push({
        type: 'finding',
        rule: 'trace-integrity',
        message: `${trace.from} cites component '${trace.unresolvedComponent}' (line ${trace.line}), which does not exist anywhere in the spec`,
        ids: [trace.from],
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
//
// SMA-465a: a reviewer-checked AC still needs a carrying task (it is NOT auto-traced — NC-1), a
// counter-intuitive rule that bit an operator twice. When the unreached AC is reviewer-checked, the
// finding APPENDS a carrying-task hint pointing at the *Advances:* fix; a test-backed / type-unknown
// AC keeps the base message byte-for-byte. Guarded against a missing `acVerification` (a hand-built
// model without the field) so this can never throw.
export function checkForwardCoverage(model) {
  const acIds = model.ids.filter((i) => i.kind === 'AC').map((i) => i.id);
  const reached = new Set(buildTaskAcLinks(model).map((l) => l.ac));
  return acIds
    .filter((ac) => !reached.has(ac))
    .map((ac) => {
      const base = `${ac} is not reached by any task (no *Advances:* field and no Task-to-criterion coverage-map row names it)`;
      const hint =
        model.acVerification && model.acVerification.get(ac) === 'reviewer-checked'
          ? ` — this criterion is reviewer-checked, which still needs a carrying task: name it in some task's *Advances:* (for a reviewer-checked AC the carrying task is the one that produces the artifact the reviewer checks).`
          : '';
      return {
        type: 'finding',
        rule: 'coverage-forward',
        message: `${base}${hint}`,
        ids: [ac],
      };
    });
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

// --- Commit-subject reader (recorded-commit model): read-only git, per recorded SHA -------------
//
// A per-git-command timeout (FIX 2 — bound the subprocesses): every git call carries a wall-clock
// `timeout`; on expiry Node kills the child and rejects with `err.killed === true`, which
// classifyGitError() maps to a systemic `unavailable` (fail-closed), never a silent pass or hang.
const GIT_TIMEOUT_MS = 10_000;

// Classifies a rejected git `execFile` error into either a systemic `unavailable` failure (the CLI
// renders this fail-closed) or a plain nonzero exit `code` (the reader interprets per-subcommand).
// A killed child (the per-command timeout above) and a spawn/repo failure (ENOENT / "not a git
// repository") are BOTH systemic; anything else is a real subcommand exit whose numeric `code`
// carries meaning (merge-base 1 = not-ancestor, 128 = bad object).
function classifyGitError(err, repoPath) {
  if (err.killed || err.signal) {
    return {
      kind: 'unavailable',
      error: { path: repoPath, problem: `git command timed out after ${GIT_TIMEOUT_MS}ms: ${err.message}` },
    };
  }
  if (err.code === 'ENOENT' || /not a git repository/i.test(String(err.stderr ?? ''))) {
    return {
      kind: 'unavailable',
      error: { path: repoPath, problem: `git repository unavailable: ${err.message}` },
    };
  }
  return { kind: 'code', code: typeof err.code === 'number' ? err.code : null };
}
//
// readCommitSubject() is the ONLY component in this file that touches git: read-only `execFile`
// calls over argv arrays (NO shell) — `git merge-base --is-ancestor <sha> HEAD` then
// `git show -s --format=%s <sha> --` (NC-1: local git only, no network; the trailing `--` and the
// argv form make option/pathspec injection impossible even for an attacker-shaped SHA). Mirrors
// the parsers' typed-failure discipline — it never throws to top — with a FOUR-way result:
//   reachable ancestor: { ok: true, subject }         — the commit's subject line (`%s`, no body).
//   exists, unreachable:{ ok: false, unreachable: true }— the object resolves but is NOT an ancestor
//                                                       of HEAD (a stale/orphaned pre-amend/pre-rebase
//                                                       SHA); a per-task ledger-vs-git finding, NOT a pass.
//   unknown object:     { ok: false, notFound: true } — git ran but the SHA is not in this repo; a
//                                                       per-task ledger-vs-git finding, NOT a crash.
//   systemic failure:   { ok: false, unavailable: true, error: { path, problem } } — git absent
//                                                       (ENOENT), `repoPath` not a repo, or a
//                                                       per-command timeout; the CLI treats this as
//                                                       fail-closed (a lost check), never a pass.
// FIX 1 (reachability): "exists in the repository" now means "exists AND is reachable
// from HEAD". `git show` alone resolves ANY object in the store — including a dangling pre-amend
// commit that is not in the shipped history — so a ledger recording a stale SHA used to false-pass
// (a fail-open regression from the old reachable-only `git log` walk). `git merge-base
// --is-ancestor <sha> HEAD` distinguishes the three cases in one read-only call: exit 0 reachable
// ancestor, exit 1 object exists but not an ancestor, exit 128 bad object. The commit BODY is never
// read (subject-only, `%s`), so a task ID mentioned in a body can never masquerade as a scope ref.
export async function readCommitSubject(repoPath, sha) {
  // Step 1 — reachability: `git merge-base --is-ancestor <sha> HEAD`.
  let ancestorErr = null;
  try {
    await execFileAsync(
      'git',
      ['-C', repoPath, 'merge-base', '--is-ancestor', sha, 'HEAD'],
      { encoding: 'utf8', timeout: GIT_TIMEOUT_MS },
    );
  } catch (err) {
    ancestorErr = err;
  }
  if (ancestorErr) {
    const c = classifyGitError(ancestorErr, repoPath);
    if (c.kind === 'unavailable') return { ok: false, unavailable: true, error: c.error };
    if (c.code === 1) return { ok: false, unreachable: true }; // exists but not an ancestor of HEAD
    return { ok: false, notFound: true }; // 128 bad object (or any other nonzero) → not a resolvable commit
  }
  // Step 2 — reachable ancestor confirmed: read its subject (subject only, `%s`; body never read).
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', repoPath, 'show', '-s', '--format=%s', sha, '--'],
      { encoding: 'utf8', timeout: GIT_TIMEOUT_MS },
    );
    return { ok: true, subject: stdout.replace(/\r?\n$/, '') };
  } catch (err) {
    const c = classifyGitError(err, repoPath);
    if (c.kind === 'unavailable') return { ok: false, unavailable: true, error: c.error };
    // A commit merge-base just confirmed reachable that then fails `git show` is anomalous; fail
    // CLOSED as a systemic failure rather than silently pass or misreport it as a plain not-found.
    return {
      ok: false,
      unavailable: true,
      error: { path: repoPath, problem: `git show failed for a reachable commit ${sha}: ${err.message}` },
    };
  }
}

// Shallow clones (CI's default checkout) make ancestry lookups fail as "not found" for commits
// behind the fetch boundary — name that case instead of letting it read as a corrupt ledger.
export async function isShallowRepo(repoPath) {
  try {
    const { stdout } = await execFileAsync(
      'git', ['-C', repoPath, 'rev-parse', '--is-shallow-repository'],
      { timeout: GIT_TIMEOUT_MS },
    );
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}

const TASK_TOKEN_RE = /\bT-\d+\b/g;

// Conventional-commit header: `type(scope): …` (optionally `type(scope)!: …`). Captures group 1 =
// the text inside the FIRST parens after the type — the SCOPE — or `undefined` when there is no
// `(...)` at all (`docs: …`, `feat: …`). Anchored at the start of the subject (`^\s*`) so it only
// ever looks at the conventional-commit header itself, never anywhere else in the line.
const COMMIT_HEADER_RE = /^\s*\w+(?:\(([^)]*)\))?!?:/;

// Distinct T-N tokens appearing in a commit's SUBJECT LINE's SCOPE POSITION only — the `type(scope):`
// parens — not the whole subject (the `%s` readCommitSubject captures via `git show -s --format=%s`;
// the commit body is never read either way). This is a corrective narrowing of the original
// subject-wide match: the repo's commit convention puts the authoritative task in the scope
// (`feat(T-N): …`), while docs/chore/area commits use an area scope (`docs(enforcement-spine): …`)
// and only ever mention a task in PROSE after the colon — e.g. "...(T-1 checkpoint)..." or
// "...evidence capture from T-1" — which whole-subject matching wrongly counted as a reference,
// false-positiving ledger-vs-git (a healthy task with exactly one `feat(T-N):` commit read as having
// multiple). A commit with no parens at all (`docs: …`) has an undefined scope and therefore
// references no task. `\bT-\d+\b`'s `\d+` is greedy so it always consumes the FULL run of digits
// before the trailing `\b` is checked — "T-1" can never match as a prefix inside "T-12" (the same
// token-boundary class as the T-2 parser's ID regex). Multi-task scopes still work as before:
// `feat(T-3, T-4): …` → scope string `T-3, T-4` → {T-3, T-4}.
function distinctTaskTokens(message) {
  const header = COMMIT_HEADER_RE.exec(message);
  const scope = header ? header[1] : undefined;
  if (!scope) return new Set();
  const tokens = new Set();
  TASK_TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TASK_TOKEN_RE.exec(scope))) tokens.add(m[0]);
  return tokens;
}

// FIX 2 (bound the git subprocesses): the checker spawns one git subprocess per distinct done-task
// recorded SHA. The ledger is a TRUSTED committed artifact, so this cap is defense-in-depth — a
// ledger with an absurd number of distinct done commits would otherwise spawn unbounded lookups.
// Above the cap, refuse to spawn and fail CLOSED with one finding rather than exhaust subprocesses.
// Exported so the boundary is testable directly. (Per-command timeouts are the other half — see
// GIT_TIMEOUT_MS on each git call.)
export const MAX_LEDGER_COMMITS = 1000;

// Returns a single fail-closed `ledger-vs-git` finding when the number of DISTINCT recorded commits
// among done tasks exceeds MAX_LEDGER_COMMITS, else null. Counting distinct SHAs (not rows) matches
// exactly the set the CLI would look up (two done tasks sharing a commit spawn one lookup). The CLI
// consults this BEFORE the per-SHA loop and skips the loop entirely when it fires, so no git
// subprocess is spawned when the cap is exceeded.
export function checkLedgerCommitCap(ledger) {
  const distinct = new Set(
    ledger.tasks.filter((t) => /^done$/i.test(t.status) && t.commit).map((t) => t.commit),
  );
  if (distinct.size > MAX_LEDGER_COMMITS) {
    return {
      type: 'finding',
      rule: 'ledger-vs-git',
      message: `ledger records ${distinct.size} distinct done-task commits (more than ${MAX_LEDGER_COMMITS}) — refusing to spawn unbounded git lookups`,
      ids: ['ledger'],
    };
  }
  return null;
}

// recorded-commit model — ledger-vs-git (SMA-420): the ledger is the AUTHORITATIVE task↔commit link, so
// for each `done` task this verifies the task's OWN ledger-RECORDED commit — no git-history walk.
// The recorded SHA (the first SHA-shaped token in the commit cell, extracted at parse time into
// `t.commit`; see extractFirstSha) must (a) exist in the repo and (b) have a subject whose scope
// position references EXACTLY that task. Looking up a recorded SHA individually is why the old
// walk's cross-feature collision is structurally gone: task IDs restarting per feature can no
// longer be confused — a task's link is the specific commit the ledger names, not "some commit that
// mentions T-N somewhere in history".
//
// `subjectsBySha` is a `sha -> { found, subject }` map the CLI pre-resolves via readCommitSubject
// (the git I/O is at the CLI edge; this rule is pure over the resolved map — same convention as
// checkGreenBarEvidence(ledger)). Four ways to fail, each its own finding naming the task:
//   - no recorded SHA (`t.commit` null — an empty/"—" commit cell)  -> "records no commit" (AC-6);
//   - the recorded SHA is not in the repo (`found: false`)          -> "was not found in the repo";
//   - its subject's scope does not contain the task                 -> "does not reference it";
//   - its subject's scope contains the task AND others (multi-task) -> "also references <others>".
// A commit scoping two tasks (`feat(T-3, T-4): ...`) recorded for both therefore fails BOTH (each
// sees its recorded commit's token set as `{T-3, T-4}`, not `{itself}`).
// Exhaustive: every offending done task is reported, never just the first.
export function checkLedgerVsGit(ledger, subjectsBySha, opts = {}) {
  const findings = [];
  for (const t of ledger.tasks) {
    if (!/^done$/i.test(t.status)) continue;
    if (!t.commit) {
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but the ledger records no commit for it`,
        ids: [t.task],
      });
      continue;
    }
    const entry = subjectsBySha.get(t.commit);
    if (!entry || !entry.found) {
      const shallowHint = opts.shallowRepo
        ? ' (note: this clone is shallow — the commit may exist beyond the fetch depth; run `git fetch --unshallow`, or set fetch-depth: 0 in CI)'
        : '';
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but the ledger-recorded commit ${t.commit} for it was not found in the repo${shallowHint}`,
        ids: [t.task],
      });
      continue;
    }
    // FIX 1 (reachability): the object resolves but is NOT reachable from HEAD — a stale/orphaned
    // commit (e.g. a pre-amend/pre-rebase SHA) that is not in the shipped history. Distinct from
    // not-found above (`git show` would still resolve it) and its own ledger-vs-git finding.
    if (!entry.reachable) {
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but the ledger-recorded commit ${t.commit} for it is not reachable from HEAD (a stale or orphaned commit)`,
        ids: [t.task],
      });
      continue;
    }
    const tokens = distinctTaskTokens(entry.subject);
    if (!tokens.has(t.task)) {
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but its ledger-recorded commit ${t.commit} does not reference it (subject: "${entry.subject}")`,
        ids: [t.task],
      });
      continue;
    }
    if (tokens.size > 1) {
      const others = [...tokens].filter((tok) => tok !== t.task);
      findings.push({
        type: 'finding',
        rule: 'ledger-vs-git',
        message: `${t.task} is marked done but its ledger-recorded commit ${t.commit} also references ${others.join(', ')} — a commit must reference exactly one task`,
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

// --- Reporter: exhaustive findings + exit derivation ----------------------------------
//
// formatReport() is pure: `results` in (the flat concatenation of every rule's output — findings
// and notes, in whatever order the caller supplied), `{ text, exitCode }` out. No I/O, no
// `process.exit`, no writes, no git — the CLI is the only thing that prints `text` and sets
// `process.exitCode = exitCode`. No error path: `results` is always an already-produced array of
// well-shaped items (every rule task before this one guarantees the shape), so there is nothing
// here to fail on.
//
// `type` is the sole discriminant, per every rule task's shared contract:
//   { type: 'finding' | 'note', rule, message, ids }
// Exit derivation is FAIL-CLOSED on the discriminant itself: 'note' is the only type that does not
// count as a finding, so exitCode is 0 IFF every item in `results` is a 'note' (equivalently: 1 iff
// at least one item's type is anything other than 'note'). This is deliberately NOT
// `type === 'finding'` — that positive-match form is fail-OPEN: an item with an unexpected/mistyped
// `type` (e.g. a typo `'Finding'`) would match neither `'finding'` nor `'note'`, vanish from both
// buckets, and let the run exit 0 with the defect invisible. Under the fail-closed form such an item
// falls into `findings` (not `'note'` -> counts, and renders in the Findings section, exhaustively,
// same as any other finding) so it is surfaced and forces a nonzero exit instead of silently passing.
// Well-typed items are unaffected: a real 'finding' still counts, a real 'note' still doesn't.
//
// Rendering is exhaustive (AC-9): every finding and every note is rendered, in the order given,
// never truncated or short-circuited. Findings and notes render in two separate, distinctly
// labelled sections ("Findings" / "Notes") so a reader can tell a blocking finding from an
// informational note at a glance — never interleaved. A results list with neither renders a single
// clean pass line instead of two empty section headers (a reporter that always prints "Findings
// (0):" on the happy path is noise, not signal).
//
// No error path, made honest: `ids` defaults to `[]` when missing/undefined so a shape-variant item
// (e.g. a rule that forgot to set `ids`) is rendered, not thrown on — the minimal guard that backs
// the "no error path" claim above, not general validation.
function formatItem(item) {
  const ids = Array.isArray(item.ids) ? item.ids : [];
  return `  - [${item.rule}] ${item.message} (ids: ${ids.join(', ')})`;
}

// SMA-480 — the checker stamps its own version into the report so a stale-checker run (a cached
// installed-plugin copy trailing the repo) is self-diagnosing instead of reading as spec defects.
// Read locally from the plugin manifest adjacent to the checker (never a network call); absent or
// unparseable manifest -> null (the reporter renders "(version unknown)"). Never throws (mirrors the
// parser discipline): any fs/JSON failure folds into the null fallback. The manifest URL is
// injectable so the fallback is unit-testable without moving files.
const CHECKER_MANIFEST_URL = new URL('../.claude-plugin/plugin.json', import.meta.url);

export function resolveCheckerVersion(manifestUrl = CHECKER_MANIFEST_URL) {
  try {
    const parsed = JSON.parse(readFileSync(manifestUrl, 'utf8'));
    const v = typeof parsed.version === 'string' ? parsed.version.trim() : '';
    return v || null;
  } catch {
    return null;
  }
}

export function formatReport(results, version) {
  const findings = results.filter((r) => r.type !== 'note');
  const notes = results.filter((r) => r.type === 'note');
  const exitCode = findings.length === 0 ? 0 : 1;
  const label = version ? `sdlc-check ${version}` : 'sdlc-check (version unknown)';

  if (findings.length === 0 && notes.length === 0) {
    return { text: `${label}: all checks passed — 0 findings, 0 notes.\n`, exitCode };
  }

  const lines = [];
  lines.push(`Findings (${findings.length}):`);
  if (findings.length === 0) {
    lines.push('  (none)');
  } else {
    for (const f of findings) lines.push(formatItem(f));
  }
  lines.push('');
  lines.push(`Notes (${notes.length}):`);
  if (notes.length === 0) {
    lines.push('  (none)');
  } else {
    for (const n of notes) lines.push(formatItem(n));
  }
  lines.push('');
  lines.push(`${label}: ${findings.length} finding(s), ${notes.length} note(s).`);
  return { text: lines.join('\n') + '\n', exitCode };
}

// Portable ESM main-guard: `import.meta.main` only exists from Node v22.18.0 (undefined, thus
// falsy, on the declared floor's earlier 22.x patches — a false guard there would silently no-op
// instead of failing closed). Compare resolved URLs instead: pathToFileURL() resolves the argv
// path absolutely and percent-encodes URL control characters, so this holds under a relative
// invocation (`node ./sdlc-check.mjs`) the same as an absolute one. `process.argv[1]` is guarded
// for undefined (e.g. `node -e '...'`, no script file) since pathToFileURL() throws on non-string
// input.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Any internal throw (a rejected promise from run() — the async work is readCommitSubject) exits
  // nonzero: the CLI shell's exit contract has no error path that exits 0.
  run(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`sdlc-check: unexpected internal error: ${err && err.stack ? err.stack : err}\n`);
    process.exitCode = 1;
  });
}
