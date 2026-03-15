# Grid

Conteneur CSS Grid responsive. Définit le nombre de colonnes, l'espacement et l'alignement des éléments enfants.

## Usage

Composant atom de layout. S'utilise comme conteneur pour organiser des éléments en grille multi-colonnes avec contrôle du gap et de l'alignement vertical.

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `cols` | `string` | `'3'` | Nombre de colonnes : `'1'`, `'2'`, `'3'`, `'4'`, `'6'` |
| `gap` | `string` | `'md'` | Espacement entre les cellules : `'none'`, `'sm'`, `'md'`, `'lg'`, `'xl'` |
| `align` | `string` | `'stretch'` | Alignement vertical des cellules : `'stretch'`, `'start'`, `'center'`, `'end'` |

## Accessibilité

- L'élément racine est un `<div>` neutre ; aucun rôle ARIA supplémentaire n'est requis pour la grille elle-même.
- L'ordre visuel des cellules doit correspondre à l'ordre du DOM pour garantir une navigation au clavier cohérente.
- Les éléments enfants doivent porter leur propre sémantique (titres, liens, boutons) avec les attributs ARIA appropriés.

## Exemples

**Base — 3 colonnes, gap md (valeurs par défaut)**

```twig
{% include 'dev/components/grid/grid.twig' with {
  cols: '3',
  gap: 'md',
  align: 'stretch'
} %}
```

**Variante — 2 colonnes, grand espacement, alignement centré**

```twig
{% include 'dev/components/grid/grid.twig' with {
  cols: '2',
  gap: 'xl',
  align: 'center'
} %}
```

**Variante — 4 colonnes, sans espacement, alignement en haut**

```twig
{% include 'dev/components/grid/grid.twig' with {
  cols: '4',
  gap: 'none',
  align: 'start'
} %}
```
