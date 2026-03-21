"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pythonPlugin_js_1 = require("../services/plugins/pythonPlugin.js");
const plugin = new pythonPlugin_js_1.PythonPlugin();
const ctx = (content) => ({
    rootDir: "/root",
    absolutePath: "/root/app.py",
    filePath: "app.py",
    content,
});
(0, vitest_1.describe)("PythonPlugin.supports()", () => {
    (0, vitest_1.it)("accepts .py files", () => {
        (0, vitest_1.expect)(plugin.supports("/root/app.py")).toBe(true);
    });
    (0, vitest_1.it)("rejects .ts files", () => {
        (0, vitest_1.expect)(plugin.supports("/root/app.ts")).toBe(false);
    });
});
(0, vitest_1.describe)("PythonPlugin.analyzeFile() — symbols", () => {
    (0, vitest_1.it)("detects top-level class", async () => {
        const result = await plugin.analyzeFile(ctx("class MyModel:\n    pass\n"));
        (0, vitest_1.expect)(result.symbols).toHaveLength(1);
        (0, vitest_1.expect)(result.symbols[0]).toMatchObject({ name: "MyModel", kind: "class", exported: true });
    });
    (0, vitest_1.it)("detects top-level function", async () => {
        const result = await plugin.analyzeFile(ctx("def my_func(a, b):\n    return a + b\n"));
        (0, vitest_1.expect)(result.symbols).toHaveLength(1);
        (0, vitest_1.expect)(result.symbols[0]).toMatchObject({ name: "my_func", kind: "function", exported: true });
    });
    (0, vitest_1.it)("does not detect indented methods (plugin only matches top-level definitions)", async () => {
        // The plugin uses trimEnd() not trim(), so indented `def` lines don't match ^def
        const result = await plugin.analyzeFile(ctx("class Foo:\n    def bar(self):\n        pass\n"));
        const names = result.symbols.map((s) => s.name);
        (0, vitest_1.expect)(names).toContain("Foo");
        (0, vitest_1.expect)(names).not.toContain("bar");
    });
});
(0, vitest_1.describe)("PythonPlugin.analyzeFile() — imports", () => {
    (0, vitest_1.it)("parses simple import", async () => {
        const result = await plugin.analyzeFile(ctx("import os\n"));
        (0, vitest_1.expect)(result.imports).toHaveLength(1);
        (0, vitest_1.expect)(result.imports[0]).toMatchObject({ source: "os", specifiers: [] });
    });
    (0, vitest_1.it)("parses import with alias", async () => {
        const result = await plugin.analyzeFile(ctx("import numpy as np\n"));
        (0, vitest_1.expect)(result.imports[0]).toMatchObject({ source: "numpy", specifiers: ["np"] });
    });
    (0, vitest_1.it)("parses from import", async () => {
        const result = await plugin.analyzeFile(ctx("from flask import Flask, request\n"));
        (0, vitest_1.expect)(result.imports[0]).toMatchObject({ source: "flask", specifiers: ["Flask", "request"] });
    });
});
(0, vitest_1.describe)("PythonPlugin.analyzeFile() — routes", () => {
    (0, vitest_1.it)("detects FastAPI route decorator", async () => {
        const result = await plugin.analyzeFile(ctx('@app.get("/users")\nasync def list_users():\n    pass\n'));
        (0, vitest_1.expect)(result.routes).toHaveLength(1);
        (0, vitest_1.expect)(result.routes[0]).toMatchObject({ route: "/users", kind: "fastapi" });
    });
    (0, vitest_1.it)("detects Flask route decorator", async () => {
        const result = await plugin.analyzeFile(ctx('@app.route("/home")\ndef home():\n    pass\n'));
        (0, vitest_1.expect)(result.routes).toHaveLength(1);
        (0, vitest_1.expect)(result.routes[0]).toMatchObject({ route: "/home", kind: "flask" });
    });
});
