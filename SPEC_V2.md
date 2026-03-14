# Go-fast v2 — Spec de refonte

## Contexte

Go-fast est un **starter kit d'intégration HTML** orienté design system en Atomic Design. Son but : permettre à un intégrateur (seul ou en miroir avec un designer) de construire un design system structuré niveau par niveau, avec une vitrine interactive de composants et une intégration native multi-AI.

Ce document est la spec complète pour repartir de zéro sur une archive propre.

---

## Philosophie

- **Atomic Design** — tout composant a un niveau : atom, molecule, organism, template. Les pages sont une catégorie à part avec un comportement showcase différent.
- **SCSS est la base** — toujours présent. Tailwind est un choix activable via config, pas une obligation.
- **JSON = source de vérité** — un seul fichier par composant définit les variantes, les contrôles du showcase, les valeurs par défaut.
- **Séparation app/dev** — le framework showcase (`app/`) ne se mélange jamais avec le projet utilisateur (`dev/`).
- **IA-ready multi-AI** — le projet s'auto-documente pour Claude Code, GitHub Copilot et Codex. Aucun AI ne doit avoir besoin d'explication externe pour créer un composant conforme.
- **Minimalisme des dépendances** — chaque package a une raison d'être explicite.

---

## Stack technique

### Build : Vite + Vituum

Gulp est abandonné. Le build est géré par **Vite** via **Vituum**, conçu spécifiquement pour la génération HTML statique avec moteurs de templates.

- **Vite** — dev server HMR natif, build optimisé
- **Vituum** — layer MPA statique + support moteurs de templates
- **@vituum/vite-plugin-twig** — compilation Twig → HTML dans le pipeline Vite

Gain vs Gulp : pas de pipeline de streams, 1 fichier de config au lieu de 14 tâches, HMR CSS sans rechargement, build de prod optimisé sans config.

### Templates
- **Twig** via `@vituum/vite-plugin-twig`
- Composition : les molecules incluent des atoms via `{% include %}` avec passage de variables

### CSS
- **SCSS** — toujours compilé, pipeline obligatoire
- **Tailwind CSS v4** — optionnel, activé via `gofast.config.json { "tailwind": true }`. Quand désactivé, aucune compilation Tailwind.
- **PostCSS + Autoprefixer** dans les deux cas

### Interface IA
- **Commandes en miroir** — même logique, deux formats synchronisés :
  - `.claude/commands/*.md` → Claude Code (`/commande`)
  - `.github/prompts/*.prompt.md` → GitHub Copilot (`/commande`)
- **`AGENTS.md`** → Codex / OpenAI agents (convention émergente)
- Pas de MCP — tout est interne au projet, les AIs ont déjà accès aux fichiers

### Accessibilité
- **axe-core** — tests WCAG/RGAA dans le showcase

---

## Architecture

```
go-fast/
├── app/                              # Framework showcase (PERMANENT — ne pas modifier)
│   ├── config/
│   │   └── design-tokens.json        # Design tokens de référence
│   ├── scripts/
│   │   ├── showcase.js               # Logique JS : fetch, contrôles, preview
│   │   ├── quality.js                # Tests accessibilité (axe-core)
│   │   └── welcome.js                # Script postinstall
│   ├── styles/
│   │   └── showcase.scss             # Styles du showcase (isolation totale)
│   └── templates/
│       ├── index.twig                # Accueil showcase
│       └── page-showcase.twig        # Vue composant isolé
│
├── dev/                              # Projet utilisateur (remplaçable par projet)
│   ├── components/                   # Tous les composants (atoms, molecules, organisms, templates)
│   │   └── [nom]/
│   │       ├── [nom].twig            # Template Twig
│   │       ├── [nom].json            # Config : level, variants, content
│   │       └── [nom].md             # Documentation (optionnel)
│   ├── pages/                        # Pages (comportement showcase différent)
│   │   └── [nom].twig
│   ├── layouts/                      # Layouts Twig réutilisables
│   │   └── base.twig
│   ├── assets/
│   │   ├── scss/
│   │   │   ├── base/                 # _variables.scss, _mixins.scss, _reset.scss, _typography.scss
│   │   │   ├── components/           # _[nom].scss — un fichier par composant
│   │   │   ├── layout/               # _grid.scss, _containers.scss
│   │   │   ├── pages/                # _[nom].scss — styles spécifiques aux pages
│   │   │   ├── style.scss            # Point d'entrée SCSS (imports manuels)
│   │   │   └── tailwind.css          # Point d'entrée Tailwind (si activé)
│   │   ├── images/
│   │   ├── fonts/
│   │   ├── icons/                    # SVG sources
│   │   └── js/                       # JS projet (minimal, optionnel)
│   └── data/
│       └── showcase.json             # Généré auto — ne pas éditer
│
├── public/                           # Output compilé (gitignore recommandé)
│
├── scripts/                          # Scripts Node utilitaires
│   ├── generate-showcase.js          # Scanne dev/ → génère showcase.json
│   └── reset-project.js             # Remet dev/ à zéro pour nouveau projet
│
├── .claude/
│   └── commands/                     # Skills Claude Code
│       ├── new.md                    # Créer un composant (atom/molecule/organism/template/page)
│       ├── dev.md                    # Démarrer le projet
│       └── add.md                    # Ajouter un composant à un projet existant
│
├── .github/
│   ├── prompts/                      # Skills GitHub Copilot (miroir de .claude/commands/)
│   │   ├── new.prompt.md
│   │   ├── dev.prompt.md
│   │   └── add.prompt.md
│   └── copilot-instructions.md       # Constitution projet pour Copilot
│
├── mcp-server.js                     # SUPPRIMÉ en v2
├── vite.config.js                    # Config Vite + Vituum
├── gofast.config.json                # Config projet
├── AGENTS.md                         # Instructions pour Codex / OpenAI agents
├── CLAUDE.md                         # Instructions Claude Code
├── GUIDELINES_AI.md                  # Document universel — lu par tous les AIs
└── package.json
```

---

## Atomic Design dans Go-fast

### Hiérarchie

| Niveau | `level` JSON | Description |
|--------|-------------|-------------|
| Atom | `"atom"` | Élément UI indivisible — bouton, input, badge, icône, label |
| Molecule | `"molecule"` | Composition d'atoms — champ de formulaire, carte, tag group |
| Organism | `"organism"` | Composition de molecules — header, formulaire complet, nav |
| Template | `"template"` | Structure de page avec zones de contenu, sans contenu réel |
| Page | *(dans `dev/pages/`)* | Instance d'un template avec contenu réel |

### Comportement dans le showcase

- **Atoms, molecules, organisms, templates** → rendu dans `dev/components/`, vue composant isolé avec contrôles interactifs
- **Pages** → rendu dans `dev/pages/`, vue pleine page sans panneau de contrôle

### Composition inter-niveaux

Une molecule inclut des atoms via Twig `{% include %}` avec passage explicite de variables :

```twig
{# form-field.twig — molecule #}
{% set label_text = label|default('Label') %}
{% set input_id = id|default('field') %}

<div class="form-field">
  {% include 'components/label/label.twig' with {
    text: label_text,
    for: input_id,
    required: required|default(false)
  } %}
  {% include 'components/input/input.twig' with {
    id: input_id,
    type: type|default('text'),
    placeholder: placeholder|default(''),
    disabled: disabled|default(false)
  } %}
</div>
```

**Règle** : on ne remonte jamais — un atom n'inclut jamais une molecule. La composition est toujours descendante.

---

## Système de composants

### JSON d'un composant

```json
{
  "name": "Button",
  "level": "atom",
  "category": "Forms",
  "description": "Élément d'action interactif. Base de tout formulaire et CTA.",
  "variants": {
    "variant": {
      "label": "Variante",
      "type": "select",
      "default": "primary",
      "options": ["primary", "secondary", "success", "danger", "warning", "outline"]
    },
    "size": {
      "label": "Taille",
      "type": "select",
      "default": "md",
      "options": ["sm", "md", "lg", "xl"]
    },
    "disabled": {
      "label": "Désactivé",
      "type": "checkbox",
      "default": false
    },
    "fullWidth": {
      "label": "Pleine largeur",
      "type": "checkbox",
      "default": false
    }
  },
  "content": {
    "text": {
      "label": "Texte",
      "type": "text",
      "default": "Cliquez ici"
    }
  }
}
```

**Champs obligatoires** : `name`, `level`, `category`, `description`
**Types de contrôles** : `select`, `checkbox`, `text`, `color`, `number`

### Template Twig

```twig
{# button.twig #}
{% set variant = variant|default('primary') %}
{% set size    = size|default('md') %}
{% set disabled  = disabled|default(false) %}
{% set fullWidth = fullWidth|default(false) %}
{% set text    = text|default('Cliquez ici') %}

<button
  class="btn btn--{{ variant }} btn--{{ size }}{% if fullWidth %} btn--full{% endif %}"
  {% if disabled %}disabled aria-disabled="true"{% endif %}
>
  {{ text }}
</button>
```

**Règles** : `|default()` obligatoire sur chaque variable, BEM strict, accessibilité dès le départ, pas de styles inline.

### SCSS d'un composant

Fichier : `dev/assets/scss/components/_button.scss`

```scss
.btn {
  // base

  &--primary  { /* ... */ }
  &--secondary { /* ... */ }

  &--sm { /* ... */ }
  &--md { /* ... */ }

  &--full { width: 100%; }
}
```

**Import** ajouté manuellement dans `style.scss` — pas d'auto-génération (ordre de cascade fragile).

---

## gofast.config.json

```json
{
  "tailwind": false,
  "projectName": "Mon Projet"
}
```

---

## vite.config.js

```js
import fs from 'fs'
import { defineConfig } from 'vite'
import vituum from 'vituum'
import twig from '@vituum/vite-plugin-twig'
import tailwindcss from '@tailwindcss/vite'

const config = JSON.parse(fs.readFileSync('./gofast.config.json', 'utf8'))

const plugins = [
  vituum(),
  twig({ root: './', data: './dev/data/*.json' }),
]

if (config.tailwind) {
  plugins.push(tailwindcss())
}

export default defineConfig({
  plugins,
  build: { outDir: 'public', emptyOutDir: true },
  server: { port: 3000, open: true }
})
```

---

## Showcase interactif

### Fonctionnement

1. `scripts/generate-showcase.js` scanne `dev/components/` et `dev/pages/` → génère `dev/data/showcase.json`
2. Ce script est déclenché via un plugin Vite custom avant le build et en watch en dev
3. Le JS showcase (`app/scripts/showcase.js`) fetch `showcase.json`, génère les contrôles depuis le JSON composant, et rend le composant
4. Quand un contrôle change → re-render avec les nouvelles variables

### showcase.json (généré)

```json
{
  "components": [
    {
      "id": "button",
      "path": "components/button/button",
      "name": "Button",
      "level": "atom",
      "category": "Forms",
      "description": "...",
      "variants": {},
      "content": {}
    }
  ],
  "pages": [
    {
      "id": "landing",
      "path": "landing",
      "name": "landing"
    }
  ]
}
```

---

## Interface IA — Commandes en miroir

### Principe

Chaque commande existe en deux formats synchronisés. Même logique, références adaptées à chaque outil.

```
.claude/commands/new.md          ←→    .github/prompts/new.prompt.md
.claude/commands/dev.md          ←→    .github/prompts/dev.prompt.md
.claude/commands/add.md          ←→    .github/prompts/add.prompt.md
```

### Commandes Go-fast

| Commande | Rôle |
|----------|------|
| `/new` | Créer un atom, molecule, organism, template ou page. L'IA lit `GUIDELINES_AI.md`, demande le niveau et le nom, génère JSON + Twig + SCSS conformes. |
| `/dev` | Démarrer le projet et implémenter des tâches. |
| `/add` | Ajouter un composant à un projet en cours. |

### Documents IA par outil

| Fichier | Outil | Rôle |
|---------|-------|------|
| `GUIDELINES_AI.md` | Tous | Conventions techniques complètes — le seul document à lire pour créer du bon travail |
| `CLAUDE.md` | Claude Code | Comportements spécifiques, préférences workflow |
| `.github/copilot-instructions.md` | Copilot | Constitution projet pour Copilot |
| `AGENTS.md` | Codex / OpenAI | Instructions pour agents OpenAI |

### Pas de MCP

Le MCP est supprimé. Claude Code a accès direct aux fichiers via ses outils natifs. Copilot et Codex ne supportent pas MCP. La valeur IA-ready vient de `GUIDELINES_AI.md`, pas de l'outillage.

---

## GUIDELINES_AI.md — contenu attendu

Ce document est **le cerveau du projet**. Une IA qui le lit doit pouvoir créer n'importe quel composant sans autre indication. Il doit couvrir :

1. La hiérarchie Atomic Design et ce qu'elle implique dans Go-fast
2. La structure exacte de chaque fichier (JSON, Twig, SCSS) avec exemples complets par niveau
3. Les règles de composition inter-niveaux (`{% include %}` + passage de variables)
4. Les design tokens disponibles (variables SCSS, palette, typographie, espacements)
5. Les conventions de nommage (BEM, kebab-case, préfixes)
6. Les règles d'accessibilité obligatoires par type de composant
7. La procédure complète pour créer un composant de A à Z
8. Les erreurs fréquentes à éviter

---

## Design Tokens

Définis dans `app/config/design-tokens.json`, exposés en variables SCSS dans `dev/assets/scss/base/_variables.scss`.

### Couleurs
```
primary / secondary / success / danger / warning
→ chacune avec DEFAULT, light, dark
gray-50 à gray-900 · white · black
```

### Typographie
```
font-size : xs · sm · base · lg · xl · 2xl · 3xl · 4xl
font-weight : normal(400) · medium(500) · semibold(600) · bold(700)
line-height : tight(1.25) · normal(1.5) · relaxed(1.75)
font-family : base (Inter + fallbacks) · mono
```

### Espacements
```
xs(0.25rem) · sm(0.5rem) · md(1rem) · lg(1.5rem) · xl(2rem) · 2xl(3rem) · 3xl(4rem)
```

### Autres
```
border-radius : sm · md · lg · xl · 2xl · full
shadows       : sm · md · lg · xl
transitions   : fast(150ms) · base(300ms) · slow(500ms)
breakpoints   : sm(640px) · md(768px) · lg(1024px) · xl(1280px) · 2xl(1536px)
z-index       : dropdown · sticky · fixed · modal-backdrop · modal · popover · tooltip
```

---

## Dépendances

### dependencies
```json
{
  "@modelcontextprotocol/sdk": "supprimé"
}
```
Aucune dépendance runtime — le projet est un outil de dev pur.

### devDependencies
```json
{
  "vite": "^6.x",
  "vituum": "^1.x",
  "@vituum/vite-plugin-twig": "^1.x",
  "sass": "^1.x",
  "postcss": "^8.x",
  "autoprefixer": "^10.x",
  "tailwindcss": "^4.x",
  "@tailwindcss/vite": "^4.x",
  "axe-core": "^4.x"
}
```

**Supprimés vs v1 :** tout l'écosystème Gulp (14 packages), browser-sync, del, event-stream, typescript, @types/node, ansi-colors, gulp-jsbeautifier, gulp-concat, gulp4-run-sequence, @modelcontextprotocol/sdk.

---

## Scripts npm

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "reset": "node scripts/reset-project.js",
    "postinstall": "node app/scripts/welcome.js || true"
  }
}
```

---

## Conventions

### Nommage
- Composants : `kebab-case`
- Classes CSS : BEM — `.block__element--modifier`
- Variables SCSS : `$categorie-nom` (`$color-primary`, `$spacing-md`)
- Fichiers Twig : `kebab-case.twig`
- Fichiers SCSS : `_kebab-case.scss`

### SCSS
- Mobile first (`min-width`)
- Variables design system obligatoires — pas de valeurs hardcodées
- Pas de `!important` sauf exception documentée
- Pas de sélecteurs d'éléments HTML nus dans les composants
- Imports **manuels** dans `style.scss`

### Twig
- `|default()` obligatoire sur chaque variable
- Pas de logique métier — uniquement de l'affichage
- Composition toujours descendante (atom → molecule → organism)

---

## Ce que le framework ne fait pas

- Pas de framework frontend (React, Vue…)
- Pas de gestion de state
- Pas de routing
- Pas de SSR
- Pas de base de données

Go-fast est un **outil d'intégration HTML statique**.

---

## Roadmap v2

- [ ] Structure `app/` + `dev/` propre
- [ ] `vite.config.js` avec Vituum + Twig + Tailwind conditionnel
- [ ] `scripts/generate-showcase.js`
- [ ] Pipeline CSS : SCSS obligatoire, Tailwind conditionnel
- [ ] Showcase interactif (index + vue composant isolé)
- [ ] `GUIDELINES_AI.md` complet (le document central)
- [ ] Commandes en miroir : `/new`, `/dev`, `/add` (`.claude/commands/` + `.github/prompts/`)
- [ ] `CLAUDE.md` + `.github/copilot-instructions.md` + `AGENTS.md`
- [ ] 3 composants de démo : `button` (atom), `form-field` (molecule), `card` (molecule)
- [ ] Design tokens en variables SCSS
- [ ] `scripts/reset-project.js`
- [ ] README utilisateur
