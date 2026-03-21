"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoIndexer = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const repoFs_js_1 = require("../utils/repoFs.js");
// Additional path prefixes excluded from the structural index (beyond repoFs defaults).
// Dot-directories (e.g. .github, .vscode) are skipped to avoid indexing config/tooling noise.
const EXTRA_EXCLUDED_DIR_PREFIXES = ["."];
function normalizeRepoPath(filePath) {
    return filePath.replace(/\\/g, "/");
}
function normalizeQuery(value) {
    return value.trim().toLowerCase();
}
function isInsideRoot(rootDir, absolutePath) {
    const relative = node_path_1.default.relative(rootDir, absolutePath);
    return !relative.startsWith("..") && !node_path_1.default.isAbsolute(relative);
}
class RepoIndexer {
    rootDir;
    persistence;
    plugins = [];
    lastIndex = null;
    constructor(rootDir, persistence) {
        this.rootDir = node_path_1.default.resolve(rootDir);
        this.persistence = persistence ?? null;
    }
    registerPlugin(plugin) {
        this.plugins.push(plugin);
        return this;
    }
    getRootDir() {
        return this.rootDir;
    }
    getLastIndex() {
        return this.lastIndex;
    }
    async loadCachedIndex() {
        if (!this.persistence)
            return null;
        const cached = await this.persistence.loadIndex();
        if (cached)
            this.lastIndex = cached;
        return cached;
    }
    async buildIndex() {
        const relativePaths = await (0, repoFs_js_1.walkFiles)(this.rootDir, this.rootDir, [], {
            filter: (absPath) => {
                const rel = absPath.slice(this.rootDir.length + 1).replace(/\\/g, "/");
                if (EXTRA_EXCLUDED_DIR_PREFIXES.some((p) => rel.startsWith(p)))
                    return false;
                return this.plugins.some((plugin) => plugin.supports(absPath));
            },
        });
        const files = [];
        for (const relativePath of relativePaths) {
            const absolutePath = node_path_1.default.join(this.rootDir, relativePath);
            const indexedFile = await this.indexFile(absolutePath);
            if (indexedFile)
                files.push(indexedFile);
        }
        const repoIndex = {
            rootDir: this.rootDir,
            createdAt: new Date().toISOString(),
            files,
            symbols: files.flatMap((f) => f.symbols),
            routes: files.flatMap((f) => f.routes),
            componentUsages: files.flatMap((f) => f.componentUsages),
            uiHandlers: files.flatMap((f) => f.uiHandlers),
        };
        this.lastIndex = repoIndex;
        await this.persistence?.saveIndex(repoIndex);
        return repoIndex;
    }
    async indexFile(inputPath) {
        const absolutePath = node_path_1.default.resolve(this.rootDir, inputPath);
        if (!isInsideRoot(this.rootDir, absolutePath))
            return null;
        const plugin = this.plugins.find((p) => p.supports(absolutePath));
        if (!plugin)
            return null;
        const filePath = normalizeRepoPath(node_path_1.default.relative(this.rootDir, absolutePath));
        const content = await promises_1.default.readFile(absolutePath, "utf8");
        const result = await plugin.analyzeFile({ rootDir: this.rootDir, absolutePath, filePath, content });
        return { filePath, absolutePath, ...result };
    }
    async refreshFile(inputPath) {
        const indexedFile = await this.indexFile(inputPath);
        if (!this.lastIndex || !indexedFile)
            return indexedFile;
        this.lastIndex.files = this.lastIndex.files.filter((f) => f.filePath !== indexedFile.filePath);
        this.lastIndex.files.push(indexedFile);
        this.lastIndex.symbols = this.lastIndex.files.flatMap((f) => f.symbols);
        this.lastIndex.routes = this.lastIndex.files.flatMap((f) => f.routes);
        this.lastIndex.componentUsages = this.lastIndex.files.flatMap((f) => f.componentUsages);
        this.lastIndex.uiHandlers = this.lastIndex.files.flatMap((f) => f.uiHandlers);
        this.lastIndex.createdAt = new Date().toISOString();
        return indexedFile;
    }
    async findSymbols(query) {
        const index = this.lastIndex ?? (await this.buildIndex());
        const lowered = normalizeQuery(query);
        return index.symbols.filter((s) => s.name.toLowerCase().includes(lowered));
    }
    async findRoutes(query) {
        const index = this.lastIndex ?? (await this.buildIndex());
        if (!query)
            return index.routes;
        const lowered = normalizeQuery(query);
        return index.routes.filter((r) => r.route.toLowerCase().includes(lowered));
    }
    async findComponentUsages(componentName) {
        const index = this.lastIndex ?? (await this.buildIndex());
        const normalized = normalizeQuery(componentName);
        return index.componentUsages.filter((u) => u.componentName.toLowerCase() === normalized);
    }
    async findUiHandlers(query) {
        const index = this.lastIndex ?? (await this.buildIndex());
        if (!query)
            return index.uiHandlers;
        const lowered = normalizeQuery(query);
        return index.uiHandlers.filter((h) => h.handlerName.toLowerCase().includes(lowered) || h.eventName.toLowerCase().includes(lowered));
    }
    async getFileImports(filePath) {
        const insight = await this.getFileInsight(filePath);
        return insight?.imports ?? [];
    }
    async findFilesImportingModule(query) {
        const index = this.lastIndex ?? (await this.buildIndex());
        const lowered = normalizeQuery(query);
        return index.files
            .map((f) => ({ filePath: f.filePath, imports: f.imports.filter((i) => i.source.toLowerCase().includes(lowered)) }))
            .filter((e) => e.imports.length > 0);
    }
    async findFilesUsingSymbol(symbolName) {
        const index = this.lastIndex ?? (await this.buildIndex());
        const normalized = normalizeQuery(symbolName);
        return index.files.filter((f) => f.symbols.some((s) => s.name.toLowerCase() === normalized) ||
            f.componentUsages.some((u) => u.componentName.toLowerCase() === normalized) ||
            f.uiHandlers.some((h) => h.handlerName.toLowerCase() === normalized));
    }
    async getComponentInsight(componentName) {
        const symbolInsight = await this.getSymbolInsight(componentName);
        const normalized = normalizeQuery(componentName);
        const index = this.lastIndex ?? (await this.buildIndex());
        const usages = index.componentUsages.filter((u) => u.componentName.toLowerCase() === normalized);
        return {
            componentName,
            definitions: symbolInsight.definitions,
            definitionFiles: symbolInsight.definitionFiles,
            usages,
            importingFiles: symbolInsight.importingFiles,
            relatedFiles: symbolInsight.relatedFiles,
            uiHandlersNearDefinitions: symbolInsight.uiHandlers,
        };
    }
    async getSymbolInsight(symbolName) {
        const index = this.lastIndex ?? (await this.buildIndex());
        const normalized = normalizeQuery(symbolName);
        const definitions = index.symbols.filter((s) => s.name.toLowerCase() === normalized);
        const definitionFilePaths = new Set(definitions.map((d) => d.filePath));
        const definitionFiles = index.files.filter((f) => definitionFilePaths.has(f.filePath));
        const importingFiles = index.files
            .map((f) => ({ filePath: f.filePath, imports: f.imports.filter((i) => i.specifiers.some((s) => s.toLowerCase() === normalized)) }))
            .filter((e) => e.imports.length > 0);
        const relatedFiles = index.files.filter((f) => definitionFilePaths.has(f.filePath) ||
            importingFiles.some((e) => e.filePath === f.filePath) ||
            f.componentUsages.some((u) => u.componentName.toLowerCase() === normalized) ||
            f.uiHandlers.some((h) => h.handlerName.toLowerCase() === normalized));
        const uiHandlers = relatedFiles.flatMap((f) => f.uiHandlers.filter((h) => h.handlerName.toLowerCase() === normalized || definitionFilePaths.has(f.filePath)));
        const componentUsages = relatedFiles.flatMap((f) => f.componentUsages.filter((u) => u.componentName.toLowerCase() === normalized));
        return { symbolName, definitions, definitionFiles, importingFiles, relatedFiles, uiHandlers, componentUsages };
    }
    async getRouteInsight(routeQuery) {
        const index = this.lastIndex ?? (await this.buildIndex());
        const lowered = normalizeQuery(routeQuery);
        const route = index.routes.find((r) => r.route.toLowerCase() === lowered) ??
            index.routes.find((r) => r.route.toLowerCase().includes(lowered));
        if (!route)
            return null;
        const routeFiles = index.files.filter((f) => f.filePath === route.filePath);
        return { route, routeFiles, componentsUsed: routeFiles.flatMap((f) => f.componentUsages), uiHandlers: routeFiles.flatMap((f) => f.uiHandlers) };
    }
    async getRouteSourceInsight(routeQuery) {
        const routeInsight = await this.getRouteInsight(routeQuery);
        if (!routeInsight)
            return null;
        const candidates = new Map();
        const upsert = (file, reason, score) => {
            const existing = candidates.get(file.filePath);
            if (existing) {
                existing.score = Math.max(existing.score, score);
                return;
            }
            candidates.set(file.filePath, { filePath: file.filePath, reason, score, symbols: file.symbols, imports: file.imports, uiHandlers: file.uiHandlers });
        };
        for (const file of routeInsight.routeFiles)
            upsert(file, "route-definition", 100);
        for (const component of routeInsight.componentsUsed) {
            const insight = await this.getComponentInsight(component.componentName);
            for (const file of insight.definitionFiles)
                upsert(file, "component-definition", 80);
            for (const file of insight.relatedFiles) {
                if (!candidates.has(file.filePath))
                    upsert(file, "component-importer", 50);
            }
        }
        const primarySources = Array.from(candidates.values()).sort((a, b) => b.score !== a.score ? b.score - a.score : a.filePath.localeCompare(b.filePath));
        return { route: routeInsight.route, primarySources, components: routeInsight.componentsUsed };
    }
    async getFileInsight(filePath) {
        const normalized = normalizeRepoPath(filePath);
        const index = this.lastIndex ?? (await this.buildIndex());
        return index.files.find((f) => f.filePath === normalized) ?? null;
    }
}
exports.RepoIndexer = RepoIndexer;
