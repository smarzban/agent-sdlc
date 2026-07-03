// sdlc-check — enforcement-spine CLI skeleton.
// Zero-dependency, bare Node ESM. Parses the CLI surface (spec path + repeatable --require) and
// establishes the exit-code contract: any error path exits nonzero with a message on stderr
// naming the problem; nothing here ever exits 0 on failure (fail-closed).
import { parseArgs } from 'node:util';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

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
//   { ok: true, sections, ids, components, traces }
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

  return { ok: true, sections, ids, components, traces };
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
