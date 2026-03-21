"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDiagnosticsTools = registerDiagnosticsTools;
const zod_1 = require("zod");
const mcpResponses_js_1 = require("../utils/mcpResponses.js");
function registerDiagnosticsTools(server, options) {
    server.registerTool("browser_page_state", {
        title: "Browser page state",
        description: "Retourne l'état complet de la page courante : URL, titre, texte visible, éléments interactifs détectés et derniers logs console.",
        inputSchema: {},
    }, async () => {
        const state = await options.diagnostics.getPageState();
        if (!state) {
            throw new Error("Aucune page ouverte dans le navigateur.");
        }
        return (0, mcpResponses_js_1.json)(state);
    });
    server.registerTool("current_page_to_source", {
        title: "Current page to source",
        description: "Résout l'URL courante du navigateur vers les fichiers source candidats du repo. Combine détection de route et analyse du graphe de dépendances.",
        inputSchema: {},
    }, async () => {
        const result = await options.diagnostics.currentPageToSource();
        if (!result) {
            throw new Error("Aucune page ouverte dans le navigateur.");
        }
        return (0, mcpResponses_js_1.json)(result);
    });
    server.registerTool("app_diagnose", {
        title: "App diagnose",
        description: "Vue consolidée de l'état de l'application : page courante, erreurs console, erreurs runtime récentes, route détectée et fichiers source candidats. Point d'entrée principal pour déboguer un comportement observé.",
        inputSchema: {
            consoleLogLimit: zod_1.z.number().int().positive().max(200).optional(),
        },
    }, async ({ consoleLogLimit }) => {
        const report = await options.diagnostics.diagnose({ consoleLogLimit });
        return (0, mcpResponses_js_1.json)(report);
    });
}
