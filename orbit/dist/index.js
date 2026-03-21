"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const browserSession_js_1 = require("./services/browserSession.js");
const diagnostics_js_1 = require("./services/diagnostics.js");
const gitBridge_js_1 = require("./services/gitBridge.js");
const persistence_js_1 = require("./services/persistence.js");
const genericPlugin_js_1 = require("./services/plugins/genericPlugin.js");
const pythonPlugin_js_1 = require("./services/plugins/pythonPlugin.js");
const typescriptPlugin_js_1 = require("./services/plugins/typescriptPlugin.js");
const repoIndexer_js_1 = require("./services/repoIndexer.js");
const runtimeBridge_js_1 = require("./services/runtimeBridge.js");
const browserTools_js_1 = require("./tools/browserTools.js");
const coreTools_js_1 = require("./tools/coreTools.js");
const diagnosticsTools_js_1 = require("./tools/diagnosticsTools.js");
const gitTools_js_1 = require("./tools/gitTools.js");
const repoGraphTools_js_1 = require("./tools/repoGraphTools.js");
const repoTools_js_1 = require("./tools/repoTools.js");
const runtimeTools_js_1 = require("./tools/runtimeTools.js");
const ROOT_DIR = node_path_1.default.resolve(process.env.MCP_ROOT_DIR ?? process.cwd());
const MAX_FILE_SIZE_BYTES = 300_000;
const MAX_COMMAND_OUTPUT_CHARS = 20_000;
const MAX_CONSOLE_LOGS = 200;
const MAX_RUNTIME_LOG_ENTRIES = 500;
const server = new mcp_js_1.McpServer({
    name: "orbit",
    version: "0.1.0",
});
const persistence = new persistence_js_1.PersistenceService(ROOT_DIR);
const repoIndexer = new repoIndexer_js_1.RepoIndexer(ROOT_DIR, persistence)
    .registerPlugin(new typescriptPlugin_js_1.TypeScriptPlugin())
    .registerPlugin(new pythonPlugin_js_1.PythonPlugin())
    .registerPlugin(new genericPlugin_js_1.GenericPlugin());
const gitBridge = new gitBridge_js_1.GitBridgeService(ROOT_DIR);
const browserSession = new browserSession_js_1.BrowserSessionService({
    maxConsoleLogs: MAX_CONSOLE_LOGS,
});
const runtimeBridge = new runtimeBridge_js_1.RuntimeBridgeService(ROOT_DIR, {
    maxOutputChars: MAX_COMMAND_OUTPUT_CHARS,
    maxLogEntries: MAX_RUNTIME_LOG_ENTRIES,
});
const diagnostics = new diagnostics_js_1.DiagnosticsService(browserSession, runtimeBridge, repoIndexer);
(0, coreTools_js_1.registerCoreTools)(server, {
    rootDir: ROOT_DIR,
    getBrowserReady: () => browserSession.isReady(),
    getRuntimeProcessCount: () => runtimeBridge.listProcesses().length,
});
(0, repoTools_js_1.registerRepoTools)(server, {
    rootDir: ROOT_DIR,
    maxFileSizeBytes: MAX_FILE_SIZE_BYTES,
    repoIndexer,
});
(0, repoGraphTools_js_1.registerRepoGraphTools)(server, {
    repoIndexer,
});
(0, runtimeTools_js_1.registerRuntimeTools)(server, {
    runtimeBridge,
    maxRuntimeLogEntries: MAX_RUNTIME_LOG_ENTRIES,
});
(0, browserTools_js_1.registerBrowserTools)(server, {
    rootDir: ROOT_DIR,
    browserSession,
    maxConsoleLogs: MAX_CONSOLE_LOGS,
});
(0, diagnosticsTools_js_1.registerDiagnosticsTools)(server, {
    diagnostics,
});
(0, gitTools_js_1.registerGitTools)(server, {
    gitBridge,
});
async function main() {
    await repoIndexer.loadCachedIndex();
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Fatal MCP server error:", error);
    process.exit(1);
});
