---
mode: agent
description: Créer un nouveau composant Go-fast (atom / molecule / organism / template / page)
---

# Créer un composant Go-fast

Tu vas créer un nouveau composant pour ce projet Go-fast v2.

## Étape 1 — Lis GUIDELINES_AI.md

Lis le fichier `GUIDELINES_AI.md` à la racine du projet. Il contient toutes les conventions, règles et exemples. Tu dois les respecter intégralement.

## Étape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Niveau** : atom / molecule / organism / template / page
2. **Nom** : en kebab-case (ex: `navigation-bar`, `hero-section`)
3. **Catégorie** : Forms / Layout / Navigation / Feedback / Typography / Media / ou autre
4. **Description** : une phrase décrivant le rôle du composant

## Étape 3 — Crée les fichiers

### `dev/components/[nom]/[nom].json`
- Champs obligatoires : `name`, `level`, `category`, `description`
- `variants` : contrôles d'apparence (select, checkbox)
- `content` : contrôles de données (text, number, color)

### `dev/components/[nom]/[nom].twig`
- `{% set var = var|default(...) %}` pour TOUTES les variables
- BEM strict — `.block__element--modifier`
- Pour molecule/organism : inclure les atoms via `{% include '...' with { ... } %}`
- Attributs ARIA selon le type

### `dev/assets/scss/components/_[nom].scss`
- `@use '../base/variables' as *;` en tête
- Variables design system exclusivement — zéro valeur hardcodée
- `:focus-visible` avec les mixins disponibles

### Ajouter dans `dev/assets/scss/style.scss`
```scss
@use 'components/[nom]';
```

## Étape 4 — Vérifie

- [ ] Toutes les variables Twig ont un `|default()`
- [ ] Toutes les valeurs CSS utilisent les variables SCSS
- [ ] Les attributs ARIA requis sont présents
- [ ] Le JSON a les 4 champs obligatoires
- [ ] L'import est ajouté dans `style.scss`
- [ ] La composition est descendante (pas d'atom qui inclut une molecule)
