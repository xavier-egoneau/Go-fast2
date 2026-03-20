import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeSafePath } from "../utils/repoFs.js";

describe("normalizeSafePath", () => {
  const root = "/tmp/orbit-test-root";

  it("returns absolute path for a simple relative file", () => {
    const result = normalizeSafePath(root, "src/index.ts");
    expect(result).toBe(path.join(root, "src/index.ts"));
  });

  it("returns absolute path for a file in root", () => {
    const result = normalizeSafePath(root, "README.md");
    expect(result).toBe(path.join(root, "README.md"));
  });

  it("throws for path traversal with ..", () => {
    expect(() => normalizeSafePath(root, "../outside.ts")).toThrow("Acces refuse");
  });

  it("throws for deeply nested path traversal", () => {
    expect(() => normalizeSafePath(root, "src/../../outside.ts")).toThrow("Acces refuse");
  });

  it("allows paths that resolve within root even with redundant segments", () => {
    // src/../other is still inside root
    const result = normalizeSafePath(root, "src/../other.ts");
    expect(result).toBe(path.join(root, "other.ts"));
  });

  it("throws for absolute paths outside root", () => {
    expect(() => normalizeSafePath(root, "/etc/passwd")).toThrow("Acces refuse");
  });
});
