"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptPlugin = void 0;
const node_path_1 = __importDefault(require("node:path"));
const typescript_1 = __importDefault(require("typescript"));
const SUPPORTED_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
]);
function getScriptKind(filePath) {
    switch (node_path_1.default.extname(filePath)) {
        case ".ts":
            return typescript_1.default.ScriptKind.TS;
        case ".tsx":
            return typescript_1.default.ScriptKind.TSX;
        case ".jsx":
            return typescript_1.default.ScriptKind.JSX;
        case ".js":
        case ".mjs":
        case ".cjs":
            return typescript_1.default.ScriptKind.JS;
        default:
            return typescript_1.default.ScriptKind.Unknown;
    }
}
function getLanguageLabel(filePath) {
    const kind = getScriptKind(filePath);
    if (kind === typescript_1.default.ScriptKind.TS || kind === typescript_1.default.ScriptKind.TSX)
        return "typescript";
    if (kind === typescript_1.default.ScriptKind.JS || kind === typescript_1.default.ScriptKind.JSX)
        return "javascript";
    return "unknown";
}
function getLineNumber(sourceFile, position) {
    return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}
function getNodeName(node) {
    if (typescript_1.default.isFunctionDeclaration(node) ||
        typescript_1.default.isClassDeclaration(node) ||
        typescript_1.default.isInterfaceDeclaration(node) ||
        typescript_1.default.isTypeAliasDeclaration(node) ||
        typescript_1.default.isEnumDeclaration(node)) {
        return node.name?.getText() ?? null;
    }
    if (typescript_1.default.isVariableStatement(node)) {
        const first = node.declarationList.declarations[0];
        if (first && typescript_1.default.isIdentifier(first.name))
            return first.name.text;
    }
    return null;
}
function getSymbolKind(node) {
    if (typescript_1.default.isFunctionDeclaration(node))
        return "function";
    if (typescript_1.default.isClassDeclaration(node))
        return "class";
    if (typescript_1.default.isInterfaceDeclaration(node))
        return "interface";
    if (typescript_1.default.isTypeAliasDeclaration(node))
        return "typeAlias";
    if (typescript_1.default.isEnumDeclaration(node))
        return "enum";
    if (typescript_1.default.isVariableStatement(node))
        return "variable";
    return null;
}
function hasExportModifier(node) {
    return Boolean(typescript_1.default.canHaveModifiers(node) &&
        typescript_1.default.getModifiers(node)?.some((m) => m.kind === typescript_1.default.SyntaxKind.ExportKeyword));
}
function getImportSpecifiers(node) {
    const clause = node.importClause;
    if (!clause)
        return [];
    const specifiers = [];
    if (clause.name)
        specifiers.push(clause.name.text);
    if (clause.namedBindings) {
        if (typescript_1.default.isNamespaceImport(clause.namedBindings)) {
            specifiers.push(`* as ${clause.namedBindings.name.text}`);
        }
        else if (typescript_1.default.isNamedImports(clause.namedBindings)) {
            for (const el of clause.namedBindings.elements) {
                specifiers.push(el.name.text);
            }
        }
    }
    return specifiers;
}
function normalizeRepoPath(p) {
    return p.replace(/\\/g, "/");
}
function deriveFilesystemRoute(rootDir, absolutePath, filePath) {
    const normalized = normalizeRepoPath(node_path_1.default.relative(rootDir, absolutePath));
    const routes = [];
    const appIndexMatch = normalized.match(/^app\/page\.(tsx|ts|jsx|js)$/);
    const appMatch = normalized.match(/^app\/(.+)\/page\.(tsx|ts|jsx|js)$/);
    const pagesMatch = normalized.match(/^pages\/(.+)\.(tsx|ts|jsx|js)$/);
    if (appIndexMatch) {
        routes.push({ route: "/", kind: "filesystem", filePath, line: 1 });
    }
    if (appMatch) {
        routes.push({
            route: `/${appMatch[1].replace(/\/index$/i, "").replace(/\[(.+?)\]/g, ":$1")}`.replace(/\/+/g, "/"),
            kind: "filesystem",
            filePath,
            line: 1,
        });
    }
    if (pagesMatch) {
        const fragment = pagesMatch[1]
            .replace(/\/index$/i, "")
            .replace(/^index$/i, "")
            .replace(/\[(.+?)\]/g, ":$1");
        routes.push({ route: fragment ? `/${fragment}` : "/", kind: "filesystem", filePath, line: 1 });
    }
    return routes;
}
function analyzeTs(ctx) {
    const { rootDir, absolutePath, filePath, content } = ctx;
    const sourceFile = typescript_1.default.createSourceFile(absolutePath, content, typescript_1.default.ScriptTarget.Latest, true, getScriptKind(absolutePath));
    const imports = [];
    const symbols = [];
    const componentUsages = [];
    const uiHandlers = [];
    const routes = deriveFilesystemRoute(rootDir, absolutePath, filePath);
    const visit = (node) => {
        if (typescript_1.default.isImportDeclaration(node) && typescript_1.default.isStringLiteral(node.moduleSpecifier)) {
            imports.push({
                source: node.moduleSpecifier.text,
                specifiers: getImportSpecifiers(node),
                isTypeOnly: Boolean(node.importClause?.isTypeOnly),
                line: getLineNumber(sourceFile, node.getStart(sourceFile)),
            });
        }
        const symbolKind = getSymbolKind(node);
        const symbolName = getNodeName(node);
        if (symbolKind && symbolName) {
            symbols.push({
                name: symbolName,
                kind: symbolKind,
                filePath,
                line: getLineNumber(sourceFile, node.getStart(sourceFile)),
                exported: hasExportModifier(node),
            });
        }
        if (typescript_1.default.isJsxSelfClosingElement(node) || typescript_1.default.isJsxOpeningElement(node)) {
            const tagName = node.tagName.getText(sourceFile);
            if (/^[A-Z]/.test(tagName)) {
                componentUsages.push({ componentName: tagName, filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)) });
            }
            for (const attr of node.attributes.properties) {
                if (!typescript_1.default.isJsxAttribute(attr) || !attr.initializer)
                    continue;
                const eventName = attr.name.getText(sourceFile);
                if (!/^on[A-Z]/.test(eventName))
                    continue;
                let handlerName = "inline";
                if (typescript_1.default.isJsxExpression(attr.initializer) &&
                    attr.initializer.expression &&
                    typescript_1.default.isIdentifier(attr.initializer.expression)) {
                    handlerName = attr.initializer.expression.text;
                }
                uiHandlers.push({ eventName, handlerName, filePath, line: getLineNumber(sourceFile, attr.getStart(sourceFile)) });
            }
        }
        if (typescript_1.default.isJsxAttribute(node) && node.name.getText(sourceFile) === "path" && node.initializer) {
            if (typescript_1.default.isStringLiteral(node.initializer)) {
                routes.push({ route: node.initializer.text, kind: "react-router", filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)) });
            }
            if (typescript_1.default.isJsxExpression(node.initializer) && node.initializer.expression && typescript_1.default.isStringLiteral(node.initializer.expression)) {
                routes.push({ route: node.initializer.expression.text, kind: "react-router", filePath, line: getLineNumber(sourceFile, node.getStart(sourceFile)) });
            }
        }
        typescript_1.default.forEachChild(node, visit);
    };
    visit(sourceFile);
    return {
        language: getLanguageLabel(absolutePath),
        imports,
        symbols,
        componentUsages,
        uiHandlers,
        routes,
    };
}
class TypeScriptPlugin {
    name = "typescript";
    supports(filePath) {
        return SUPPORTED_EXTENSIONS.has(node_path_1.default.extname(filePath));
    }
    async analyzeFile(ctx) {
        return analyzeTs(ctx);
    }
}
exports.TypeScriptPlugin = TypeScriptPlugin;
