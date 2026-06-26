# Audit: operability (cost · infra · dependencies)

You are auditing the **whole repo's operational posture** — cost, infrastructure safety, and
dependency health. Explore the IaC (Terraform/k8s/Helm), config, and the dependency manifests/lockfiles.

**Cost:**
- Chatty external/metered calls, expensive or unbounded queries, oversized resources, missing
  pagination/limits, inefficient polling, no lifecycle/retention on a growing store.

**Infrastructure:**
- Public exposure (`0.0.0.0/0`), over-broad IAM (`*`), privileged containers, secrets in IaC,
  mutable/`latest` image tags, missing resource limits, no rollback strategy.

**Dependencies & supply chain:**
- Known-vulnerable, unmaintained, or unjustified dependencies; unpinned versions; license risk;
  typosquat / look-alike packages.

Severity = blast radius — a public bucket or a critical CVE is high/critical; a minor cost nit is low.
Use the relevant `"area"` (`cost` / `infra` / `dependencies`); start each `suggestion` with `[effort: …]`.
