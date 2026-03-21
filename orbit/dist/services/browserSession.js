"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserSessionService = void 0;
const playwright_1 = require("playwright");
class BrowserSessionService {
    maxConsoleLogs;
    nextTabId = 1;
    state = {
        browser: null,
        context: null,
        tabs: new Map(),
        activeTabId: null,
    };
    constructor(options) {
        this.maxConsoleLogs = options?.maxConsoleLogs ?? 200;
    }
    isReady() {
        return this.state.activeTabId !== null;
    }
    // ── Tab management ────────────────────────────────────────────────────────
    async newTab(url, waitUntil = "load") {
        const context = await this.ensureContext();
        const page = await context.newPage();
        const id = `tab_${this.nextTabId++}`;
        const tab = { id, page, consoleLogs: [], navigationHistory: [] };
        this.attachPageListeners(tab);
        this.state.tabs.set(id, tab);
        this.state.activeTabId = id;
        if (url) {
            await page.goto(url, { waitUntil, timeout: 30_000 });
        }
        return this.toTabSnapshotAsync(tab);
    }
    async switchTab(tabId) {
        const tab = this.state.tabs.get(tabId);
        if (!tab) {
            throw new Error(`Onglet introuvable: ${tabId}`);
        }
        this.state.activeTabId = tabId;
        return this.toTabSnapshotAsync(tab);
    }
    async listTabs() {
        const snapshots = [];
        for (const tab of this.state.tabs.values()) {
            snapshots.push(await this.toTabSnapshotAsync(tab));
        }
        return snapshots;
    }
    async closeTab(tabId) {
        const id = tabId ?? this.state.activeTabId;
        if (!id) {
            throw new Error("Aucun onglet ouvert.");
        }
        const tab = this.state.tabs.get(id);
        if (!tab) {
            throw new Error(`Onglet introuvable: ${id}`);
        }
        await tab.page.close().catch(() => undefined);
        this.state.tabs.delete(id);
        if (this.state.activeTabId === id) {
            const remaining = [...this.state.tabs.keys()];
            this.state.activeTabId = remaining[remaining.length - 1] ?? null;
        }
    }
    // ── Active tab operations ─────────────────────────────────────────────────
    getNavigationHistory() {
        const tab = this.activeTab();
        return tab ? [...tab.navigationHistory] : [];
    }
    async open(url, waitUntil = "load") {
        let tab = this.activeTab();
        if (!tab) {
            await this.newTab();
            tab = this.activeTab();
        }
        const currentUrl = tab.page.url();
        if (currentUrl && currentUrl !== "about:blank") {
            tab.navigationHistory.push(currentUrl);
            if (tab.navigationHistory.length > 10) {
                tab.navigationHistory.shift();
            }
        }
        await tab.page.goto(url, { waitUntil, timeout: 30_000 });
        return {
            tabId: tab.id,
            url: tab.page.url(),
            title: await tab.page.title(),
        };
    }
    async executeJs(expression) {
        const page = await this.ensureActivePage();
        const result = await page.evaluate((expr) => {
            // Risque : eval() exécute du code arbitraire dans le contexte de la page.
            // Usage limité à un navigateur local contrôlé — ne jamais exposer à une entrée non fiable.
            // eslint-disable-next-line no-eval
            return eval(expr);
        }, expression);
        return { expression, result };
    }
    async screenshot(outputPath, fullPage = true) {
        const page = await this.ensureActivePage();
        await page.screenshot({ path: outputPath, fullPage });
        return { outputPath, currentUrl: page.url() };
    }
    async getPageState() {
        const tab = this.activeTab();
        if (!tab) {
            return null;
        }
        const page = tab.page;
        const url = page.url();
        const title = await page.title().catch(() => "");
        let visibleText = "";
        let interactiveElements = [];
        try {
            const domData = await page.evaluate(() => {
                const bodyText = (document.body?.innerText ?? "").trim().slice(0, 3000);
                const selectors = 'button, a[href], input, select, textarea, [role="button"], [role="link"]';
                const interactives = Array.from(document.querySelectorAll(selectors))
                    .slice(0, 50)
                    .map((el) => ({
                    tag: el.tagName.toLowerCase(),
                    text: (el.textContent ?? "").trim().slice(0, 100),
                    type: el.type || null,
                    href: el.href || null,
                }));
                return { bodyText, interactives };
            });
            visibleText = domData.bodyText;
            interactiveElements = domData.interactives;
        }
        catch {
            // Page en cours de navigation ou contexte non disponible.
        }
        return {
            url,
            title,
            visibleText,
            interactiveElements,
            recentConsoleLogs: [...tab.consoleLogs].slice(-20),
        };
    }
    readConsoleLogs(limit, clearAfterRead) {
        const tab = this.activeTab();
        const logs = tab
            ? typeof limit === "number"
                ? tab.consoleLogs.slice(-limit)
                : [...tab.consoleLogs]
            : [];
        if (clearAfterRead && tab) {
            tab.consoleLogs.length = 0;
        }
        return { count: logs.length, logs };
    }
    async close() {
        for (const tab of this.state.tabs.values()) {
            await tab.page.close().catch(() => undefined);
        }
        this.state.tabs.clear();
        this.state.activeTabId = null;
        if (this.state.context) {
            await this.state.context.close().catch(() => undefined);
            this.state.context = null;
        }
        if (this.state.browser) {
            await this.state.browser.close().catch(() => undefined);
            this.state.browser = null;
        }
    }
    // ── Private helpers ───────────────────────────────────────────────────────
    activeTab() {
        if (!this.state.activeTabId)
            return null;
        return this.state.tabs.get(this.state.activeTabId) ?? null;
    }
    async ensureActivePage() {
        const tab = this.activeTab();
        if (tab)
            return tab.page;
        await this.newTab();
        return this.activeTab().page;
    }
    async ensureContext() {
        if (!this.state.browser) {
            this.state.browser = await playwright_1.chromium.launch({ headless: true });
        }
        if (!this.state.context) {
            this.state.context = await this.state.browser.newContext({
                viewport: { width: 1440, height: 900 },
            });
        }
        return this.state.context;
    }
    attachPageListeners(tab) {
        tab.page.on("console", (message) => {
            this.pushConsoleLog(tab, `[${message.type()}] ${message.text()}`);
        });
        tab.page.on("pageerror", (error) => {
            this.pushConsoleLog(tab, `[pageerror] ${error.message}`);
        });
    }
    pushConsoleLog(tab, entry) {
        tab.consoleLogs.push(entry);
        if (tab.consoleLogs.length > this.maxConsoleLogs) {
            tab.consoleLogs.shift();
        }
    }
    async toTabSnapshotAsync(tab) {
        return {
            id: tab.id,
            url: tab.page.url(),
            title: await tab.page.title().catch(() => ""),
            active: tab.id === this.state.activeTabId,
        };
    }
}
exports.BrowserSessionService = BrowserSessionService;
