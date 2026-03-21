"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRepoTools = registerRepoTools;
const node_child_process_1 = require("node:child_process");
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const zod_1 = require("zod");
const mcpResponses_js_1 = require("../utils/mcpResponses.js");
const repoFs_js_1 = require("../utils/repoFs.js");
const exec = (0, node_util_1.promisify)(node_child_process_1.exec);
const RG_IGNORED = ["node_modules", "dist", "build", ".next", "coverage", ".orbit", ".git"];
async function searchWithRipgrep(rootDir, query, isRegex, caseSensitive, hardLimit) {
    try {
        const flags = [
            "--line-number",
            "--no-heading",
            "--with-filename",
            caseSensitive ? "--case-sensitive" : "--ignore-case",
            isRegex ? "--regexp" : "--fixed-strings",
            ...RG_IGNORED.flatMap((d) => ["--glob", `!${d}`]),
            "--max-count",
            String(hardLimit),
        ];
        const escaped = query.replace(/'/g, "'\\''");
        const cmd = `rg ${flags.join(" ")} '${escaped}' .`;
        const { stdout } = await exec(cmd, { cwd: rootDir, maxBuffer: 5 * 1024 * 1024 });
        const results = [];
        for (const line of stdout.split("\n")) {
            if (!line.trim())
                continue;
            const match = line.match(/^(.+?):(\d+):(.*)$/);
            if (!match)
                continue;
            results.push({
                filePath: match[1].replace(/\\/g, "/"),
                line: parseInt(match[2], 10),
                preview: match[3].trim(),
            });
            if (results.length >= hardLimit)
                break;
        }
        return results;
    }
    catch (err) {
        // rg exits with code 1 when no matches found — that's a valid empty result.
        const exitCode = err.code;
        if (exitCode === 1)
            return [];
        // rg not found or other error — fall back to JS search.
        return null;
    }
}
async function searchWithJs(rootDir, query, isRegex, caseSensitive, hardLimit) {
    const files = await (0, repoFs_js_1.walkFiles)(rootDir);
    const flags = caseSensitive ? "g" : "gi";
    const pattern = isRegex ? query : (0, repoFs_js_1.escapeRegExp)(query);
    const re = new RegExp(pattern, flags);
    const results = [];
    for (const filePath of files) {
        if (results.length >= hardLimit)
            break;
        const absolutePath = (0, repoFs_js_1.normalizeSafePath)(rootDir, filePath);
        try {
            const content = await promises_1.default.readFile(absolutePath, "utf8");
            for (const [index, lineText] of content.split(/\r?\n/).entries()) {
                re.lastIndex = 0;
                if (re.test(lineText)) {
                    results.push({ filePath, line: index + 1, preview: lineText.trim() });
                    if (results.length >= hardLimit)
                        break;
                }
            }
        }
        catch {
            // Skip non-UTF-8 files.
        }
    }
    return results;
}
function registerRepoTools(server, options) {
    server.registerTool("repo_list_files", {
        title: "List repo files",
        description: "Liste les fichiers du depot en ignorant les dossiers volumineux et generes.",
        inputSchema: {
            limit: zod_1.z.number().int().positive().max(10_000).optional(),
            pattern: zod_1.z.string().optional().describe("Regex pattern to filter file paths (e.g. '\\.ts$' or '^src/')"),
        },
    }, async ({ limit, pattern }) => {
        const patternRegex = pattern ? new RegExp(pattern) : undefined;
        const files = await (0, repoFs_js_1.walkFiles)(options.rootDir, options.rootDir, [], { pattern: patternRegex });
        const output = typeof limit === "number" ? files.slice(0, limit) : files;
        return (0, mcpResponses_js_1.json)({
            rootDir: options.rootDir,
            total: files.length,
            returned: output.length,
            files: output,
        });
    });
    server.registerTool("repo_read_file", {
        title: "Read file",
        description: "Lit un fichier texte du depot.",
        inputSchema: {
            filePath: zod_1.z.string().min(1),
        },
    }, async ({ filePath }) => {
        const absolutePath = (0, repoFs_js_1.normalizeSafePath)(options.rootDir, filePath);
        if (!(await (0, repoFs_js_1.pathExists)(absolutePath))) {
            throw new Error(`Fichier introuvable: ${filePath}`);
        }
        const stats = await promises_1.default.stat(absolutePath);
        if (!stats.isFile()) {
            throw new Error(`Ce chemin n'est pas un fichier: ${filePath}`);
        }
        if (stats.size > options.maxFileSizeBytes) {
            throw new Error(`Fichier trop volumineux (${stats.size} octets). Limite: ${options.maxFileSizeBytes}.`);
        }
        const content = await promises_1.default.readFile(absolutePath, "utf8");
        return (0, mcpResponses_js_1.json)({
            filePath: filePath.replace(/\\/g, "/"),
            size: stats.size,
            content,
        });
    });
    server.registerTool("repo_write_file", {
        title: "Write file",
        description: "Ecrit completement un fichier texte dans le depot.",
        inputSchema: {
            filePath: zod_1.z.string().min(1),
            content: zod_1.z.string(),
            createDirectories: zod_1.z.boolean().optional(),
        },
    }, async ({ filePath, content, createDirectories }) => {
        const absolutePath = (0, repoFs_js_1.normalizeSafePath)(options.rootDir, filePath);
        if (createDirectories) {
            await promises_1.default.mkdir(node_path_1.default.dirname(absolutePath), { recursive: true });
        }
        await promises_1.default.writeFile(absolutePath, content, "utf8");
        // Keep the structural index in sync after a write (fire-and-forget).
        options.repoIndexer?.refreshFile(filePath).catch(() => undefined);
        return (0, mcpResponses_js_1.ok)(`Fichier ecrit avec succes: ${filePath.replace(/\\/g, "/")}`);
    });
    server.registerTool("repo_delete_file", {
        title: "Delete file",
        description: "Supprime un fichier du depot.",
        inputSchema: {
            filePath: zod_1.z.string().min(1),
        },
    }, async ({ filePath }) => {
        const absolutePath = (0, repoFs_js_1.normalizeSafePath)(options.rootDir, filePath);
        if (!(await (0, repoFs_js_1.pathExists)(absolutePath))) {
            throw new Error(`Fichier introuvable: ${filePath}`);
        }
        const stats = await promises_1.default.stat(absolutePath);
        if (!stats.isFile()) {
            throw new Error(`Ce chemin n'est pas un fichier: ${filePath}`);
        }
        await promises_1.default.unlink(absolutePath);
        return (0, mcpResponses_js_1.ok)(`Fichier supprime: ${filePath.replace(/\\/g, "/")}`);
    });
    server.registerTool("repo_move_file", {
        title: "Move / rename file",
        description: "Deplace ou renomme un fichier dans le depot.",
        inputSchema: {
            sourcePath: zod_1.z.string().min(1),
            destPath: zod_1.z.string().min(1),
            createDirectories: zod_1.z.boolean().optional(),
        },
    }, async ({ sourcePath, destPath, createDirectories }) => {
        const absoluteSource = (0, repoFs_js_1.normalizeSafePath)(options.rootDir, sourcePath);
        const absoluteDest = (0, repoFs_js_1.normalizeSafePath)(options.rootDir, destPath);
        if (!(await (0, repoFs_js_1.pathExists)(absoluteSource))) {
            throw new Error(`Fichier source introuvable: ${sourcePath}`);
        }
        if (createDirectories) {
            await promises_1.default.mkdir(node_path_1.default.dirname(absoluteDest), { recursive: true });
        }
        await promises_1.default.rename(absoluteSource, absoluteDest);
        return (0, mcpResponses_js_1.ok)(`Fichier deplace: ${sourcePath.replace(/\\/g, "/")} → ${destPath.replace(/\\/g, "/")}`);
    });
    server.registerTool("repo_search_text", {
        title: "Search text",
        description: "Recherche un texte exact ou une regex dans les fichiers du depot.",
        inputSchema: {
            query: zod_1.z.string().min(1),
            regex: zod_1.z.boolean().optional(),
            caseSensitive: zod_1.z.boolean().optional(),
            maxResults: zod_1.z.number().int().positive().max(500).optional(),
        },
    }, async ({ query, regex, caseSensitive, maxResults }) => {
        const hardLimit = maxResults ?? 100;
        const isRegex = Boolean(regex);
        const isCaseSensitive = Boolean(caseSensitive);
        const rgResults = await searchWithRipgrep(options.rootDir, query, isRegex, isCaseSensitive, hardLimit);
        const results = rgResults ?? await searchWithJs(options.rootDir, query, isRegex, isCaseSensitive, hardLimit);
        return (0, mcpResponses_js_1.json)({
            query,
            regex: isRegex,
            caseSensitive: isCaseSensitive,
            engine: rgResults !== null ? "ripgrep" : "js",
            count: results.length,
            results,
        });
    });
}
