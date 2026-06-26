import { describe, it, expect } from "vitest";
import { promptParts, assemblePrompt } from "../src/prompts.js";

describe("promptParts", () => {
  it("pairs a review prompt with the review output-contract", () => {
    expect(promptParts("holistic")).toEqual({ base: "holistic", contract: "output-contract" });
    expect(promptParts("lens-security")).toEqual({ base: "lens-security", contract: "output-contract" });
  });

  it("pairs an audit pass with the audit output-contract (by the audit- prefix)", () => {
    expect(promptParts("audit-code-health")).toEqual({ base: "audit-code-health", contract: "audit-output-contract" });
  });

  it("rejects path traversal / unsafe names (the name names a bundled prompt, never a path)", () => {
    for (const bad of ["../holistic", "a/b", "..", ".env", "Holistic", "", "lens_security", "x.md"]) {
      expect(() => promptParts(bad), bad).toThrow();
    }
  });

  it("refuses to serve an output-contract as a standalone reviewer prompt", () => {
    expect(() => promptParts("output-contract")).toThrow();
    expect(() => promptParts("audit-output-contract")).toThrow();
  });

  it("serves a reference doc (backends) with NO output contract — it's reference, not a reviewer prompt", () => {
    expect(promptParts("backends")).toEqual({ base: "backends", contract: null });
  });
});

describe("assemblePrompt", () => {
  it("concatenates the reviewer prompt then its output-contract, via injected read", () => {
    const read = (name: string) => `<<${name}>>`;
    expect(assemblePrompt("holistic", read)).toBe("<<holistic>>\n<<output-contract>>");
  });

  it("uses the audit contract for an audit pass", () => {
    const read = (name: string) => `<<${name}>>`;
    expect(assemblePrompt("audit-tests", read)).toBe("<<audit-tests>>\n<<audit-output-contract>>");
  });

  it("serves a reference doc alone — no contract appended", () => {
    const read = (name: string) => `<<${name}>>`;
    expect(assemblePrompt("backends", read)).toBe("<<backends>>");
  });
});
