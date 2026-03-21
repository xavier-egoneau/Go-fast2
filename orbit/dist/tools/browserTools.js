"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBrowserTools = registerBrowserTools;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const mcpResponses_js_1 = require("../utils/mcpResponses.js");
const repoFs_js_1 = require("../utils/repoFs.js");
function registerBrowserTools(server, options) {
    server.registerTool("browser_open", {
        title: "Browser open",
        description: "Ouvre une URL dans le navigateur headless de l'agent.",
        inputSchema: {
            url: zod_1.z.string().url(),
            waitUntil: zod_1.z.enum(["load", "domcontentloaded", "networkidle", "commit"]).optional(),
        },
    }, async ({ url, waitUntil }) => {
        return (0, mcpResponses_js_1.json)(await options.browserSession.open(url, waitUntil));
    });
    server.registerTool("browser_execute_js", {
        title: "Browser execute JS",
        description: "Execute du JavaScript dans la page courante.",
        inputSchema: {
            expression: zod_1.z.string().min(1),
        },
    }, async ({ expression }) => {
        return (0, mcpResponses_js_1.json)(await options.browserSession.executeJs(expression));
    });
    server.registerTool("browser_screenshot", {
        title: "Browser screenshot",
        description: "Prend un screenshot de la page courante.",
        inputSchema: {
            outputPath: zod_1.z.string().min(1),
            fullPage: zod_1.z.boolean().optional(),
        },
    }, async ({ outputPath, fullPage }) => {
        const absolutePath = (0, repoFs_js_1.normalizeSafePath)(options.rootDir, outputPath);
        await promises_1.default.mkdir(node_path_1.default.dirname(absolutePath), { recursive: true });
        const result = await options.browserSession.screenshot(absolutePath, fullPage ?? true);
        return (0, mcpResponses_js_1.json)({
            outputPath: outputPath.replace(/\\/g, "/"),
            absolutePath,
            currentUrl: result.currentUrl,
        });
    });
    server.registerTool("browser_console_logs", {
        title: "Browser console logs",
        description: "Retourne les derniers logs console du navigateur.",
        inputSchema: {
            limit: zod_1.z.number().int().positive().max(options.maxConsoleLogs).optional(),
            clearAfterRead: zod_1.z.boolean().optional(),
        },
    }, async ({ limit, clearAfterRead }) => {
        return (0, mcpResponses_js_1.json)(options.browserSession.readConsoleLogs(limit, clearAfterRead));
    });
    server.registerTool("browser_close", {
        title: "Browser close",
        description: "Ferme la session navigateur active (tous les onglets).",
        inputSchema: {},
    }, async () => {
        await options.browserSession.close();
        return (0, mcpResponses_js_1.ok)("Session navigateur fermee.");
    });
    server.registerTool("browser_new_tab", {
        title: "Browser new tab",
        description: "Ouvre un nouvel onglet et le rend actif. Peut naviguer directement vers une URL.",
        inputSchema: {
            url: zod_1.z.string().url().optional(),
            waitUntil: zod_1.z.enum(["load", "domcontentloaded", "networkidle", "commit"]).optional(),
        },
    }, async ({ url, waitUntil }) => {
        return (0, mcpResponses_js_1.json)(await options.browserSession.newTab(url, waitUntil));
    });
    server.registerTool("browser_list_tabs", {
        title: "Browser list tabs",
        description: "Liste tous les onglets ouverts avec leur id, URL, titre et état actif.",
        inputSchema: {},
    }, async () => {
        const tabs = await options.browserSession.listTabs();
        return (0, mcpResponses_js_1.json)({ count: tabs.length, tabs });
    });
    server.registerTool("browser_switch_tab", {
        title: "Browser switch tab",
        description: "Change l'onglet actif.",
        inputSchema: {
            tabId: zod_1.z.string().min(1),
        },
    }, async ({ tabId }) => {
        return (0, mcpResponses_js_1.json)(await options.browserSession.switchTab(tabId));
    });
    server.registerTool("browser_close_tab", {
        title: "Browser close tab",
        description: "Ferme un onglet spécifique (ou l'onglet actif si aucun id fourni).",
        inputSchema: {
            tabId: zod_1.z.string().optional(),
        },
    }, async ({ tabId }) => {
        await options.browserSession.closeTab(tabId);
        return (0, mcpResponses_js_1.ok)(`Onglet ${tabId ?? "actif"} fermé.`);
    });
}
