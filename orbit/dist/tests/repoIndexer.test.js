"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const pythonPlugin_js_1 = require("../services/plugins/pythonPlugin.js");
const typescriptPlugin_js_1 = require("../services/plugins/typescriptPlugin.js");
const repoIndexer_js_1 = require("../services/repoIndexer.js");
async function mkTempDir() {
    return promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), "orbit-test-"));
}
(0, vitest_1.describe)("RepoIndexer", () => {
    let tmpDir;
    (0, vitest_1.beforeEach)(async () => {
        tmpDir = await mkTempDir();
    });
    (0, vitest_1.afterEach)(async () => {
        await promises_1.default.rm(tmpDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)("builds an empty index when repo has no matching files", async () => {
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new typescriptPlugin_js_1.TypeScriptPlugin());
        const index = await indexer.buildIndex();
        (0, vitest_1.expect)(index.files).toHaveLength(0);
        (0, vitest_1.expect)(index.symbols).toHaveLength(0);
    });
    (0, vitest_1.it)("indexes a Python file", async () => {
        await promises_1.default.writeFile(node_path_1.default.join(tmpDir, "main.py"), "class Foo:\n    pass\n");
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new pythonPlugin_js_1.PythonPlugin());
        const index = await indexer.buildIndex();
        (0, vitest_1.expect)(index.files).toHaveLength(1);
        (0, vitest_1.expect)(index.symbols[0]).toMatchObject({ name: "Foo", kind: "class" });
    });
    (0, vitest_1.it)("findSymbols returns matching symbols", async () => {
        await promises_1.default.writeFile(node_path_1.default.join(tmpDir, "main.py"), "def my_func():\n    pass\ndef other():\n    pass\n");
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new pythonPlugin_js_1.PythonPlugin());
        await indexer.buildIndex();
        const symbols = await indexer.findSymbols("my_func");
        (0, vitest_1.expect)(symbols).toHaveLength(1);
        (0, vitest_1.expect)(symbols[0].name).toBe("my_func");
    });
    (0, vitest_1.it)("findSymbols is case-insensitive", async () => {
        await promises_1.default.writeFile(node_path_1.default.join(tmpDir, "main.py"), "class MyClass:\n    pass\n");
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new pythonPlugin_js_1.PythonPlugin());
        await indexer.buildIndex();
        (0, vitest_1.expect)(await indexer.findSymbols("myclass")).toHaveLength(1);
        (0, vitest_1.expect)(await indexer.findSymbols("MYCLASS")).toHaveLength(1);
    });
    (0, vitest_1.it)("skips files outside root via indexFile", async () => {
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new typescriptPlugin_js_1.TypeScriptPlugin());
        const result = await indexer.indexFile("/etc/passwd");
        (0, vitest_1.expect)(result).toBeNull();
    });
    (0, vitest_1.it)("refreshFile updates the index in place", async () => {
        const filePath = node_path_1.default.join(tmpDir, "main.py");
        await promises_1.default.writeFile(filePath, "def old_func():\n    pass\n");
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new pythonPlugin_js_1.PythonPlugin());
        await indexer.buildIndex();
        await promises_1.default.writeFile(filePath, "def new_func():\n    pass\n");
        await indexer.refreshFile("main.py");
        const symbols = await indexer.findSymbols("new_func");
        (0, vitest_1.expect)(symbols).toHaveLength(1);
        const oldSymbols = await indexer.findSymbols("old_func");
        (0, vitest_1.expect)(oldSymbols).toHaveLength(0);
    });
    (0, vitest_1.it)("excludes dot directories from the index", async () => {
        await promises_1.default.mkdir(node_path_1.default.join(tmpDir, ".hidden"));
        await promises_1.default.writeFile(node_path_1.default.join(tmpDir, ".hidden", "secret.py"), "class Secret:\n    pass\n");
        const indexer = new repoIndexer_js_1.RepoIndexer(tmpDir).registerPlugin(new pythonPlugin_js_1.PythonPlugin());
        const index = await indexer.buildIndex();
        (0, vitest_1.expect)(index.files).toHaveLength(0);
    });
});
