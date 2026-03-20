import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PythonPlugin } from "../services/plugins/pythonPlugin.js";
import { TypeScriptPlugin } from "../services/plugins/typescriptPlugin.js";
import { RepoIndexer } from "../services/repoIndexer.js";

async function mkTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "orbit-test-"));
}

describe("RepoIndexer", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkTempDir();
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("builds an empty index when repo has no matching files", async () => {
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new TypeScriptPlugin());
    const index = await indexer.buildIndex();
    expect(index.files).toHaveLength(0);
    expect(index.symbols).toHaveLength(0);
  });

  it("indexes a Python file", async () => {
    await fs.writeFile(path.join(tmpDir, "main.py"), "class Foo:\n    pass\n");
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new PythonPlugin());
    const index = await indexer.buildIndex();
    expect(index.files).toHaveLength(1);
    expect(index.symbols[0]).toMatchObject({ name: "Foo", kind: "class" });
  });

  it("findSymbols returns matching symbols", async () => {
    await fs.writeFile(path.join(tmpDir, "main.py"), "def my_func():\n    pass\ndef other():\n    pass\n");
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new PythonPlugin());
    await indexer.buildIndex();
    const symbols = await indexer.findSymbols("my_func");
    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe("my_func");
  });

  it("findSymbols is case-insensitive", async () => {
    await fs.writeFile(path.join(tmpDir, "main.py"), "class MyClass:\n    pass\n");
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new PythonPlugin());
    await indexer.buildIndex();
    expect(await indexer.findSymbols("myclass")).toHaveLength(1);
    expect(await indexer.findSymbols("MYCLASS")).toHaveLength(1);
  });

  it("skips files outside root via indexFile", async () => {
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new TypeScriptPlugin());
    const result = await indexer.indexFile("/etc/passwd");
    expect(result).toBeNull();
  });

  it("refreshFile updates the index in place", async () => {
    const filePath = path.join(tmpDir, "main.py");
    await fs.writeFile(filePath, "def old_func():\n    pass\n");
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new PythonPlugin());
    await indexer.buildIndex();

    await fs.writeFile(filePath, "def new_func():\n    pass\n");
    await indexer.refreshFile("main.py");

    const symbols = await indexer.findSymbols("new_func");
    expect(symbols).toHaveLength(1);
    const oldSymbols = await indexer.findSymbols("old_func");
    expect(oldSymbols).toHaveLength(0);
  });

  it("excludes dot directories from the index", async () => {
    await fs.mkdir(path.join(tmpDir, ".hidden"));
    await fs.writeFile(path.join(tmpDir, ".hidden", "secret.py"), "class Secret:\n    pass\n");
    const indexer = new RepoIndexer(tmpDir).registerPlugin(new PythonPlugin());
    const index = await indexer.buildIndex();
    expect(index.files).toHaveLength(0);
  });
});
