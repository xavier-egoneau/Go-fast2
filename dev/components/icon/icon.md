# Icon

## Usage

Atom natif pour afficher une icône SVG inline. Toujours utiliser cet atom plutôt qu'intégrer un SVG directement dans un composant parent.

La couleur hérite automatiquement du parent via `currentColor` — pas besoin de passer une couleur explicite.

Icônes disponibles : `add`, `bell`, `bike`, `Brain`, `call`, `close`, `menu`, `search`.

Fichiers SVG sources dans `dev/assets/icons/unitaires/` — `sprite.svg` auto-généré.

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `name` | `string` | `'search'` | Nom du fichier SVG sans extension (ex: `search`, `close`) |
| `size` | `string` | `'md'` | Taille : `xs` (12px) / `sm` (16px) / `md` (20px) / `lg` (24px) / `xl` (30px) |
| `label` | `string` | `''` | Texte accessible. Vide = icône décorative (`aria-hidden="true"`) |
| `class` | `string` | `''` | Classes CSS additionnelles à ajouter sur le wrapper |

## Accessibilité

- **Icône décorative** (label vide) → `aria-hidden="true"` — ignorée par les lecteurs d'écran
- **Icône signifiante** (label fourni) → `role="img"` + `aria-label` — lue par les lecteurs d'écran
- La couleur hérite du parent : s'assurer que le contraste WCAG AA est respecté dans le contexte d'utilisation

## Exemples

### Icône décorative (dans un bouton avec texte)
```twig
{% include 'dev/components/icon/icon.twig' with {
  name: 'search',
  size: 'md'
} %}
```

### Icône signifiante (seule, sans texte visible)
```twig
{% include 'dev/components/icon/icon.twig' with {
  name: 'close',
  size: 'md',
  label: 'Fermer'
} %}
```

### Tailles disponibles
```twig
{% include 'dev/components/icon/icon.twig' with { name: 'bell', size: 'xs' } %}
{% include 'dev/components/icon/icon.twig' with { name: 'bell', size: 'sm' } %}
{% include 'dev/components/icon/icon.twig' with { name: 'bell', size: 'md' } %}
{% include 'dev/components/icon/icon.twig' with { name: 'bell', size: 'lg' } %}
{% include 'dev/components/icon/icon.twig' with { name: 'bell', size: 'xl' } %}
```

### Couleur héritée du parent
```twig
<span style="color: #2563eb">
  {% include 'dev/components/icon/icon.twig' with { name: 'add', label: 'Ajouter' } %}
</span>
```

## Ajouter une icône

1. Placer le fichier SVG dans `dev/assets/icons/[nom].svg`
2. S'assurer que le SVG respecte les règles : `viewBox` obligatoire, `fill="currentColor"`, pas de dimensions fixes
3. Ajouter le nom dans les `options` du `icon.json` pour l'exposer dans le showcase
