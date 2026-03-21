"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSafePath = normalizeSafePath;
exports.pathExists = pathExists;
exports.walkFiles = walkFiles;
exports.escapeRegExp = escapeRegExp;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const DEFAULT_IGNORED_PREFIXES = [
    ".git/",
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "coverage/",
    ".orbit/",
];
function normalizeSafePath(rootDir, inputPath) {
    const resolved = node_path_1.default.resolve(rootDir, inputPath);
    const relative = node_path_1.default.relative(rootDir, resolved);
    if (relative.startsWith("..") || node_path_1.default.isAbsolute(relative)) {
        throw new Error(`Acces refuse hors du repo: ${inputPath}`);
    }
    return resolved;
}
async function pathExists(targetPath) {
    try {
        await promises_1.default.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
async function walkFiles(rootDir, dir = rootDir, result = [], options = {}) {
    const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const absolutePath = node_path_1.default.join(dir, entry.name);
        const relativePath = node_path_1.default.relative(rootDir, absolutePath).replace(/\\/g, "/");
        if (DEFAULT_IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) {
            continue;
        }
        if (entry.isDirectory()) {
            await walkFiles(rootDir, absolutePath, result, options);
            continue;
        }
        if (entry.isFile()) {
            if (options.filter && !options.filter(absolutePath))
                continue;
            if (options.pattern && !options.pattern.test(relativePath))
                continue;
            result.push(relativePath);
        }
    }
    return result;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
