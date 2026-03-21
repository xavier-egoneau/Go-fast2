"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const repoFs_js_1 = require("../utils/repoFs.js");
(0, vitest_1.describe)("normalizeSafePath", () => {
    const root = "/tmp/orbit-test-root";
    (0, vitest_1.it)("returns absolute path for a simple relative file", () => {
        const result = (0, repoFs_js_1.normalizeSafePath)(root, "src/index.ts");
        (0, vitest_1.expect)(result).toBe(node_path_1.default.join(root, "src/index.ts"));
    });
    (0, vitest_1.it)("returns absolute path for a file in root", () => {
        const result = (0, repoFs_js_1.normalizeSafePath)(root, "README.md");
        (0, vitest_1.expect)(result).toBe(node_path_1.default.join(root, "README.md"));
    });
    (0, vitest_1.it)("throws for path traversal with ..", () => {
        (0, vitest_1.expect)(() => (0, repoFs_js_1.normalizeSafePath)(root, "../outside.ts")).toThrow("Acces refuse");
    });
    (0, vitest_1.it)("throws for deeply nested path traversal", () => {
        (0, vitest_1.expect)(() => (0, repoFs_js_1.normalizeSafePath)(root, "src/../../outside.ts")).toThrow("Acces refuse");
    });
    (0, vitest_1.it)("allows paths that resolve within root even with redundant segments", () => {
        // src/../other is still inside root
        const result = (0, repoFs_js_1.normalizeSafePath)(root, "src/../other.ts");
        (0, vitest_1.expect)(result).toBe(node_path_1.default.join(root, "other.ts"));
    });
    (0, vitest_1.it)("throws for absolute paths outside root", () => {
        (0, vitest_1.expect)(() => (0, repoFs_js_1.normalizeSafePath)(root, "/etc/passwd")).toThrow("Acces refuse");
    });
});
