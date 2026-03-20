---
mode: agent
description: Génère un composant Go-fast v2 depuis une frame Figma "Ready for dev" via Figma MCP
---

# Générer un composant Go-fast depuis Figma

> **⚠️ Prérequis : Figma MCP doit être connecté.**
> Sans connexion Figma MCP active, ce prompt ne peut pas lire les frames Figma.
> Activer le bloc `"figma"` dans `.mcp.json` (voir `docs/figma-integration.md`).

---

## Contexte projet

Go-fast v2 est un starter kit HTML Atomic Design (Vite + Vituum + Twig + SCSS).
Conventions complètes : `GUIDELINES_AI.md`
Tokens design system : `dev/assets/scss/base/_variables.scss`
Correspondances Figma ↔ SCSS : `docs/figma-tokens-convention.md`

## Instructions

**Lien Figma fourni :** ${input:figmaUrl:Coller l'URL de la frame Figma (ex: https://www.figma.com/file/...)}

### 1. Lire la frame Figma

- Extraire `fileId` et `nodeId` depuis l'URL
- Appeler l'outil Figma MCP pour lire le nœud
- Récupérer : nom, annotations de niveau atomique, styles appliqués, structure des enfants

### 2. Déterminer les métadonnées

| Donnée | Source | Règle |
|--------|--------|-------|
| `name` | Nom de la frame | Title Case |
| `slug` | Nom de la frame | kebab-case |
| `level` | Annotation Figma | atom / molecule / organism / template |
| `category` | Page ou annotation Figma | — |
| `description` | Annotation "Description" | Une phrase |

### 3. Mapper les tokens → variables SCSS

Consulter `docs/figma-tokens-convention.md`. Pour chaque couleur, espacement, rayon :
- Trouver la variable `$nom-variable` correspondante
- Ne jamais écrire de valeur hardcodée dans le SCSS

### 4. Lire la config CSS

Lire `gofast.config.json` → champs `scss` et `tailwind`.

### 5. Générer les fichiers

#### `dev/components/[slug]/[slug].json`
Champs obligatoires : `name`, `level`, `category`, `description`
Ajouter `variants` (apparence) et `content` (données) inférés depuis Figma.

#### `dev/components/[slug]/[slug].twig`
- `{% set var = var|default(...) %}` sur toutes les variables
- BEM strict `.block__element--modifier`
- Attributs ARIA selon le type de composant (GUIDELINES_AI.md §7)
- Composition descendante uniquement

#### `dev/assets/scss/components/_[slug].scss` *(si scss: true)*
- `@use '../base/variables' as *;` en tête
- Variables SCSS exclusivement, zéro valeur hardcodée
- `@include focus-ring` sur `:focus-visible`

#### `dev/components/[slug]/[slug].md`
Sections obligatoires : Usage, Props (tableau), Accessibilité, Exemples.
Inclure la référence à la frame Figma d'origine.

### 6. Ajouter l'import SCSS *(si scss: true)*

Dans `dev/assets/scss/style.scss` :
```scss
@use 'components/[slug]';
```

### 7. Vérification

- [ ] Toutes variables Twig → `|default()`
- [ ] JSON → 4 champs obligatoires
- [ ] SCSS → 0 valeur hardcodée
- [ ] ARIA → attributs requis présents
- [ ] Composition → descendante uniquement
- [ ] import SCSS → ajouté dans `style.scss`

### 8. Rapport final

Afficher :
- Fichiers créés
- Nombre de tokens mappés
- Écarts détectés (tokens Figma sans correspondance SCSS)
