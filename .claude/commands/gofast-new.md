# /new — Créer un composant Go-fast

Tu vas créer un nouveau composant pour ce projet Go-fast v2.

## Étape 1 — Lis GUIDELINES_AI.md

Lis le fichier `GUIDELINES_AI.md` à la racine du projet. Il contient toutes les conventions, règles et exemples. Tu dois les respecter intégralement.

## Étape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Niveau** : atom / molecule / organism / template / page
2. **Nom** : en kebab-case (ex: `navigation-bar`, `hero-section`)
3. **Catégorie** : Forms / Layout / Navigation / Feedback / Typography / Media / ou autre
4. **Description** : une phrase décrivant le rôle du composant

## Étape 3 — Lis la stratégie CSS du projet

Lis `gofast.config.json` à la racine. Les champs `scss` et `tailwind` déterminent les fichiers à créer :

| `scss` | `tailwind` | Stratégie |
|--------|------------|-----------|
| `true` | `false`    | SCSS seul |
| `false`| `true`     | Tailwind seul |
| `true` | `true`     | SCSS + Tailwind |

## Étape 4 — Crée les fichiers

Pour un composant (atom/molecule/organism/template) :

### `dev/components/[nom]/[nom].json`
- Champs obligatoires : `name`, `level`, `category`, `description`
- `variants` : contrôles d'apparence (select, checkbox)
- `content` : contrôles de données (text, number, color)
- Propose des variantes pertinentes selon le niveau et le type

### `dev/components/[nom]/[nom].twig`
- `{% set var = var|default(...) %}` pour TOUTES les variables
- Attributs ARIA selon le type (voir GUIDELINES_AI.md §7)
- Pour une molecule/organism : inclure les sous-composants via `{% include '...' with { ... } %}`
- **Si SCSS (seul ou hybride)** : classes BEM strictes — `.block__element--modifier`
- **Si Tailwind seul** : classes utilitaires Tailwind directement dans le HTML, pas de classes BEM custom

### `dev/assets/scss/components/_[nom].scss` — **uniquement si `scss: true`**
- `@use '../base/variables' as *;` en tête
- Variables design system exclusivement — zéro valeur hardcodée
- `:focus-visible` avec `@include focus-ring`
- États `:disabled` si applicable

### Import dans `dev/assets/scss/style.scss` — **uniquement si `scss: true`**
```scss
@use 'components/[nom]';
```

Pour une **page** (`dev/pages/[nom].twig`) :
- Étend `dev/layouts/base.twig`
- Contenu réel (pas de zones vides)
- Pas de JSON associé

## Étape 5 — Vérifie

Avant de livrer, vérifie mentalement :
- [ ] Toutes les variables Twig ont un `|default()`
- [ ] Le JSON a les 4 champs obligatoires
- [ ] Les attributs ARIA requis sont présents
- [ ] La composition est descendante (pas d'atom qui inclut une molecule)
- [ ] **Si SCSS** : toutes les valeurs CSS utilisent les variables SCSS du design system
- [ ] **Si SCSS** : l'import est ajouté dans `style.scss`
- [ ] **Si Tailwind seul** : aucun fichier SCSS créé, classes utilitaires uniquement
