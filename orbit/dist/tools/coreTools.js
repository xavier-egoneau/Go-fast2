"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCoreTools = registerCoreTools;
const mcpResponses_js_1 = require("../utils/mcpResponses.js");
function registerCoreTools(server, options) {
    server.registerTool("health_check", {
        title: "Health check",
        description: "Retourne l'etat du serveur MCP et le repertoire racine analyse.",
        inputSchema: {},
    }, async () => {
        return (0, mcpResponses_js_1.json)({
            ok: true,
            rootDir: options.rootDir,
            browserReady: options.getBrowserReady(),
            runtimeProcesses: options.getRuntimeProcessCount(),
            timestamp: new Date().toISOString(),
        });
    });
}
