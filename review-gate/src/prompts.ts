// The CLI serves its OWN bundled prompts so a skill never needs a filesystem path to them — it asks
// for a prompt by name (`review-gate prompt holistic`) and the binary resolves the file relative to
// itself (see cli.ts). `name` names a bundled prompt, never a path: it is format-validated here so a
// stray `../` or absolute path can't turn `prompt` into an arbitrary-file reader.

const NAME_RE = /^[a-z][a-z0-9-]*$/;

// Reference docs are shared context the ORCHESTRATOR reads (e.g. the model/backend roster), not
// reviewer instructions — so they're served raw, with NO output contract appended. Single source of
// truth: both the review-gate and repo-audit skills fetch `backends` here instead of each carrying
// (and drifting on) its own copy of the lineage table.
const REFERENCE = new Set(["backends"]);

export type PromptParts = { base: string; contract: string | null };

export function promptParts(name: string): PromptParts {
  if (!NAME_RE.test(name)) throw new Error(`invalid prompt name: ${JSON.stringify(name)} (use lowercase letters, digits, hyphens)`);
  if (REFERENCE.has(name)) return { base: name, contract: null };
  // Audit passes carry their own output contract; everything else uses the PR-review one.
  const contract = name.startsWith("audit-") ? "audit-output-contract" : "output-contract";
  if (name === contract) throw new Error(`'${name}' is an output contract, not a reviewer prompt`);
  return { base: name, contract };
}

// `read` takes a prompt basename (no extension) and returns its text. Injectable so the resolution
// logic is testable without the filesystem; cli.ts passes the real loader.
export function assemblePrompt(name: string, read: (basename: string) => string): string {
  const { base, contract } = promptParts(name);
  return contract === null ? read(base) : read(base) + "\n" + read(contract);
}
