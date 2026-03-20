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

## Groupe 5 — Améliorations starter kit [parallélisable]
> Session 2026-03-20 — outillage, qualité, commandes

### Commandes manquantes
- [ ] gofast-rename : renommer un composant (dossier, fichiers, imports SCSS, références JSON)
- [ ] gofast-move : changer le niveau atomique d'un composant (ex: atom → molecule)
- [ ] gofast-list : lister tous les composants avec niveau et statut (complet/incomplet/vide)
- [ ] gofast-audit : vérifier la conformité des composants (|default(), BEM, .md présent, import SCSS, JSON valide)

### Scripts
- [x] Watch automatique icônes : déjà implémenté dans vite.config.js — watch `add` + `change` sur `dev/assets/icons/unitaires/*.svg`
- [x] Validation JSON schema : scripts/validate-json.js + intégration vite.config.js + npm run validate
- [x] gofast-list en script npm aussi : scripts/list-components.js + npm run list
- [x] npm run upgrade : scripts/upgrade-app.js — met à jour app/ via git sparse-checkout sans toucher dev/

### Qualité
- [x] Stylelint pour le SCSS : .stylelintrc.json + stylelint-config-standard-scss + npm run lint:scss
- [x] Guard dans gofast-new pour détecter un projet non initialisé (vérifie dev/components/ + gofast.config.json)

### Init
- [x] Créer commande Claude `/gofast-init` dédiée au scaffolding (wraps scripts/init-project.js) + versions Copilot + Codex
