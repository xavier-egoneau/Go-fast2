# Convention de nommage — Tokens Figma → Go-fast v2

Ce document définit la correspondance entre les noms de tokens dans Figma et les variables SCSS du design system Go-fast.

---

## Principe

Les tokens Figma utilisent une hiérarchie slash (`/`) qui mappe directement vers les variables SCSS en kebab-case préfixées de `$`.

**Règle de transformation :**
```
[catégorie]/[nom]/[variante]  →  $[catégorie]-[nom]-[variante]
[catégorie]/[nom]             →  $[catégorie]-[nom]
```

Le script `npm run validate:figma` vérifie automatiquement la correspondance entre un fichier de tokens Figma exporté et `_variables.scss`.

---

## Correspondances complètes

### Couleurs

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `color/primary/base` | `$color-primary` | `#2563eb` |
| `color/primary/light` | `$color-primary-light` | `#60a5fa` |
| `color/primary/dark` | `$color-primary-dark` | `#1d4ed8` |
| `color/secondary/base` | `$color-secondary` | `#7c3aed` |
| `color/secondary/light` | `$color-secondary-light` | `#a78bfa` |
| `color/secondary/dark` | `$color-secondary-dark` | `#5b21b6` |
| `color/success/base` | `$color-success` | `#16a34a` |
| `color/success/light` | `$color-success-light` | `#4ade80` |
| `color/success/dark` | `$color-success-dark` | `#15803d` |
| `color/danger/base` | `$color-danger` | `#dc2626` |
| `color/danger/light` | `$color-danger-light` | `#f87171` |
| `color/danger/dark` | `$color-danger-dark` | `#b91c1c` |
| `color/warning/base` | `$color-warning` | `#d97706` |
| `color/warning/light` | `$color-warning-light` | `#fbbf24` |
| `color/warning/dark` | `$color-warning-dark` | `#b45309` |
| `color/gray/50` | `$color-gray-50` | `#f9fafb` |
| `color/gray/100` | `$color-gray-100` | `#f3f4f6` |
| `color/gray/200` | `$color-gray-200` | `#e5e7eb` |
| `color/gray/300` | `$color-gray-300` | `#d1d5db` |
| `color/gray/400` | `$color-gray-400` | `#9ca3af` |
| `color/gray/500` | `$color-gray-500` | `#6b7280` |
| `color/gray/600` | `$color-gray-600` | `#4b5563` |
| `color/gray/700` | `$color-gray-700` | `#374151` |
| `color/gray/800` | `$color-gray-800` | `#1f2937` |
| `color/gray/900` | `$color-gray-900` | `#111827` |
| `color/white` | `$color-white` | `#ffffff` |
| `color/black` | `$color-black` | `#000000` |

### Typographie — Tailles

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `font-size/xs` | `$font-size-xs` | `0.75rem` |
| `font-size/sm` | `$font-size-sm` | `0.875rem` |
| `font-size/base` | `$font-size-base` | `1rem` |
| `font-size/lg` | `$font-size-lg` | `1.125rem` |
| `font-size/xl` | `$font-size-xl` | `1.25rem` |
| `font-size/2xl` | `$font-size-2xl` | `1.5rem` |
| `font-size/3xl` | `$font-size-3xl` | `1.875rem` |
| `font-size/4xl` | `$font-size-4xl` | `2.25rem` |

### Typographie — Graisses

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `font-weight/normal` | `$font-weight-normal` | `400` |
| `font-weight/medium` | `$font-weight-medium` | `500` |
| `font-weight/semibold` | `$font-weight-semibold` | `600` |
| `font-weight/bold` | `$font-weight-bold` | `700` |

### Typographie — Interlignes

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `line-height/tight` | `$line-height-tight` | `1.25` |
| `line-height/normal` | `$line-height-normal` | `1.5` |
| `line-height/relaxed` | `$line-height-relaxed` | `1.75` |

### Espacements

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `spacing/xs` | `$spacing-xs` | `0.25rem` |
| `spacing/sm` | `$spacing-sm` | `0.5rem` |
| `spacing/md` | `$spacing-md` | `1rem` |
| `spacing/lg` | `$spacing-lg` | `1.5rem` |
| `spacing/xl` | `$spacing-xl` | `2rem` |
| `spacing/2xl` | `$spacing-2xl` | `3rem` |
| `spacing/3xl` | `$spacing-3xl` | `4rem` |

### Border radius

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `radius/sm` | `$radius-sm` | `0.125rem` |
| `radius/md` | `$radius-md` | `0.375rem` |
| `radius/lg` | `$radius-lg` | `0.5rem` |
| `radius/xl` | `$radius-xl` | `0.75rem` |
| `radius/2xl` | `$radius-2xl` | `1rem` |
| `radius/full` | `$radius-full` | `9999px` |

### Ombres

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `shadow/sm` | `$shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `shadow/md` | `$shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), …` |
| `shadow/lg` | `$shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), …` |
| `shadow/xl` | `$shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), …` |

### Transitions

| Token Figma | Variable SCSS | Valeur |
|-------------|---------------|--------|
| `transition/fast` | `$transition-fast` | `150ms ease` |
| `transition/base` | `$transition-base` | `300ms ease` |
| `transition/slow` | `$transition-slow` | `500ms ease` |

---

## Format d'export attendu

Le fichier de tokens Figma passé à `npm run validate:figma` doit être un JSON plat (format Style Dictionary / Tokens Studio) :

```json
{
  "color/primary/base": { "value": "#2563eb", "type": "color" },
  "color/primary/light": { "value": "#60a5fa", "type": "color" },
  "spacing/md": { "value": "1rem", "type": "spacing" },
  "font-size/base": { "value": "1rem", "type": "fontSizes" }
}
```

Ou format plat simple :
```json
{
  "color/primary/base": "#2563eb",
  "spacing/md": "1rem"
}
```

---

## Règles pour Figma (designer)

1. **Nommer les couleurs** avec la hiérarchie `color/[palette]/[variante]`
   - Variante `base` pour la couleur principale (pas de suffixe)
   - Ex : `color/primary/base`, `color/primary/light`, `color/primary/dark`

2. **Grises** : utiliser le suffixe numérique — `color/gray/50` à `color/gray/900`

3. **Ne pas créer de tokens hors convention** sans l'ajouter en même temps dans `_variables.scss`

4. **Valeurs numériques** en `rem` pour la typo et les espacements (pas de `px`)

---

## Vérification

```bash
# Exporter les tokens depuis Figma (Tokens Studio > Export > JSON)
# puis :
npm run validate:figma -- --tokens=path/to/figma-tokens.json
```

Le script affiche :
- Tokens Figma **sans correspondance SCSS** (à ajouter dans `_variables.scss`)
- Variables SCSS **sans token Figma** (à ajouter dans Figma)
