# Grid

## Usage

Conteneur CSS Grid générique. Remplace le CSS de grille inline dans les organisms et pages — utiliser systématiquement dès qu'une mise en page en colonnes est nécessaire. Supporte un nombre de colonnes fixe ou automatique (auto-fit), un gap et un alignement vertical. Les colonnes sont surchargeables par breakpoint via `colsSm`, `colsMd`, `colsLg`.

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `cols` | `string` | `'3'` | Colonnes par défaut (mobile first) : `1`, `2`, `3`, `4`, `6`, `12`, `auto` |
| `colsSm` | `string` | `''` | Colonnes à partir de `sm` (640px) |
| `colsMd` | `string` | `''` | Colonnes à partir de `md` (768px) |
| `colsLg` | `string` | `''` | Colonnes à partir de `lg` (1024px) |
| `gap` | `string` | `'md'` | Espacement entre cellules : `none`, `xs`, `sm`, `md`, `lg`, `xl` |
| `align` | `string` | `'stretch'` | Alignement vertical des cellules : `stretch`, `start`, `center`, `end` |
| `tag` | `string` | `'div'` | Balise HTML du conteneur (`div`, `ul`, `section`…) |

## Accessibilité

Le composant est purement layout — aucun attribut ARIA propre. La sémantique dépend du `tag` choisi et du contenu enfant.

## Exemples

### 3 colonnes avec gap medium (défaut)

```twig
{% include 'dev/components/grid/grid.twig' with {
  children: '...'
} %}
```

### Responsive : 1 col → 2 col → 4 col

```twig
{% include 'dev/components/grid/grid.twig' with {
  cols: '1',
  colsSm: '2',
  colsLg: '4',
  gap: 'lg',
  children: '...'
} %}
```

### Colonnes automatiques (auto-fit)

```twig
{% include 'dev/components/grid/grid.twig' with {
  cols: 'auto',
  gap: 'xl'
} %}
```

### Liste sémantique

```twig
{% include 'dev/components/grid/grid.twig' with {
  tag: 'ul',
  cols: '1',
  colsMd: '2',
  colsLg: '3',
  gap: 'md'
} %}
```
