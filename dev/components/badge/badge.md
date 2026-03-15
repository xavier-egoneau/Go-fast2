# Badge

Étiquette colorée pour indiquer un statut, une catégorie ou un compteur. Composant atom, catégorie Feedback.

## Usage

Utilisé pour qualifier visuellement un élément : statut d'une entrée, type de contenu, compteur numérique. S'insère en ligne dans du texte ou dans un composant parent (card, list item, etc.).

## Props

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `text` | `string` | `'Badge'` | Contenu textuel affiché dans le badge. |
| `variant` | `string` | `'primary'` | Couleur sémantique : `primary`, `secondary`, `success`, `danger`, `warning`, `neutral`. |
| `size` | `string` | `'md'` | Taille : `sm`, `md`, `lg`. |
| `rounded` | `boolean` | `false` | Active le modificateur `badge--rounded` pour un arrondi complet (pilule). |
| `dot` | `boolean` | `false` | Affiche un point coloré (`badge__dot`) avant le texte, masqué aux lecteurs d'écran. |

## Accessibilité

- Le composant est rendu en `<span>`, donc neutre sémantiquement — il hérite du contexte de son parent.
- Le point décoratif (`badge__dot`) porte `aria-hidden="true"` : il n'est pas vocalisé.
- S'assurer que la couleur de texte sur le fond de chaque variante respecte le ratio de contraste WCAG AA (4.5:1 minimum pour du texte normal).
- Ne pas transmettre d'information critique uniquement par la couleur ; combiner avec un texte explicite.

## Exemples

Badge de base (variante `primary`, taille `md`) :

```twig
{% include 'dev/components/badge/badge.twig' with {
  text: 'Nouveau',
  variant: 'primary',
  size: 'md'
} %}
```

Badge statut succès, arrondi complet avec point indicateur :

```twig
{% include 'dev/components/badge/badge.twig' with {
  text: 'Actif',
  variant: 'success',
  size: 'sm',
  rounded: true,
  dot: true
} %}
```

Badge danger pour signaler une erreur :

```twig
{% include 'dev/components/badge/badge.twig' with {
  text: 'Erreur',
  variant: 'danger',
  size: 'lg'
} %}
```
