# Avatar

Atom — catégorie Media. Affiche l'image de profil d'un utilisateur ou ses initiales en fallback, avec taille et forme configurables.

## Usage

Utiliser l'avatar pour identifier visuellement un utilisateur dans des listes, en-têtes, commentaires ou cartes. Fournir `src` pour afficher une image ; omettre `src` pour afficher les initiales sur un fond coloré.

## Props

| Prop       | Type   | Défaut     | Description                                                                 |
|------------|--------|------------|-----------------------------------------------------------------------------|
| `size`     | string | `md`       | Taille de l'avatar. Valeurs : `xs`, `sm`, `md`, `lg`, `xl`.                |
| `shape`    | string | `circle`   | Forme de l'avatar. Valeurs : `circle`, `square`.                            |
| `variant`  | string | `primary`  | Couleur de fond des initiales (ignoré si `src` est fourni). Valeurs : `primary`, `secondary`, `success`, `danger`, `warning`, `neutral`. |
| `initials` | string | `?`        | Initiales affichées quand aucune image n'est fournie.                       |
| `src`      | string | `''`       | URL de l'image. Si vide, les initiales sont affichées.                      |
| `alt`      | string | `Avatar`   | Texte alternatif pour l'image ou label ARIA de l'élément racine.            |

## Accessibilité

- L'élément racine `<span>` porte `aria-label="{{ alt }}"`, ce qui fournit un nom accessible dans tous les modes (image ou initiales).
- Quand les initiales sont affichées, le `<span class="avatar__initials">` est marqué `aria-hidden="true"` pour éviter une double lecture par les lecteurs d'écran.
- Quand une image est affichée, l'attribut `alt` de la balise `<img>` reprend la valeur de `alt`.
- Veiller à ce que le rapport de contraste entre les initiales et la couleur de fond respecte le niveau WCAG AA (4,5:1 pour le texte normal).

## Exemples

**Base — initiales avec variante primary (défaut)**

```twig
{% include 'dev/components/avatar/avatar.twig' with {
  initials: 'JD',
  alt: 'Jean Dupont'
} %}
```

**Avec image, grande taille, forme carrée**

```twig
{% include 'dev/components/avatar/avatar.twig' with {
  src: '/images/profiles/jane.jpg',
  alt: 'Jane Martin',
  size: 'lg',
  shape: 'square'
} %}
```

**Petite taille, initiales sur fond success**

```twig
{% include 'dev/components/avatar/avatar.twig' with {
  initials: 'AM',
  alt: 'Alice Martin',
  size: 'sm',
  variant: 'success'
} %}
```
