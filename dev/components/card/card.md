# Card

Molecule — catégorie Layout.

Conteneur de contenu structuré avec image, titre, description et action optionnels. Utilise une balise `<article>` sémantique.

## Usage

Afficher un résumé de contenu (article, produit, actualité) avec une hiérarchie visuelle claire. L'image et le bouton d'action sont activables indépendamment.

## Props

| Prop          | Type      | Défaut                                        | Description                                          |
|---------------|-----------|-----------------------------------------------|------------------------------------------------------|
| `shadow`      | `string`  | `'md'`                                        | Intensité de l'ombre portée : `none`, `sm`, `md`, `lg` |
| `hasImage`    | `boolean` | `true`                                        | Affiche le bloc image en tête de carte               |
| `hasAction`   | `boolean` | `true`                                        | Affiche le bouton d'action en pied de carte          |
| `title`       | `string`  | `'Titre de la carte'`                         | Titre principal de la carte (`<h3>`)                 |
| `description` | `string`  | `'Description courte du contenu de la carte.'` | Texte descriptif affiché sous le titre               |
| `actionLabel` | `string`  | `'En savoir plus'`                            | Libellé du bouton d'action                           |

## Accessibilité

- La balise `<article>` est un landmark implicite — chaque carte est un contenu autonome.
- Le bloc image porte `aria-hidden="true"` car il est décoratif (placeholder sans valeur informative).
- Le titre est rendu en `<h3>` : s'assurer qu'il s'inscrit dans la hiérarchie de titres de la page parente.
- Le bouton d'action hérite des règles d'accessibilité du composant `button` (focus-visible, libellé explicite).
- Veiller à ce que `actionLabel` soit suffisamment descriptif dans son contexte, ou compléter avec un `aria-label` au niveau du bouton si nécessaire.

## Exemples

**Base — carte complète avec ombre par défaut**

```twig
{% include 'dev/components/card/card.twig' with {
  title: 'Introduction à l'Atomic Design',
  description: 'Découvrez comment structurer vos interfaces en atomes, molécules et organismes.',
  actionLabel: 'Lire l'article',
  shadow: 'md',
  hasImage: true,
  hasAction: true
} %}
```

**Variante — carte textuelle sans image ni ombre**

```twig
{% include 'dev/components/card/card.twig' with {
  title: 'Note importante',
  description: 'Ce contenu ne nécessite pas d'illustration.',
  hasImage: false,
  hasAction: false,
  shadow: 'none'
} %}
```

**Variante — carte avec ombre forte et bouton personnalisé**

```twig
{% include 'dev/components/card/card.twig' with {
  title: 'Offre spéciale',
  description: 'Profitez de notre promotion jusqu'au 31 mars.',
  actionLabel: 'Voir l'offre',
  shadow: 'lg',
  hasImage: true,
  hasAction: true
} %}
```
