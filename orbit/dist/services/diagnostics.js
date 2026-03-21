"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticsService = void 0;
class DiagnosticsService {
    browserSession;
    runtimeBridge;
    repoIndexer;
    constructor(browserSession, runtimeBridge, repoIndexer) {
        this.browserSession = browserSession;
        this.runtimeBridge = runtimeBridge;
        this.repoIndexer = repoIndexer;
    }
    async getPageState() {
        return this.browserSession.getPageState();
    }
    async currentPageToSource() {
        const pageState = await this.browserSession.getPageState();
        if (!pageState) {
            return null;
        }
        let routePath;
        try {
            routePath = new URL(pageState.url).pathname;
        }
        catch {
            routePath = pageState.url;
        }
        const insight = await this.repoIndexer.getRouteSourceInsight(routePath);
        return {
            url: pageState.url,
            routePath,
            sourceInsight: insight
                ? {
                    route: insight.route,
                    primarySources: insight.primarySources.map((c) => ({
                        filePath: c.filePath,
                        reason: c.reason,
                        score: c.score,
                    })),
                    components: insight.components,
                }
                : null,
        };
    }
    async diagnose(options) {
        const consoleLogLimit = options?.consoleLogLimit ?? 20;
        const pageState = await this.browserSession.getPageState();
        const consoleErrors = (pageState?.recentConsoleLogs ?? []).filter((log) => log.startsWith("[error]") || log.startsWith("[pageerror]"));
        const runtimeErrors = this.runtimeBridge.getGlobalRecentLogs(50, "errors");
        let detectedRoute = null;
        let sourceCandidates = null;
        if (pageState) {
            try {
                detectedRoute = new URL(pageState.url).pathname;
                const insight = await this.repoIndexer.getRouteSourceInsight(detectedRoute);
                if (insight) {
                    sourceCandidates = insight.primarySources.map((c) => ({
                        filePath: c.filePath,
                        reason: c.reason,
                        score: c.score,
                    }));
                }
            }
            catch {
                // URL invalide ou route introuvable dans l'index.
            }
        }
        const clampedPage = pageState
            ? {
                ...pageState,
                recentConsoleLogs: pageState.recentConsoleLogs.slice(-consoleLogLimit),
            }
            : null;
        const lastIndex = this.repoIndexer.getLastIndex();
        const indexStatus = lastIndex
            ? { built: true, filesIndexed: lastIndex.files.length }
            : { built: false, filesIndexed: 0 };
        return {
            timestamp: new Date().toISOString(),
            indexStatus,
            page: clampedPage,
            consoleErrors,
            runtimeErrors,
            detectedRoute,
            sourceCandidates,
        };
    }
}
exports.DiagnosticsService = DiagnosticsService;
