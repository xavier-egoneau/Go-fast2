import { describe, expect, it } from "vitest";
import { PythonPlugin } from "../services/plugins/pythonPlugin.js";

const plugin = new PythonPlugin();

const ctx = (content: string) => ({
  rootDir: "/root",
  absolutePath: "/root/app.py",
  filePath: "app.py",
  content,
});

describe("PythonPlugin.supports()", () => {
  it("accepts .py files", () => {
    expect(plugin.supports("/root/app.py")).toBe(true);
  });

  it("rejects .ts files", () => {
    expect(plugin.supports("/root/app.ts")).toBe(false);
  });
});

describe("PythonPlugin.analyzeFile() — symbols", () => {
  it("detects top-level class", async () => {
    const result = await plugin.analyzeFile(ctx("class MyModel:\n    pass\n"));
    expect(result.symbols).toHaveLength(1);
    expect(result.symbols[0]).toMatchObject({ name: "MyModel", kind: "class", exported: true });
  });

  it("detects top-level function", async () => {
    const result = await plugin.analyzeFile(ctx("def my_func(a, b):\n    return a + b\n"));
    expect(result.symbols).toHaveLength(1);
    expect(result.symbols[0]).toMatchObject({ name: "my_func", kind: "function", exported: true });
  });

  it("does not detect indented methods (plugin only matches top-level definitions)", async () => {
    // The plugin uses trimEnd() not trim(), so indented `def` lines don't match ^def
    const result = await plugin.analyzeFile(ctx("class Foo:\n    def bar(self):\n        pass\n"));
    const names = result.symbols.map((s) => s.name);
    expect(names).toContain("Foo");
    expect(names).not.toContain("bar");
  });
});

describe("PythonPlugin.analyzeFile() — imports", () => {
  it("parses simple import", async () => {
    const result = await plugin.analyzeFile(ctx("import os\n"));
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0]).toMatchObject({ source: "os", specifiers: [] });
  });

  it("parses import with alias", async () => {
    const result = await plugin.analyzeFile(ctx("import numpy as np\n"));
    expect(result.imports[0]).toMatchObject({ source: "numpy", specifiers: ["np"] });
  });

  it("parses from import", async () => {
    const result = await plugin.analyzeFile(ctx("from flask import Flask, request\n"));
    expect(result.imports[0]).toMatchObject({ source: "flask", specifiers: ["Flask", "request"] });
  });
});

describe("PythonPlugin.analyzeFile() — routes", () => {
  it("detects FastAPI route decorator", async () => {
    const result = await plugin.analyzeFile(ctx('@app.get("/users")\nasync def list_users():\n    pass\n'));
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({ route: "/users", kind: "fastapi" });
  });

  it("detects Flask route decorator", async () => {
    const result = await plugin.analyzeFile(ctx('@app.route("/home")\ndef home():\n    pass\n'));
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({ route: "/home", kind: "flask" });
  });
});
