# Tasks — Go-fast v2

## Groupe 1 — Config & build [séquentiel]
- [x] `package.json` + `gofast.config.json` + `.gitignore` mis à jour
- [x] `vite.config.js` (Vituum + Twig + Tailwind conditionnel + plugin generate-showcase)
- [x] `postcss.config.js` (Autoprefixer)

## Groupe 2 — Squelette app/ + scripts/ [parallélisable]
> Tâches indépendantes — seront traitées simultanément par plusieurs agents
- [x] `app/config/design-tokens.json` + structure dossiers `app/`
- [x] `scripts/generate-showcase.js` (scan dev/ → showcase.json)
- [x] `scripts/reset-project.js` + `app/scripts/welcome.js`

## Groupe 3 — Squelette dev/ base [parallélisable avec groupe 2]
> Indépendant de app/ et scripts/
- [x] `dev/assets/scss/base/` — `_variables.scss`, `_reset.scss`, `_mixins.scss`, `_typography.scss`, `style.scss`
- [x] `dev/layouts/base.twig` + structure `dev/data/`

## Groupe 4 — Showcase interactif [séquentiel]
> Nécessite que groupes 2 et 3 soient complets
- [x] `app/templates/index.twig` + `page-showcase.twig`
- [x] `app/scripts/showcase.js` (fetch JSON, contrôles, re-render)
- [x] `app/styles/showcase.scss` (isolation totale du framework)
- [x] `app/scripts/quality.js` (axe-core)

## Groupe 5 — Composants démo [parallélisable]
> Tâches indépendantes — seront traitées simultanément par plusieurs agents
- [x] `button` (atom) — JSON + Twig + SCSS
- [x] `card` (molecule) — JSON + Twig + SCSS
- [x] `form-field` (molecule) — JSON + Twig + SCSS (inclut atoms `label` + `input`)

## Groupe 6 — Docs IA [parallélisable]
> Tâches indépendantes — seront traitées simultanément par plusieurs agents
- [x] `GUIDELINES_AI.md` — document central (hiérarchie, exemples, règles)
- [x] `.claude/commands/` — `new.md`, `dev.md`, `add.md`
- [x] `.github/prompts/` (miroir) + `AGENTS.md` + mise à jour `CLAUDE.md`

## Groupe 7 — Finition [séquentiel]
> Nécessite que tous les groupes précédents soient complets
- [x] `README.md` utilisateur
