# /new — Creer un composant Go-fast

Tu vas creer un nouveau composant pour ce projet Go-fast v2.

## Etape 1 — Lis les references

Lis ces fichiers avant de faire quoi que ce soit :
- `AGENTS.md`
- `GUIDELINES_AI.md`

Tu dois respecter integralement leurs conventions.

## Etape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas precise, demande :
1. **Niveau** : atom / molecule / organism / template / page
2. **Nom** : en kebab-case (ex: `navigation-bar`, `hero-section`)
3. **Categorie** : Forms / Layout / Navigation / Feedback / Typography / Media / ou autre
4. **Description** : une phrase decrivant le role du composant

## Etape 3 — Cree les fichiers

Pour un composant (`atom`, `molecule`, `organism`, `template`) :

### `dev/components/[nom]/[nom].json`
- Champs obligatoires : `name`, `level`, `category`, `description`
- `variants` : controles d'apparence
- `content` : controles de contenu
- Propose des variantes pertinentes selon le niveau et le type

### `dev/components/[nom]/[nom].twig`
- `{% set var = var|default(...) %}` obligatoire pour toutes les variables exposees
- BEM strict
- `include` explicites avec `with { ... }`
- Accessibilite integree des la conception

### `dev/assets/scss/components/_[nom].scss`
- `@use '../base/variables' as *;` en tete
- Variables design system uniquement
- `@include focus-ring` sur `:focus-visible` si pertinent
- Etats `disabled` si applicable

### `dev/assets/scss/style.scss`
- Ajouter l'import manuel :
```scss
@use 'components/[nom]';
```

Pour une **page** :
- creer `dev/pages/[nom].twig`
- creer `dev/pages/[nom].json` pour exposer les variables dans le showcase
- etendre `../layouts/base.twig`
- utiliser `|default()` sur toutes les variables exposees
- produire du contenu reel, pas une coquille vide

## Etape 4 — Verifie avant de livrer

- [ ] Toutes les variables Twig ont un `|default()`
- [ ] Toutes les valeurs SCSS viennent du design system
- [ ] Les attributs ARIA utiles sont presents
- [ ] Le JSON contient bien les metadonnees minimales
- [ ] L'import SCSS est ajoute dans `style.scss`
- [ ] La composition reste descendante

## Regle d'execution

Ne te limite pas a expliquer quoi faire : cree reellement les fichiers et branche-les dans le projet.
