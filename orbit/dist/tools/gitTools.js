"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGitTools = registerGitTools;
const zod_1 = require("zod");
const mcpResponses_js_1 = require("../utils/mcpResponses.js");
function registerGitTools(server, options) {
    server.registerTool("git_status", {
        title: "Git status",
        description: "Retourne la branche courante et les fichiers modifiés (staged / unstaged).",
        inputSchema: {},
    }, async () => {
        const isRepo = await options.gitBridge.isGitRepo();
        if (!isRepo) {
            throw new Error("Le répertoire racine n'est pas un dépôt git.");
        }
        return (0, mcpResponses_js_1.json)(await options.gitBridge.status());
    });
    server.registerTool("git_log", {
        title: "Git log",
        description: "Retourne les derniers commits du dépôt.",
        inputSchema: {
            limit: zod_1.z.number().int().positive().max(100).optional().default(20),
        },
    }, async ({ limit }) => {
        const isRepo = await options.gitBridge.isGitRepo();
        if (!isRepo) {
            throw new Error("Le répertoire racine n'est pas un dépôt git.");
        }
        const commits = await options.gitBridge.log(limit);
        return (0, mcpResponses_js_1.json)({ count: commits.length, commits });
    });
    server.registerTool("git_diff", {
        title: "Git diff",
        description: "Retourne le diff courant (unstaged par défaut). Peut cibler un fichier spécifique ou le staged.",
        inputSchema: {
            filePath: zod_1.z.string().optional(),
            staged: zod_1.z.boolean().optional().default(false),
        },
    }, async ({ filePath, staged }) => {
        const isRepo = await options.gitBridge.isGitRepo();
        if (!isRepo) {
            throw new Error("Le répertoire racine n'est pas un dépôt git.");
        }
        const diff = await options.gitBridge.diff(filePath, staged);
        return (0, mcpResponses_js_1.json)({ filePath: filePath ?? null, staged, diff });
    });
    server.registerTool("git_blame", {
        title: "Git blame",
        description: "Retourne l'historique ligne par ligne d'un fichier (auteur, date, hash, contenu).",
        inputSchema: {
            filePath: zod_1.z.string().min(1),
        },
    }, async ({ filePath }) => {
        const isRepo = await options.gitBridge.isGitRepo();
        if (!isRepo) {
            throw new Error("Le répertoire racine n'est pas un dépôt git.");
        }
        const lines = await options.gitBridge.blame(filePath);
        return (0, mcpResponses_js_1.json)({ filePath, lineCount: lines.length, lines });
    });
}
