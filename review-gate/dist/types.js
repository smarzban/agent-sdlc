// The data model for the gate. Deliberately small: a reviewer produces Findings; the spine
// clusters them, computes cross-model agreement, takes the agent's adjudication of contested
// clusters, and emits a deterministic verdict + one PR comment.
/** Severity rank: higher = worse. Gating = critical/high/medium. */
export const SEVERITY_RANK = {
    critical: 4, high: 3, medium: 2, low: 1, info: 0,
};
export const GATING = new Set(["critical", "high", "medium"]);
