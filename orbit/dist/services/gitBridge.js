"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitBridgeService = void 0;
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
class GitBridgeService {
    rootDir;
    constructor(rootDir) {
        this.rootDir = node_path_1.default.resolve(rootDir);
    }
    async status() {
        const [branchOut, statusOut] = await Promise.all([
            this.git("rev-parse --abbrev-ref HEAD"),
            this.git("status --porcelain"),
        ]);
        const branch = branchOut.stdout.trim() || "HEAD";
        const entries = statusOut.stdout
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => ({
            staged: line[0] ?? " ",
            unstaged: line[1] ?? " ",
            filePath: line.slice(3).trim(),
        }));
        return { branch, entries };
    }
    async log(limit = 20) {
        const format = "%H%x00%h%x00%an%x00%ai%x00%s";
        const { stdout } = await this.git(`log --max-count=${limit} --format=${format}`);
        return stdout
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) => {
            const [hash = "", shortHash = "", author = "", date = "", ...rest] = line.split("\x00");
            return { hash, shortHash, author, date, message: rest.join("\x00") };
        });
    }
    async diff(filePath, staged = false) {
        const stagedFlag = staged ? "--staged" : "";
        const target = filePath ? `-- ${this.sanitizePath(filePath)}` : "";
        const { stdout } = await this.git(`diff ${stagedFlag} ${target}`.trim());
        return stdout;
    }
    async blame(filePath) {
        const safePath = this.sanitizePath(filePath);
        const { stdout } = await this.git(`blame --line-porcelain -- ${safePath}`);
        const lines = [];
        const blocks = stdout.split(/^([0-9a-f]{40})/m).filter(Boolean);
        let lineNumber = 1;
        let i = 0;
        while (i < blocks.length) {
            const hashLine = blocks[i]?.trim() ?? "";
            const body = blocks[i + 1] ?? "";
            i += 2;
            if (!/^[0-9a-f]{40}$/.test(hashLine)) {
                continue;
            }
            const authorMatch = body.match(/^author (.+)$/m);
            const dateMatch = body.match(/^author-time (\d+)$/m);
            const contentMatch = body.match(/^\t(.*)$/m);
            const date = dateMatch
                ? new Date(parseInt(dateMatch[1] ?? "0", 10) * 1000).toISOString().slice(0, 10)
                : "";
            lines.push({
                lineNumber: lineNumber++,
                hash: hashLine,
                author: authorMatch?.[1] ?? "",
                date,
                content: contentMatch?.[1] ?? "",
            });
        }
        return lines;
    }
    isGitRepo() {
        return this.git("rev-parse --git-dir")
            .then(() => true)
            .catch(() => false);
    }
    async git(command) {
        return exec(`git ${command}`, { cwd: this.rootDir });
    }
    sanitizePath(filePath) {
        const resolved = node_path_1.default.resolve(this.rootDir, filePath);
        const relative = node_path_1.default.relative(this.rootDir, resolved);
        if (relative.startsWith("..") || node_path_1.default.isAbsolute(relative)) {
            throw new Error(`Accès refusé hors du repo: ${filePath}`);
        }
        return relative;
    }
}
exports.GitBridgeService = GitBridgeService;
