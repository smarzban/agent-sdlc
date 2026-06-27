import type { ReviewerOutput, RunMeta } from "./types.js";

// `run` prints one envelope per (reviewer × model): {reviewer, backend, model, output: ReviewerOutput|null,
// warning}. `scan` prints {output: ReviewerOutput(tools), warning}. `collect` inverts that: from the saved
// per-pass files it builds the two artifacts the rest of the pipeline consumes — outputs.json (→ consolidate)
// and meta.json (→ decide) — DETERMINISTICALLY, so the most mistake-prone manual step (hand-assembling
// meta.missing) can't silently thin the panel. It is a DUMB gatherer: read, classify vote/non-vote, fold the
// scan, derive `missing` from null votes. No clustering, no heuristics, no scoring — that all lives downstream.

/** A saved `run`/`scan` envelope. `output` is the reviewer's vote (or the scan's), or null on a non-vote. */
export interface RunEnvelope {
  reviewer?: string;
  backend?: string;
  model?: string;
  output?: ReviewerOutput | null;
  warning?: string | null;
}

export interface CollectInput { name: string; json: RunEnvelope }
export interface MissingPass { reviewer: string; model: string; reason?: string }

const isReviewerOutput = (o: unknown): o is ReviewerOutput =>
  !!o && typeof o === "object" &&
  typeof (o as ReviewerOutput).reviewer === "string" &&
  typeof (o as ReviewerOutput).model === "string" &&
  Array.isArray((o as ReviewerOutput).findings);

// The deterministic (scan) output joins `outputs` (consolidate needs it) but is NOT a model reviewer
// pass, so it's kept OUT of the `reviewers` roster + the Coverage denominator — the scan is always-on
// and can't be "lost". (Mirrors consolidate's own isToolOutput.)
const isTool = (o: ReviewerOutput): boolean => o.reviewer === "tools" || o.model === "deterministic";

/** Gather saved run/scan envelopes into {outputs, meta}. Voters (incl. the scan) → outputs; null votes →
 *  meta.missing (reason = the envelope's warning); `opts.missing` adds passes that produced NO file at all
 *  (a backend planned then skipped, a lens with no input) — collect can't see those. Throws LOUD on a
 *  malformed file or a non-vote with no provenance: a silently-dropped file is exactly the panel-thinning
 *  this verb exists to prevent. */
export function collect(
  files: CollectInput[],
  opts: { round?: number; missing?: MissingPass[] } = {},
): { outputs: ReviewerOutput[]; meta: RunMeta } {
  const outputs: ReviewerOutput[] = [];
  const missing: MissingPass[] = [];
  for (const { name, json } of files) {
    if (!json || typeof json !== "object" || Array.isArray(json))
      throw new Error(`collect: ${name} is not a run/scan envelope object`);
    if (isReviewerOutput(json.output)) {
      outputs.push(json.output);                                  // a vote — a model reviewer OR the scan
    } else if (json.output === null || json.output === undefined) {
      // a non-vote: attribute the lost coverage from the envelope's top-level provenance + warning. The
      // model string mirrors consolidate's "backend:model" so the Coverage line names it consistently.
      const reviewer = json.reviewer;
      const model = json.backend && json.model ? `${json.backend}:${json.model}` : json.model;
      if (typeof reviewer !== "string" || !reviewer.trim() || typeof model !== "string" || !model.trim())
        throw new Error(`collect: ${name} is a non-vote but carries no reviewer/model to attribute the lost coverage to`);
      missing.push({ reviewer, model, ...(json.warning ? { reason: json.warning } : {}) });
    } else {
      throw new Error(`collect: ${name} has a malformed "output" (neither a reviewer output nor null)`);
    }
  }
  if (opts.missing) missing.push(...opts.missing);
  const reviewers = outputs.filter((o) => !isTool(o)).map((o) => ({ reviewer: o.reviewer, model: o.model }));
  const meta: RunMeta = {
    reviewers,
    ...(missing.length ? { missing } : {}),
    ...(opts.round ? { round: opts.round } : {}),
  };
  return { outputs, meta };
}
