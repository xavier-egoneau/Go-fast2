# GUIDELINES_AI.md — Go-fast v2

> Document universel. Toute IA qui lit ce fichier peut créer un composant conforme sans autre explication.

---

## 1. Hiérarchie Atomic Design

| Niveau | `level` JSON | Emplacement | Description |
|--------|-------------|-------------|-------------|
| **Atom** | `"atom"` | `dev/components/[nom]/` | Élément UI indivisible — bouton, input, badge, icône, label |
| **Molecule** | `"molecule"` | `dev/components/[nom]/` | Composition d'atoms — champ de formulaire, carte, tag group |
| **Organism** | `"organism"` | `dev/components/[nom]/` | Composition de molecules — header, formulaire complet, nav |
| **Template** | `"template"` | `dev/components/[nom]/` | Structure de page avec zones de contenu, sans contenu réel |
| **Page** | *(pas de level)* | `dev/pages/` | Instance d'un template avec contenu réel. JSON optionnel pour exposer des contrôles dans le showcase. |

**Règle fondamentale** : la composition est toujours **descendante**. Un atom n'inclut jamais une molecule. Un organism n'inclut jamais un template.

---

## 2. Structure d'un composant

Chaque composant `[nom]` (kebab-case) est un dossier dans `dev/components/` :

```
dev/components/[nom]/
├── [nom].json   ← Source de vérité : métadonnées + contrôles du showcase
├── [nom].twig   ← Template de rendu
└── [nom].md     ← Documentation (obligatoire)
```

**Structure imposée pour `[nom].md` :**

```markdown
# [Nom du composant]

## Usage
[Quand et pourquoi utiliser ce composant. Cas d'usage typiques.]

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `prop` | `string` | `'valeur'` | Description de la prop |

## Accessibilité
[Attributs ARIA utilisés, comportement clavier, points d'attention.]

## Exemples

### Exemple de base
\`\`\`twig
{% include 'dev/components/[nom]/[nom].twig' with {
  prop: 'valeur'
} %}
\`\`\`

### Variante [nom]
\`\`\`twig
{% include 'dev/components/[nom]/[nom].twig' with {
  variant: 'nom-variante'
} %}
\`\`\`
```

Et un fichier SCSS dans :
```
dev/assets/scss/components/_[nom].scss
```

À importer **manuellement** dans `dev/assets/scss/style.scss`.

---

## 3. JSON d'un composant — structure complète

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
      "options": ["primary", "secondary", "outline"]
    },
    "disabled": {
      "label": "Désactivé",
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

**Types de contrôles disponibles** :
- `select` → `{ type, label, default, options: [] }`
- `checkbox` → `{ type, label, default: boolean }`
- `text` → `{ type, label, default: string }`
- `color` → `{ type, label, default: "#hexcode" }`
- `number` → `{ type, label, default: number }`

**`variants`** = contrôles qui modifient l'apparence (classes CSS, états)
**`content`** = contrôles qui modifient le contenu textuel ou les données

---

## 4. Template Twig — règles

### Règles absolues
- `|default()` **obligatoire** sur chaque variable exposée
- Pas de logique métier — uniquement de l'affichage
- BEM strict pour les classes : `.block__element--modifier`
- Pas de styles inline
- Accessibilité intégrée dès la conception

### Exemple — atom (button)

```twig
{% set variant  = variant|default('primary') %}
{% set size     = size|default('md') %}
{% set disabled = disabled|default(false) %}
{% set text     = text|default('Cliquez ici') %}

<button
  class="btn btn--{{ variant }} btn--{{ size }}"
  {% if disabled %}disabled aria-disabled="true"{% endif %}
  type="button"
>
  {{ text }}
</button>
```

### Exemple — molecule (composition d'atoms)

```twig
{% set label_text  = label|default('Label') %}
{% set input_id    = id|default('field') %}
{% set required    = required|default(false) %}
{% set hasError    = hasError|default(false) %}

<div class="form-field{% if hasError %} form-field--error{% endif %}">
  {% include 'dev/components/label/label.twig' with {
    text: label_text,
    for: input_id,
    required: required
  } %}

  {% include 'dev/components/input/input.twig' with {
    id: input_id,
    hasError: hasError
  } %}
</div>
```

**Règle include** : toujours passer les variables explicitement via `with { ... }`. Ne jamais compter sur l'héritage de contexte implicite.

---

## 5. SCSS d'un composant — règles

```scss
// _button.scss
@use '../base/variables' as *;
@use '../base/mixins' as *;   // si des mixins sont utilisés

.btn {
  // styles de base

  &--primary  { /* variante */ }
  &--sm       { /* taille */ }
  &--full     { width: 100%; }

  &:focus-visible {
    @include focus-ring;  // accessibilité obligatoire
  }

  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
```

**Règles** :
- `@use '../base/variables' as *;` en tête de chaque fichier composant
- Variables design system obligatoires — **zéro valeur hardcodée**
- Pas de `!important`
- Pas de sélecteurs d'éléments HTML nus dans les composants (`.btn` oui, `button` non)
- Mobile first (`min-width` dans les media queries)
- Importer manuellement dans `style.scss` — pas d'auto-import

---

## 6. Variables SCSS disponibles

### Couleurs
```scss
$color-primary / $color-primary-light / $color-primary-dark
$color-secondary / $color-secondary-light / $color-secondary-dark
$color-success / $color-success-light / $color-success-dark
$color-danger / $color-danger-light / $color-danger-dark
$color-warning / $color-warning-light / $color-warning-dark
$color-gray-50 … $color-gray-900
$color-white / $color-black
```

### Typographie
```scss
$font-size-xs / sm / base / lg / xl / 2xl / 3xl / 4xl
$font-weight-normal(400) / medium(500) / semibold(600) / bold(700)
$line-height-tight(1.25) / normal(1.5) / relaxed(1.75)
$font-family-base / $font-family-mono
```

### Espacements
```scss
$spacing-xs(0.25rem) / sm(0.5rem) / md(1rem) / lg(1.5rem)
$spacing-xl(2rem) / 2xl(3rem) / 3xl(4rem)
```

### Autres
```scss
$radius-sm / md / lg / xl / 2xl / full
$shadow-sm / md / lg / xl
$transition-fast(150ms) / base(300ms) / slow(500ms)
$breakpoint-sm(640px) / md(768px) / lg(1024px) / xl(1280px) / 2xl(1536px)
$z-dropdown / sticky / fixed / modal-backdrop / modal / popover / tooltip
```

### Mixins disponibles
```scss
@include respond-to('md')    // media query mobile-first
@include flex-center         // display flex + center
@include flex-between        // display flex + space-between
@include truncate            // overflow ellipsis
@include visually-hidden     // masquer visuellement, garder accessible
@include focus-ring          // outline focus accessible
```

---

## 7. Accessibilité — règles par type

### Tous les composants
- `focus-visible` stylé (utiliser `@include focus-ring`)
- Pas de `outline: none` sans alternative visible
- Contrastes WCAG AA minimum (ratio 4.5:1 pour le texte)

### Boutons
- `type="button"` explicite (évite soumission de formulaire accidentelle)
- `disabled` + `aria-disabled="true"` si désactivé

### Formulaires (inputs, selects)
- `<label>` associé via `for` + `id` correspondant
- `aria-invalid="true"` si erreur
- `aria-describedby` pointant vers le message d'erreur si présent
- `role="alert"` sur les messages d'erreur

### Images
- `alt` descriptif obligatoire, `alt=""` si décorative

### Navigation
- `aria-label` sur les `<nav>` ambigus
- Ordre de focus logique

---

## 8. Procédure complète — créer un composant de A à Z

### Étape 1 — Créer le dossier
```
dev/components/[nom]/
```

### Étape 2 — Créer `[nom].json`
- Définir `name`, `level`, `category`, `description`
- Lister les `variants` (apparence) et `content` (données)
- Chaque contrôle a un `type`, `label`, `default` (et `options` si select)

### Étape 3 — Créer `[nom].twig`
- Déclarer toutes les variables avec `{% set var = var|default(...) %}`
- Construire le HTML avec BEM
- Inclure les atoms nécessaires via `{% include '...' with { ... } %}`
- Intégrer les attributs ARIA nécessaires

### Étape 4 — Créer `dev/assets/scss/components/_[nom].scss`
- `@use '../base/variables' as *;` en première ligne
- Écrire les styles BEM avec variables design system
- Gérer `:focus-visible`, `:disabled`, états

### Étape 5 — Importer dans `style.scss`
```scss
@use 'components/[nom]';
```

### Étape 6 — Créer `[nom].md`
- Suivre la structure imposée (section 2 de ce document)
- Renseigner : Usage, Props (toutes), Accessibilité, Exemples (base + variantes)

### Étape 7 — Vérifier
- Le showcase se régénère automatiquement (generate-showcase.js)
- Le composant apparaît dans la liste du showcase
- Les contrôles du JSON génèrent bien les bons contrôles interactifs
- L'accessibilité est vérifiable via le bouton ♿ dans la vue composant

---

## 9. Conventions de nommage

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Dossier composant | `kebab-case` | `form-field/` |
| Fichier Twig | `kebab-case.twig` | `form-field.twig` |
| Fichier SCSS | `_kebab-case.scss` | `_form-field.scss` |
| Fichier JSON | `kebab-case.json` | `form-field.json` |
| Classes CSS | BEM — `.block__element--modifier` | `.btn--primary` |
| Variables SCSS | `$categorie-nom` | `$color-primary`, `$spacing-md` |
| Fichier SVG icône | `kebab-case.svg` dans `dev/assets/icons/unitaires/` | `arrow-right.svg` |

---

## 10. Erreurs fréquentes à éviter

| Erreur | Correct |
|--------|---------|
| `<button>` sans `type` | `<button type="button">` |
| Variable Twig sans `\|default()` | `{% set text = text\|default('...') %}` |
| Valeur CSS hardcodée (`color: #2563eb`) | `color: $color-primary` |
| `!important` | Revoir la spécificité CSS |
| Include Twig sans `with { ... }` | Toujours passer les variables explicitement |
| Atom qui inclut une molecule | Composition descendante uniquement |
| Import SCSS auto-généré | Import manuel dans `style.scss`, dans l'ordre |
| `outline: none` sans alternative | `@include focus-ring` sur `:focus-visible` |
| Classe CSS sans préfixe BEM dans composant | Utiliser le nom du bloc comme préfixe |

---

## 11. Convention icônes natives

Les icônes utilisent un **sprite SVG auto-généré**. C'est le seul mécanisme autorisé.

### Architecture

```
dev/assets/icons/
├── unitaires/        ← Sources — un fichier SVG par icône (à modifier ici)
│   ├── close.svg
│   └── search.svg
├── sprite.svg        ← Auto-généré — ne pas modifier à la main
└── doc.html          ← Auto-généré — documentation visuelle avec copy-to-clipboard
```

### Ajouter une icône

1. Déposer le fichier `[nom].svg` dans `dev/assets/icons/unitaires/`
2. Le watcher Vite régénère `sprite.svg` + `doc.html` automatiquement au démarrage ou lors du save
3. En dehors du dev server : `npm run icons`

### Règles SVG (fichiers unitaires/)
- `viewBox` obligatoire — supprimer `width`/`height` fixes
- `fill="currentColor"` sur les paths — supprimer les couleurs hardcodées
- Noms sémantiques en `kebab-case` : `close.svg`, `arrow-right.svg` (pas `x.svg`, pas `arrow_right.svg`)

### Atom `icon` — usage
```twig
{% include 'dev/components/icon/icon.twig' with {
  name: 'search',
  size: 'md',
  label: 'Rechercher'
} %}
```

### Props de l'atom `icon`

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `name` | `string` | `'placeholder'` | Nom du fichier SVG sans extension (ex: `search`) |
| `size` | `string` | `'md'` | `xs` (12px) / `sm` (16px) / `md` (20px) / `lg` (24px) / `xl` (30px) |
| `label` | `string` | `''` | Texte accessible. Vide = décoratif (`aria-hidden="true"`) |
| `class` | `string` | `''` | Classes CSS additionnelles |

### Rendu HTML généré
```html
<!-- Icône signifiante -->
<svg class="icon icon--md" role="img" aria-label="Rechercher" focusable="false">
  <use href="/dev/assets/icons/sprite.svg#icon-search"></use>
</svg>

<!-- Icône décorative -->
<svg class="icon icon--md" aria-hidden="true" focusable="false">
  <use href="/dev/assets/icons/sprite.svg#icon-search"></use>
</svg>
```

### Erreurs fréquentes

| Erreur | Correct |
|--------|---------|
| Modifier `sprite.svg` à la main | Modifier les SVGs dans `unitaires/` |
| SVG avec `fill` hardcodé | `fill="currentColor"` |
| SVG avec `width`/`height` fixes | `viewBox` uniquement |
| Icône sans `label` ni `aria-hidden` | Toujours l'un ou l'autre |
| Nom de fichier non-sémantique (`x.svg`) | Nom sémantique (`close.svg`) |

---

## Séparation app/ vs dev/

- `app/` → framework showcase. **Ne jamais modifier.** Styles préfixés `.gf-`.
- `dev/` → projet utilisateur. C'est ici que travaille l'intégrateur.

Les styles de `app/styles/showcase.scss` n'affectent jamais le rendu des composants `dev/`.
