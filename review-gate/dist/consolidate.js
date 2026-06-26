import { SEVERITY_RANK, GATING } from "./types.js";
// Findings from DIFFERENT models that land on the same file within a small line window are the
// "same" issue → one cluster. Agreement = how many distinct models flagged it. We cluster by
// LOCATION (file + nearby lines), not by the model's self-assigned `area`, because the same bug
// gets different area tags from different models (security vs privacy vs correctness) and we want
// those to converge, not split.
const LINE_WINDOW = Number(process.env.REVIEW_GATE_LINE_WINDOW ?? 15);
function maxSeverity(sevs) {
    return sevs.reduce((s, x) => (SEVERITY_RANK[x] > SEVERITY_RANK[s] ? x : s), "info");
}
// Co-location alone over-merges: two UNRELATED findings on adjacent lines would fuse into one
// misleading "k/N" cluster (and the lower-severity one's distinct issue gets masked behind the
// representative). So a merge also requires the titles to be plausibly about the SAME issue — they
// must share a significant token. We do NOT split by `area` (the same bug gets different area tags
// from different models); titles, stripped of the `[area]` prefix and stopwords, are the signal.
// Generic finding-DESCRIPTOR words carry no topical signal — two unrelated findings that both say
// "bug" must not merge on it — so they're stopwords alongside the grammatical ones.
const STOPWORDS = new Set(("the a an of to in on for and or but with without is are be no not it this that change pr code line file when via using use does has have" +
    " bug bugs issue issues problem problems error errors finding findings vulnerability vulnerabilities defect defects concern concerns flaw flaws nit nits").split(" "));
const titleTokens = (f) => new Set(f.title.toLowerCase().replace(/^\[[^\]]*\]\s*/, "").replace(/[^a-z0-9]+/g, " ").split(" ")
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w)));
// Same issue ⇒ shared significant token. If EITHER title is uninformative (no significant tokens) we
// lack evidence to split, so we fall back to the conservative location-only merge — we only SPLIT on
// clear topical divergence, and under-merging (both stay visible) is the safe direction either way.
//
// SECURITY POSTURE (deliberate): clustering is a DISPLAY + agreement aid, NOT the trust boundary. A
// single shared token is a deliberately loose merge bar, so an attacker-steered reviewer could in
// principle co-locate a finding that merges with a real one. That does not let it pass: what blocks is
// the deterministic tool tier (non-dismissible facts), the multi-model panel, and the orchestrator
// reading the CODE behind every gating cluster before dismissing it. The gate's safety never rests on
// clustering being adversarially perfect — so we keep merging permissive (good recall) rather than
// chase an unwinnable heuristic arms race here.
function sameIssue(a, b) {
    // A tool finding is terse/rule-named and won't share a model's prose vocabulary — but co-location
    // already means the same spot, and a tool fact + a model's take on it belong together. So tool
    // findings fall back to location-only merging rather than being split off by title mismatch.
    if (a.source === "tool" || b.source === "tool")
        return true;
    const ta = titleTokens(a), tb = titleTokens(b);
    if (ta.size === 0 && tb.size === 0)
        return true; // both uninformative → can't distinguish → keep the location merge
    if (ta.size === 0 || tb.size === 0)
        return false; // one has content, one doesn't → no evidence they're the same; keep both visible
    for (const w of tb)
        if (ta.has(w))
            return true;
    return false;
}
// A tool (deterministic) output joins the same pool but is NOT a model reviewer — it must not count
// toward the model-agreement denominator/numerator, or it inflates `total` and falsely flips
// unanimous model findings to `contested`.
const isToolOutput = (o) => o.reviewer === "tools" || o.model === "deterministic" ||
    (o.findings.length > 0 && o.findings.every((f) => f.source === "tool"));
export function consolidate(outputs) {
    const total = new Set(outputs.filter((o) => !isToolOutput(o)).map((o) => o.model)).size; // MODEL panel size
    const byFile = new Map();
    for (const o of outputs) {
        for (const f of o.findings) {
            const list = byFile.get(f.file) ?? [];
            list.push({ model: o.model, finding: f });
            byFile.set(f.file, list);
        }
    }
    const clusters = [];
    // The FULL normalized title is part of the lined key: the topical split can emit two clusters at the
    // SAME line, and decide.ts looks up adjudications by key — without the title both would share one key
    // and dismissing one would silently clear the other (a distinct gating finding). No hash, no
    // truncation: distinct titles → distinct keys. (A short hash here was brute-forceable by an
    // attacker-controlled title; identical full titles aren't a useful collision — they're the same text.)
    const slug = (f) => f.title.toLowerCase().replace(/^\[[^\]]*\]\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
    const clusterKey = (file, f) => f.line > 0 ? `${file}::${f.line}::${slug(f)}` : `${file}::0::${slug(f)}`;
    const pushCluster = (group, file) => {
        if (!group.length)
            return;
        const sev = maxSeverity(group.map((m) => m.finding.severity));
        const rep = [...group].sort((a, b) => SEVERITY_RANK[b.finding.severity] - SEVERITY_RANK[a.finding.severity])[0].finding;
        const count = new Set(group.filter((m) => m.finding.source !== "tool").map((m) => m.model)).size;
        clusters.push({
            key: clusterKey(file, group[0].finding),
            representative: rep,
            members: group,
            agreement: { count, total },
            severity: sev,
            // Needs the agent's eye when models DISAGREE on a gating issue (one saw it, others didn't).
            // Unanimous gating findings just block; a tool-only finding (count 0) is a fact, not
            // disagreement — it blocks too, but isn't flagged for "is this real?" scrutiny.
            contested: GATING.has(sev) && count > 0 && count < total,
        });
    };
    for (const [file, items] of byFile) {
        // File-level findings (line 0, e.g. path-based tool findings) aren't line-located — cluster them
        // by title so they don't merge with, and mask, a nearby lined model finding.
        const fileLevel = items.filter((m) => m.finding.line === 0);
        const lined = items.filter((m) => m.finding.line > 0).sort((a, b) => a.finding.line - b.finding.line);
        const byTitle = new Map();
        for (const m of fileLevel) {
            const g = byTitle.get(m.finding.title) ?? [];
            g.push(m);
            byTitle.set(m.finding.title, g);
        }
        for (const group of byTitle.values())
            pushCluster(group, file);
        // Greedy line-window grouping, but a finding only joins a group it is plausibly the SAME issue as
        // (shared title token). Distinct issues at adjacent lines stay in separate clusters instead of
        // fusing into one misleading agreement count. Multiple groups can be open within the window at once.
        const open = [];
        for (const it of lined) {
            for (let k = open.length - 1; k >= 0; k--) {
                if (it.finding.line - open[k].anchor > LINE_WINDOW) {
                    pushCluster(open[k].items, file);
                    open.splice(k, 1);
                }
            }
            const g = open.find((grp) => sameIssue(grp.items[0].finding, it.finding));
            if (g)
                g.items.push(it);
            else
                open.push({ items: [it], anchor: it.finding.line });
        }
        for (const g of open)
            pushCluster(g.items, file);
    }
    clusters.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.key.localeCompare(b.key));
    return clusters;
}
