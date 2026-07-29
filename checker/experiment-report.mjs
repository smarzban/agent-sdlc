// EXPERIMENT: run-observability
//
// experiment-report: reads one or more of experiment-record's per-run-identity event files and
// prints ONE table a human reads. Throwaway instrumentation (brief T-2): no schema version, no
// second output format, no abstraction for a second consumer. Deleted with the rest of the
// experiment; see docs/specs/run-observability/run-observability.md.
//
// Read-only: never writes, never repairs a malformed line, never mutates the store. The only
// writes anywhere are process.stdout (the table) and process.stderr (a diagnostic on failure).
//
// Five properties, each guarding a specific way a table could mislead (brief T-2):
//   1. Per task: elapsed, round count AND each round's duration, lines/files between the
//      recorded boundaries, findings by severity.
//   2. Every rendered column, and every run, is marked measured or claimed IN THE TABLE ITSELF.
//      Timings, head commits, and anything derived from them are measured; findings and a run's
//      reported outcome are the agent's word, claimed.
//   3. Incomplete runs (no run-end, or outcome failed/abandoned) are counted and shown, never
//      dropped; the view says so prominently. A run with no data at all, or one too ambiguous to
//      classify, is shown too, but is a different fact, never folded into "did not finish".
//   4. A caveat line is always printed: wall clock includes backoff, stalls, and idleness, and
//      nothing here isolates model inference from that.
//   5. Nothing is derived that cannot be supported: an unpaired event, an absent field, a missing
//      round, an unresolvable commit pair, or an absent repository renders as such, never as a
//      fabricated zero, never silently omitted. Identical head commits are NOT a supported "0":
//      once AC-12 requires task-end to be recorded after the task's own commit, an identical pair
//      most likely means that requirement was not followed, so the cell says so in plain words.
//
// Reasons long enough to wreck a row (a git error, the identical-commit explanation) are relocated
// to a footnote list under the table, referenced by a marker, so property 5 still puts every
// reason in the rendering, just not repeated cell after cell.
//
// Split for testability: buildRunView/buildReportModel do the IO (read the store, run git) and
// produce a plain-data model; render() is a pure function over that model.
import { parseArgs, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readEvents, storeFilePath, defaultStoreRoot } from './experiment-record.mjs';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 5000;
const ID_RE = /^[A-Za-z0-9._-]+$/;
const SHA_RE = /^[0-9a-f]{7,40}$/i;
const KNOWN_OUTCOMES = new Set(['finished', 'failed', 'abandoned']);
const DID_NOT_FINISH_STATES = new Set(['failed', 'abandoned', 'no-end']);

const CAVEAT_TEXT =
  'CAVEAT (always true): elapsed wall time between two recorded boundaries includes any rate-limit ' +
  'backoff, stalls, and other idle waiting; nothing here isolates model inference from that idleness.';

// --- argument parsing (no IO) ---------------------------------------------------------------

export function parseSummaryArgs(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        repo: { type: 'string' },
      },
    });
  } catch (err) {
    return { ok: false, error: `could not parse arguments: ${err.message}` };
  }

  const runIds = parsed.positionals;
  if (runIds.length === 0) {
    return { ok: false, error: 'missing required run id (one or more run identities to summarize)' };
  }
  for (const id of runIds) {
    if (!ID_RE.test(id)) {
      return { ok: false, error: `invalid run id '${id}': must match [A-Za-z0-9._-]+` };
    }
  }
  return { ok: true, runIds, repo: parsed.values.repo ?? null };
}

// --- pure model builders (no IO) -------------------------------------------------------------

// A pair-derivation helper shared by task elapsed and round duration: given the matching start
// and end events for one boundary, decide whether an elapsed time can be supported at all.
// Ambiguous (more than one start or end recorded for the same boundary) is its own "unsupported"
// reason rather than a guess at which pair to use: guessing which of several timestamps to pair
// is exactly the kind of derivation property 5 forbids.
function derivePairedDuration(starts, ends) {
  if (starts.length > 1) return { status: 'unsupported', reason: `ambiguous: ${starts.length} start events recorded` };
  if (ends.length > 1) return { status: 'unsupported', reason: `ambiguous: ${ends.length} end events recorded` };
  if (starts.length !== 1 || ends.length !== 1) {
    return { status: 'unsupported', reason: 'unpaired: no matching start and end recorded' };
  }
  const startMs = Date.parse(starts[0]?.machine?.timestamp ?? '');
  const endMs = Date.parse(ends[0]?.machine?.timestamp ?? '');
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return { status: 'unsupported', reason: 'missing or unparseable timestamp on a recorded event' };
  }
  if (endMs < startMs) {
    // A clock step or mis-ordered boundary recording: never derivable, never rendered as a
    // (nonsensical, negative) measured duration.
    return {
      status: 'unsupported',
      reason: 'end timestamp precedes start timestamp: a clock step or mis-ordered boundary recording',
    };
  }
  return { status: 'measured', ms: endMs - startMs };
}

// Findings by severity live only on a round-end's `reported` namespace. A round with no round-end
// recorded at all can carry no findings: that is "no round-end recorded", never "0 findings". A
// round-end recorded with none of critical/important/minor passed is "not reported": the agent
// simply did not say, which is not the same claim as "reported zero".
function deriveRoundFindings(ends) {
  if (ends.length !== 1) return { status: 'no-round-end' };
  const reported = ends[0]?.reported ?? {};
  const keys = ['critical', 'important', 'minor'].filter((k) => k in reported);
  if (keys.length === 0) return { status: 'not-reported' };
  const values = {};
  for (const k of keys) values[k] = reported[k];
  return { status: 'reported', values };
}

// Takes the round's own events, already bucketed by the caller. Scanning the whole event list per
// round is what made a many-round store quadratic: 20k rounds over 40k events is 800M comparisons,
// which took a minute before the events were bucketed once up front.
function buildRoundView(round, roundEvents) {
  const starts = roundEvents.filter((e) => e.kind === 'round-start');
  const ends = roundEvents.filter((e) => e.kind === 'round-end');
  const duration = derivePairedDuration(starts, ends);
  const findings = deriveRoundFindings(ends);
  return { round, duration, findings };
}

// A gap in the round numbering (e.g. rounds 1 and 3 recorded but nothing recorded for 2) is a
// missing round, not an absent one: distinct from "round N has a start but no end" (unpaired,
// handled by derivePairedDuration) and worth surfacing on its own (property 5's "a missing round
// renders as such"). The count this produces (recorded rounds + gaps) is the round count used
// everywhere else, so a gap never quietly shrinks the count.
// Matches the recorder's own bound (see experiment-record.mjs's MAX_ROUND): a hand-edited or
// malformed store line is not bound by the recorder's own validation, so this bound is enforced
// again here, on the read side, so a huge round number can never make gap-filling unbounded work.
const MAX_ROUND_SPAN = 100000;

function findRoundGaps(sortedRounds) {
  if (sortedRounds.length === 0) return [];
  const span = sortedRounds[sortedRounds.length - 1] - sortedRounds[0];
  if (span > MAX_ROUND_SPAN) {
    // Too wide to enumerate individually: this can only come from a hand-edited or malformed
    // store line, since the recorder itself never emits a round past its own bound. Recorded
    // rounds are still shown; gaps within this span are not.
    return [];
  }
  const seen = new Set(sortedRounds);
  const gaps = [];
  for (let n = sortedRounds[0]; n <= sortedRounds[sortedRounds.length - 1]; n += 1) {
    if (!seen.has(n)) gaps.push(n);
  }
  return gaps;
}

function buildTaskView(taskId, events) {
  const starts = events.filter((e) => e.kind === 'task-start' && e.task === taskId);
  const ends = events.filter((e) => e.kind === 'task-end' && e.task === taskId);
  const elapsed = derivePairedDuration(starts, ends);

  // Changed lines/files are derived from a pair of recorded head commits (T-2's job, not T-1's).
  // Only usable when exactly one task-start and one task-end were recorded: the same ambiguity
  // guard as elapsed, so a task's commit pair is never guessed from several candidates.
  const startSha = starts.length === 1 ? starts[0]?.machine?.headCommit ?? null : null;
  const endSha = ends.length === 1 ? ends[0]?.machine?.headCommit ?? null : null;

  // Bucket this task's round events by round number in ONE pass, then build each view from its own
  // bucket. The previous form re-scanned every event for every round.
  const byRound = new Map();
  for (const e of events) {
    if (e.task !== taskId) continue;
    if (e.kind !== 'round-start' && e.kind !== 'round-end') continue;
    if (typeof e.round !== 'number') continue;
    const bucket = byRound.get(e.round);
    if (bucket) bucket.push(e);
    else byRound.set(e.round, [e]);
  }
  const sortedRounds = [...byRound.keys()].sort((a, b) => a - b);
  const rounds = sortedRounds.map((round) => buildRoundView(round, byRound.get(round)));
  const missingRounds = findRoundGaps(sortedRounds);

  // `changed` is filled in by buildReportModel (it needs git, i.e. IO); left null here so this
  // function stays pure.
  return { taskId, elapsed, startSha, endSha, rounds, missingRounds, changed: null };
}

function firstTimestampMs(taskId, events) {
  let min = Infinity;
  for (const e of events) {
    if (e.task !== taskId) continue;
    const t = Date.parse(e?.machine?.timestamp ?? '');
    if (Number.isFinite(t) && t < min) min = t;
  }
  return min;
}

// Pure: groups one run's already-read events into a run view. Never touches the filesystem or
// git; buildReportModel does that and fills in `changed` per task afterward.
//
// Six run states: finished / failed / abandoned / no-end (started, never ended) / no-data
// (nothing recorded under this run id) / ambiguous (the record itself cannot be classified, e.g.
// two run-end events). Only failed, abandoned, and no-end "did not cleanly finish": no-data is not
// an attempt, and ambiguous is an unknown, not a claim the run went badly. An ambiguous
// run-START count (a duplicate recorder invocation) is a separate note and never overrides a
// run-end that DID record a clean outcome.
export function buildRunView(runId, events) {
  const ownEvents = events.filter((e) => e && e.run === runId);
  const foreignEventsDropped = events.length - ownEvents.length;

  const runStarts = ownEvents.filter((e) => e.kind === 'run-start');
  const runEnds = ownEvents.filter((e) => e.kind === 'run-end');

  let state;
  let outcome = null;
  let detail = null;

  if (runEnds.length > 1) {
    state = 'ambiguous';
    detail = `ambiguous: ${runEnds.length} run-end events recorded`;
  } else if (runEnds.length === 1) {
    const reportedOutcome = runEnds[0]?.reported?.outcome ?? null;
    if (!reportedOutcome) {
      state = 'ambiguous';
      detail = 'run-end recorded without an outcome (malformed event)';
    } else if (!KNOWN_OUTCOMES.has(reportedOutcome)) {
      state = 'ambiguous';
      detail = `run-end recorded with an unrecognized outcome: '${reportedOutcome}'`;
    } else {
      outcome = reportedOutcome;
      state = reportedOutcome;
    }
  } else if (runStarts.length > 0) {
    state = 'no-end';
    detail = 'no run-end recorded';
  } else {
    state = 'no-data';
    detail = 'no run-start or run-end recorded for this run id';
  }

  const startNote = runStarts.length > 1 ? `ambiguous: ${runStarts.length} run-start events recorded` : null;

  const taskIds = new Set();
  for (const e of ownEvents) {
    if (e.task) taskIds.add(e.task);
  }
  // Execution order, not lexicographic (T-10 must not sort before T-2): by first recorded event.
  const tasks = [...taskIds]
    .map((taskId) => ({ taskId, firstTs: firstTimestampMs(taskId, ownEvents) }))
    .sort((a, b) => a.firstTs - b.firstTs)
    .map(({ taskId }) => buildTaskView(taskId, ownEvents));

  return { runId, state, outcome, detail, startNote, foreignEventsDropped, tasks };
}

// --- git: changed lines/files, derived from a pair of recorded head commits ------------------

function parseShortstat(stdout) {
  const trimmed = stdout.trim();
  if (trimmed === '') {
    // Distinct commits, no diff (empty commit, revert, rebase/amend): a real answer, still never a
    // bare "0" (property 5), the reason travels with the number.
    return {
      status: 'measured',
      files: 0,
      lines: 0,
      reason: 'no diff between two distinct commits: an empty commit, a revert, or a rebase/amend landed the same tree',
    };
  }
  const m = /^(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/.exec(trimmed);
  if (!m) return { status: 'unsupported', reason: `unrecognized git diff --shortstat output: '${trimmed}'` };
  const files = Number(m[1]);
  const insertions = m[2] ? Number(m[2]) : 0;
  const deletions = m[3] ? Number(m[3]) : 0;
  return { status: 'measured', files, lines: insertions + deletions };
}

// Fixed argument vector, no shell interpolation (matches sdlc-check.mjs's git-read style). `--`
// terminates options/revisions from any pathspec, harmless here since none is given.
export async function defaultGitDiffShortstat(repoCwd, shaA, shaB) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoCwd, 'diff', '--shortstat', shaA, shaB, '--'], {
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
    });
    return parseShortstat(stdout);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { status: 'unsupported', reason: 'git executable unavailable' };
    }
    if (err.killed || err.code === 'ETIMEDOUT') {
      return { status: 'unsupported', reason: `git diff timed out after ${GIT_TIMEOUT_MS}ms` };
    }
    // git's stderr does not reliably distinguish "repository absent" from "commit unresolvable", so
    // both fold into one honest, non-fabricated "unsupported" reason carrying git's own message.
    const detail = String(err.stderr ?? err.message ?? '').trim();
    return {
      status: 'unsupported',
      reason: `could not resolve one or both commits, or the repository itself is unavailable: ${detail}`,
    };
  }
}

async function deriveChangedStats(repoCwd, shaA, shaB, gitDiffShortstat) {
  if (!shaA || !shaB) {
    return {
      status: 'unsupported',
      reason: 'missing head commit: task-start and/or task-end were not both recorded exactly once',
    };
  }
  if (!SHA_RE.test(shaA) || !SHA_RE.test(shaB)) {
    return {
      status: 'unsupported',
      reason: 'recorded head commit is not a valid hex commit id (a hand-edited or torn store line)',
    };
  }
  if (shaA === shaB) {
    // Never a supported "0" (property 5): once AC-12 requires task-end after the task's commit, an
    // identical pair is most likely a sign that requirement was not followed for this run.
    return {
      status: 'unsupported',
      reason:
        "identical head commits: most likely task-end was recorded before the task's commit landed, a " +
        'wiring problem (see AC-12), not a reliable signal that nothing changed',
    };
  }
  return gitDiffShortstat(repoCwd, shaA, shaB);
}

// --- IO glue: read the store file(s), run git, produce a plain-data model --------------------

export async function buildReportModel(runIds, opts = {}) {
  const repoCwd = opts.repoCwd ?? process.cwd();
  const storeRoot = opts.storeRoot ?? defaultStoreRoot(repoCwd);
  const gitDiffShortstat = opts.gitDiffShortstat ?? defaultGitDiffShortstat;

  const runs = [];
  for (const runId of runIds) {
    const filePath = storeFilePath(runId, storeRoot);
    let events = [];
    let malformed = 0;
    let readError = null;
    try {
      ({ events, malformed } = readEvents(filePath));
    } catch (err) {
      readError = err.message;
    }
    const view = buildRunView(runId, events);
    for (const task of view.tasks) {
      task.changed = await deriveChangedStats(repoCwd, task.startSha, task.endSha, gitDiffShortstat);
    }
    runs.push({ ...view, malformed, readError });
  }

  const anyIncomplete = runs.some((r) => !r.readError && DID_NOT_FINISH_STATES.has(r.state));
  return { caveat: CAVEAT_TEXT, runs, anyIncomplete };
}

// --- rendering: pure, one table per run -------------------------------------------------------

// Neutralizes characters that could otherwise forge a new physical output line (a fabricated table
// row, a fabricated banner line, or a fabricated `[measured]`/`[claimed]` marker rendered on its
// own line) out of a value read from the store file. A stored value is never validated to be a
// single line: it may come from a hand-edited or malformed store line, not only from the recorder.
// Escaped, never dropped, so the value's content still reaches the output, just never as a raw
// control character.
function sanitizeInline(text) {
  // Escaping CR and LF alone is not enough: a terminal renders VT, FF, NEL, LS and PS as line
  // breaks too, and a raw ESC can drive the cursor to a fresh line, so a stored value could still
  // display a forged row or banner even though the emitted text held no newline. Escape every C0
  // and C1 control plus the Unicode line separators, so what a terminal shows matches what the
  // string is.
  return String(text)
    .replace(/\r\n/g, '\\n')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, (ch) => {
      if (ch === '\n' || ch === '\r') return '\\n';
      const code = ch.codePointAt(0).toString(16).padStart(4, '0');
      return `\\u${code}`;
    });
}

function escapeCell(text) {
  // Table cells additionally escape the column delimiter itself, so a stored value can never
  // forge an extra column boundary.
  return sanitizeInline(text).replace(/\|/g, '\\|');
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return `unknown duration (${ms}ms)`;
  return `${Math.round(ms / 1000)}s`;
}

// A small footnote registry: long reason strings are relocated out of table cells so a row stays
// readable, but every reason still appears in the rendering (property 5), one line per DISTINCT
// reason, referenced by marker from every cell that needed it.
function makeReasons() {
  const list = [];
  const byText = new Map();
  return {
    mark(text) {
      const safe = sanitizeInline(text);
      if (byText.has(safe)) return byText.get(safe);
      const marker = `[${String.fromCharCode(97 + (list.length % 26))}${list.length >= 26 ? list.length : ''}]`;
      list.push({ marker, text: safe });
      byText.set(safe, marker);
      return marker;
    },
    list,
  };
}

function renderDuration(d, reasons) {
  if (d.status === 'measured') return formatDuration(d.ms);
  return `unknown ${reasons.mark(d.reason)}`;
}

function renderRounds(task, reasons) {
  const total = task.rounds.length + task.missingRounds.length;
  if (total === 0) return '0 rounds recorded';
  const items = [];
  for (const r of task.rounds) {
    items.push({ n: r.round, text: `r${r.round} ${renderDuration(r.duration, reasons)}` });
  }
  for (const n of task.missingRounds) {
    items.push({ n, text: `r${n} missing ${reasons.mark('no events recorded for this round number')}` });
  }
  items.sort((a, b) => a.n - b.n);
  return `${total} round(s): ${items.map((i) => i.text).join(', ')}`;
}

// One column for "between boundaries", named for what it measures: the diff between the two
// recorded head commits, which absorbs anything else committed in that window, not only the
// task's own diff.
function renderBetweenBoundaries(changed, reasons) {
  if (changed.status === 'measured') {
    const core = `${changed.lines} / ${changed.files}`;
    return changed.reason ? `${core} ${reasons.mark(changed.reason)}` : core;
  }
  return `unknown ${reasons.mark(changed.reason)}`;
}

function renderFindings(rounds) {
  if (rounds.length === 0) return '(no rounds recorded)';
  return rounds
    .map((r) => {
      if (r.findings.status === 'no-round-end') return `r${r.round}: unpaired (no round-end recorded)`;
      if (r.findings.status === 'not-reported') return `r${r.round}: not reported`;
      const parts = Object.entries(r.findings.values).map(([k, v]) => `${k} ${v}`);
      return `r${r.round}: ${parts.join(', ')}`;
    })
    .join('; ');
}

function stateTag(run) {
  if (run.readError) return `[could not read the store file: ${sanitizeInline(run.readError)}]`;
  if (run.state === 'finished' || run.state === 'failed' || run.state === 'abandoned') {
    return `[claimed outcome: ${sanitizeInline(run.outcome)}]`;
  }
  if (run.state === 'no-end') return '[INCOMPLETE: no run-end recorded]';
  if (run.state === 'no-data') return '[no data for this run id]';
  return `[cannot classify: ${sanitizeInline(run.detail)}]`;
}

function runHeading(run) {
  const unpaired = run.tasks.filter((t) => t.elapsed.status === 'unsupported').length;
  const bits = [`${run.tasks.length} task(s)`];
  if (run.malformed > 0) bits.push(`${run.malformed} malformed line(s) skipped`);
  if (run.foreignEventsDropped > 0) bits.push(`${run.foreignEventsDropped} foreign event(s) dropped`);
  if (unpaired > 0) bits.push(`${unpaired} task(s) with unpaired boundaries`);
  const note = run.startNote ? ` (note: ${sanitizeInline(run.startNote)})` : '';
  return `## ${sanitizeInline(run.runId)} ${stateTag(run)}${note} (${bits.join(', ')})`;
}

// Pure: takes the plain-data model buildReportModel() produces (or a hand-built one, for tests
// that need no file/git IO at all) and renders the always-on caveat, the prominent
// did-not-cleanly-finish banner, one heading and table per run, and a footnote list of every
// relocated reason.
export function render(model) {
  const lines = [];
  const reasons = makeReasons();

  lines.push('# run-observability summary');
  lines.push('EXPERIMENT: run-observability -- throwaway table, deleted with the rest of the experiment.');
  lines.push('');
  lines.push(model.caveat ?? CAVEAT_TEXT);
  lines.push("[measured] = read from a clock or from git. [claimed] = the agent's word.");
  lines.push('');

  if (model.anyIncomplete) {
    const didNotFinish = model.runs.filter((r) => !r.readError && DID_NOT_FINISH_STATES.has(r.state));
    const names = didNotFinish.map((r) => `${sanitizeInline(r.runId)} (${sanitizeInline(r.detail)})`).join('; ');
    lines.push(
      `INCOMPLETE RUNS PRESENT: ${didNotFinish.length} of ${model.runs.length} run(s) shown did not cleanly ` +
        `finish: ${names}.`,
    );
    lines.push('');
  }

  for (const run of model.runs) {
    lines.push(runHeading(run));
    lines.push('');

    if (run.tasks.length === 0) {
      lines.push('(no tasks recorded)');
      lines.push('');
      continue;
    }

    lines.push(
      '| Task | Elapsed [measured] | Rounds [measured] | Between boundaries (lines/files) [measured] | ' +
        'Findings by severity [claimed] |',
    );
    lines.push('| --- | --- | --- | --- | --- |');

    for (const task of run.tasks) {
      const row = [
        escapeCell(task.taskId),
        escapeCell(renderDuration(task.elapsed, reasons)),
        escapeCell(renderRounds(task, reasons)),
        escapeCell(renderBetweenBoundaries(task.changed, reasons)),
        escapeCell(renderFindings(task.rounds)),
      ];
      lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push('');
  }

  if (reasons.list.length > 0) {
    lines.push('Reasons (referenced above by marker):');
    for (const { marker, text } of reasons.list) {
      lines.push(`${marker} ${text}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

// --- orchestration -----------------------------------------------------------------------------

export async function run(argv, opts = {}) {
  const stdout = opts.stdout ?? process.stdout;
  const stderr = opts.stderr ?? process.stderr;

  const parsed = parseSummaryArgs(argv);
  if (!parsed.ok) {
    stderr.write(`experiment-report: ${parsed.error}\n`);
    return 1;
  }

  const repoCwd = parsed.repo ?? opts.repoCwd ?? process.cwd();
  const storeRoot = opts.storeRoot ?? defaultStoreRoot(repoCwd);

  const model = await buildReportModel(parsed.runIds, {
    storeRoot,
    repoCwd,
    gitDiffShortstat: opts.gitDiffShortstat,
  });
  stdout.write(render(model));
  return 0;
}

// Portable ESM main-guard (matches experiment-record.mjs / sdlc-check.mjs).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.stderr.write(`experiment-report: unexpected internal error: ${err && err.stack ? err.stack : err}\n`);
      process.exitCode = 1;
    });
}
