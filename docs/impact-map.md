# Impact Map — Go-fast v2

> Si tu modifies **X**, vérifie et mets à jour **Y**.

---

## Commandes IA `.claude/commands/*.md`

**Impacts directs :**
- `.github/prompts/[nom].prompt.md` → version Copilot de la commande modifiée
- `.codex/prompts/[nom].prompt.md` → version Codex de la commande modifiée
- `.claude/README.md` → si une commande est ajoutée, retirée ou renommée
- `README.md` → section "Commandes IA" si ajout/suppression de commande

**Action à faire après toute modification d'une commande :**
```bash
npm run setup-agentic -- --tool copilot   # si .github/ est actif
npm run setup-agentic -- --tool codex     # si .codex/ est actif
```

**Cas particuliers :**
- `add-tool.md` → vérifie que la checklist reflète les dossiers réellement présents (`.github/prompts/`, `.codex/prompts/`)
- Toute commande qui crée des composants → doit référencer `GUIDELINES_AI.md`

---

## `CLAUDE.md`

**Impacts directs :**
- `.github/copilot-instructions.md` → généré depuis `CLAUDE.md` via `setup-agentic` — à resynchroniser
- `AGENTS.md` → idem pour Codex
- `.github/prompts/*.prompt.md` → les commandes générées embarquent le contexte de constitution
- `.codex/prompts/*.prompt.md` → idem

**Action à faire après toute modification de `CLAUDE.md` :**
```bash
npm run setup-agentic -- --tool copilot   # si .github/ est actif
npm run setup-agentic -- --tool codex     # si .codex/ est actif
```

---

## `GUIDELINES_AI.md`

**Impacts directs :**
- `CLAUDE.md` → le pointe comme source de vérité (pas de contenu à dupliquer, juste vérifier que le lien est correct)
- `.github/copilot-instructions.md` → le pointe aussi
- Toutes les commandes qui lisent `GUIDELINES_AI.md` : `gofast-new`, `gofast-edit`, `gofast-audit`, `gofast-move`, `gofast-from-figma`

**Si tu modifies les variables SCSS disponibles (section 6) :**
- `dev/assets/scss/base/_variables.scss` → doit rester synchronisé

**Si tu modifies les mixins disponibles (section 6) :**
- `dev/assets/scss/base/_mixins.scss` → doit rester synchronisé

---

## `scripts/setup-agentic.js`

**Impacts directs :**
- `README.md` → section "Support multi-IA" documente son usage
- `.claude/README.md` → documente la commande de sync

---

## `package.json` (scripts)

**Impacts directs :**
- `README.md` → section "Commandes" liste les scripts npm exposés

---

## `.mcp.json`

**Impacts directs :**
- `CLAUDE.md` → section "MCP Orbit" doit refléter les outils disponibles

---

## `orbit/tools/*.ts` (nouveaux outils ajoutés)

**Impacts directs :**
- `orbit/` → rebuild requis : `cd orbit && npm run build`
- `CLAUDE.md` → section "MCP Orbit", tableau "Quand utiliser orbit"

---

## `dev/assets/scss/base/_variables.scss`

**Impacts directs :**
- `GUIDELINES_AI.md` → section 6 "Variables SCSS disponibles"

## `dev/assets/scss/base/_mixins.scss`

**Impacts directs :**
- `GUIDELINES_AI.md` → section 6 "Mixins disponibles"

---

## `gofast.config.json`

**Impacts directs :**
- Commandes qui le lisent : `gofast-new`, `gofast-from-figma`, `gofast-init`
- `vite.config.js` → peut dépendre de la stratégie CSS choisie

---

## Structure des dossiers (ajout/suppression de dossier racine)

**Impacts directs :**
- `README.md` → section "Structure"
- `CLAUDE.md` → si le dossier est lié à l'IA (ex: `orbit/`, `.claude/`)

---

## Nouveau composant créé dans `dev/components/`

**Automatique (pas d'action) :**
- `dev/data/showcase.json` → régénéré par `generate-showcase.js`

**Manuel obligatoire :**
- `dev/assets/scss/style.scss` → ajouter `@use 'components/[nom]';`

---

## `docs/figma-tokens-convention.md`

**Impacts directs :**
- `gofast-from-figma.md` → le référence à l'étape de mapping des tokens

---

## `docs/impact-map.md` (ce fichier)

**Impacts directs :**
- `CLAUDE.md` → si le nom ou l'emplacement du fichier change
