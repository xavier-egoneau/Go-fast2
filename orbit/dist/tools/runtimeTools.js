"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRuntimeTools = registerRuntimeTools;
const zod_1 = require("zod");
const mcpResponses_js_1 = require("../utils/mcpResponses.js");
function registerRuntimeTools(server, options) {
    server.registerTool("dev_run_command", {
        title: "Run command",
        description: "Execute une commande shell dans le repo ou un sous-dossier du repo.",
        inputSchema: {
            command: zod_1.z.string().min(1),
            cwd: zod_1.z.string().optional(),
            timeoutMs: zod_1.z.number().int().positive().max(300_000).optional(),
        },
    }, async ({ command, cwd, timeoutMs }) => {
        return (0, mcpResponses_js_1.json)(await options.runtimeBridge.runCommand(command, cwd, timeoutMs));
    });
    server.registerTool("runtime_start_process", {
        title: "Start runtime process",
        description: "Lance un processus long dans le repo et conserve ses logs.",
        inputSchema: {
            command: zod_1.z.string().min(1),
            cwd: zod_1.z.string().optional(),
        },
    }, async ({ command, cwd }) => {
        return (0, mcpResponses_js_1.json)(options.runtimeBridge.startProcess(command, cwd));
    });
    server.registerTool("runtime_list_processes", {
        title: "List runtime processes",
        description: "Liste les processus suivis par le runtime bridge.",
        inputSchema: {},
    }, async () => {
        const processes = options.runtimeBridge.listProcesses();
        return (0, mcpResponses_js_1.json)({
            count: processes.length,
            processes,
        });
    });
    server.registerTool("runtime_read_logs", {
        title: "Read runtime logs",
        description: "Retourne les logs stdout/stderr captures pour un processus suivi.",
        inputSchema: {
            processId: zod_1.z.string().min(1),
            limit: zod_1.z.number().int().positive().max(options.maxRuntimeLogEntries).optional(),
            clearAfterRead: zod_1.z.boolean().optional(),
        },
    }, async ({ processId, limit, clearAfterRead }) => {
        const result = options.runtimeBridge.readLogs(processId, limit, clearAfterRead);
        const warning = result.process.status === "exited"
            ? `Le processus s'est terminé (code: ${result.process.exitCode ?? "null"}) — les logs peuvent être incomplets.`
            : null;
        return (0, mcpResponses_js_1.json)({ ...result, warning });
    });
    server.registerTool("runtime_stop_process", {
        title: "Stop runtime process",
        description: "Demande l'arret d'un processus suivi.",
        inputSchema: {
            processId: zod_1.z.string().min(1),
            signal: zod_1.z.enum(["SIGTERM", "SIGINT", "SIGKILL"]).optional(),
        },
    }, async ({ processId, signal }) => {
        return (0, mcpResponses_js_1.json)(options.runtimeBridge.stopProcess(processId, signal));
    });
    server.registerTool("runtime_prune_exited", {
        title: "Prune exited processes",
        description: "Supprime de la memoire les processus termines pour liberer les ressources.",
        inputSchema: {},
    }, async () => {
        options.runtimeBridge.pruneExited();
        const remaining = options.runtimeBridge.listProcesses();
        return (0, mcpResponses_js_1.json)({ remaining: remaining.length, processes: remaining });
    });
    server.registerTool("runtime_errors", {
        title: "Runtime errors",
        description: "Retourne les logs d'erreurs ou d'avertissements recents captures par le runtime bridge, tous processus confondus.",
        inputSchema: {
            filter: zod_1.z.enum(["errors", "warnings"]).optional().default("errors"),
            limit: zod_1.z.number().int().positive().max(options.maxRuntimeLogEntries).optional(),
        },
    }, async ({ filter, limit }) => {
        return (0, mcpResponses_js_1.json)(options.runtimeBridge.getGlobalRecentLogs(limit, filter));
    });
}
