# gofast-from-figma — Générer un composant Go-fast depuis Figma

> **⚠️ Prérequis : Figma MCP doit être connecté.**
> Sans connexion Figma MCP, ce prompt ne peut pas accéder aux données de la frame.
> Configurer `.mcp.json` avec la clé API Figma (voir `docs/figma-integration.md`).

---

## Objectif

À partir d'une frame Figma annotée "Ready for dev", générer les 4 fichiers d'un composant Go-fast v2 complet et conforme à toutes les conventions du projet.

## Usage

```
Lien Figma : https://www.figma.com/file/[fileId]/...?node-id=[nodeId]
```

---

## Processus complet

### 1. Lire la frame Figma via MCP

Extraire de l'URL : `fileId` et `nodeId`.

Appeler l'outil Figma MCP (`figma.get_node` ou équivalent) pour obtenir :
- Nom de la frame
- Annotations "Ready for dev" (level, description, catégorie)
- Styles appliqués (couleurs, typo, espacements, rayons)
- Structure des layers enfants (inférer les props et variantes)

### 2. Déterminer les métadonnées

```
name        → Nom de la frame en Title Case
slug        → Nom de la frame en kebab-case
level       → "atom" | "molecule" | "organism" | "template"
             (depuis annotation ou préfixe du nom de frame)
category    → Depuis la page Figma ou annotation (ex: Forms, Layout, Navigation)
description → Depuis annotation ou résumé en une phrase
```

### 3. Mapper les styles Figma → tokens SCSS

Référence : `docs/figma-tokens-convention.md`

Règle de transformation : `color/primary/base` → `$color-primary`

Exemples clés :
- `#2563eb` → `$color-primary`
- `16px` padding → `$spacing-md`
- `6px` radius → `$radius-md`
- `600` font-weight → `$font-weight-semibold`

### 4. Lire la stratégie CSS

```json
// gofast.config.json
{ "scss": true, "tailwind": false }
```

- `scss: true` → créer `_[slug].scss` + ajouter import dans `style.scss`
- `tailwind: true` → classes utilitaires dans le Twig (pas de SCSS custom)

### 5. Fichier JSON — `dev/components/[slug]/[slug].json`

Champs obligatoires : `name`, `level`, `category`, `description`

```json
{
  "name": "[Name]",
  "level": "[level]",
  "category": "[Category]",
  "description": "[Description]",
  "variants": {
    "[variantName]": {
      "label": "[Label]",
      "type": "select",
      "default": "[default]",
      "options": ["[opt1]", "[opt2]"]
    }
  },
  "content": {
    "[contentName]": {
      "label": "[Label]",
      "type": "text",
      "default": "[default]"
    }
  }
}
```

### 6. Fichier Twig — `dev/components/[slug]/[slug].twig`

Règles absolues :
- `{% set var = var|default('...') %}` sur **chaque** variable exposée
- Classes BEM : `.block`, `.block__element`, `.block--modifier`
- Attributs ARIA selon GUIDELINES_AI.md §7
- Composition descendante (atom → molecule → organism)
- Inclure les atoms existants via `{% include '...' with { ... } %}`

### 7. Fichier SCSS — `dev/assets/scss/components/_[slug].scss` *(scss: true)*

```scss
@use '../base/variables' as *;
// @use '../base/mixins' as *;  // si mixins utilisés

.[block] {
  // styles de base via $variables uniquement

  &__[element] { }

  &--[modifier] { }

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

Ajouter dans `dev/assets/scss/style.scss` :
```scss
@use 'components/[slug]';
```

### 8. Fichier documentation — `dev/components/[slug]/[slug].md`

```markdown
# [Name]

> Généré depuis Figma — [URL de la frame]

## Usage
[Quand et pourquoi utiliser ce composant.]

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `prop` | `string` | `'valeur'` | Description |

## Accessibilité
[Attributs ARIA, comportement clavier, points d'attention.]

## Exemples

### Exemple de base
\`\`\`twig
{% include 'dev/components/[slug]/[slug].twig' with {
  prop: 'valeur'
} %}
\`\`\`
```

### 9. Checklist finale

- [ ] Toutes variables Twig ont un `|default()`
- [ ] JSON : 4 champs obligatoires présents
- [ ] SCSS : zéro valeur hardcodée
- [ ] ARIA : attributs requis selon le type
- [ ] Composition : descendante uniquement
- [ ] Import SCSS ajouté dans `style.scss`
- [ ] `.md` : sections Usage + Props + Accessibilité + Exemples

### 10. Rapport

```
Composant généré : [name] ([level])
Fichiers créés :
  dev/components/[slug]/[slug].json
  dev/components/[slug]/[slug].twig
  dev/components/[slug]/[slug].md
  dev/assets/scss/components/_[slug].scss

Tokens mappés : [N] / [total]
Écarts : [liste des tokens sans correspondance SCSS]
```
