# Tasks — Go-fast v2 Améliorations

## Groupe 1 — Fondations [séquentiel]
> Établit les règles sur lesquelles tous les autres groupes s'appuient

- [x] Mettre à jour `GUIDELINES_AI.md` : rendre `[nom].md` obligatoire avec structure imposée (sections : Usage, Props, Accessibilité, Exemples)
- [x] Définir dans `GUIDELINES_AI.md` la convention icônes natives (SVG inline via Twig, nommage, dossier `icons/`, fallback texte)

## Groupe 2 — Composant icône [séquentiel]
> Nécessite que le Groupe 1 soit complet (convention définie)

- [x] Créer l'atom `icon` : `icon.json` + `icon.twig` + `_icon.scss`
- [x] Créer `icon.md` — premier exemple de documentation obligatoire
- [x] Importer `icon` dans `dev/assets/scss/style.scss`

## Groupe 3 — Amélioration showcase app [parallélisable]
> Tâches indépendantes — fichiers distincts dans `app/`

- [x] **Edge cases** : ajouter un mécanisme "stress test" dans le showcase — contrôles de contenu long, contenu vide, overflow (via champ `stress` dans le JSON ou mode dédié)
- [x] **axe-core** : créer un script `test:a11y` dans `package.json` qui lance axe-core sur tous les composants via Puppeteer/Node

## Groupe 4 — Documentation composants existants [parallélisable]
> Nécessite que Groupe 1 soit complet (structure .md définie). Chaque fichier est indépendant.

- [x] Créer `dev/components/button/button.md`
- [x] Créer `dev/components/label/label.md`
- [x] Créer `dev/components/input/input.md`
- [x] Créer `dev/components/badge/badge.md`
- [x] Créer `dev/components/spinner/spinner.md`
- [x] Créer `dev/components/avatar/avatar.md`
- [x] Créer `dev/components/toggle/toggle.md`
- [x] Créer `dev/components/grid/grid.md`
- [x] Créer `dev/components/form-field/form-field.md`
- [x] Créer `dev/components/card/card.md`
- [x] Créer `dev/components/modal/modal.md`
- [x] Créer `dev/components/tabs/tabs.md`
- [x] Créer `dev/components/head-menu/head-menu.md`

## Intégration Figma MCP

### Config
- [x] Ajouter la config Figma MCP dans .mcp.json (commentée, prête à activer)
- [x] Documenter la convention de nommage tokens Figma ↔ _variables.scss

### Commande principale
- [x] Créer /gofast-from-figma pour Claude (.claude/commands/gofast-from-figma.md)
- [x] Créer version Copilot (.github/prompts/gofast-from-figma.prompt.md)
- [x] Créer version Codex (.codex/prompts/gofast-from-figma.md)

### Script de validation
- [x] scripts/validate-figma-tokens.js — vérifie que les tokens Figma mappent avec _variables.scss

### Documentation
- [x] docs/figma-integration.md — guide d'activation et workflow designer → dev
- [x] Mettre à jour README.md avec la section Figma
