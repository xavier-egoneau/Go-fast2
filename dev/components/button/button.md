# Button

Élément d'action interactif. Base de tout formulaire et CTA. Atom — catégorie : Forms.

## Usage

Utiliser pour toute action déclenchée par l'utilisateur : soumission de formulaire, navigation, confirmation. Ne pas utiliser un `<a>` déguisé en bouton — ce composant génère un vrai `<button>`.

## Props

| Prop        | Type      | Défaut      | Description                                                                 |
|-------------|-----------|-------------|-----------------------------------------------------------------------------|
| `text`      | `string`  | `Cliquez ici` | Texte affiché dans le bouton.                                             |
| `variant`   | `string`  | `primary`   | Style visuel : `primary`, `secondary`, `success`, `danger`, `warning`, `outline`. |
| `size`      | `string`  | `md`        | Taille : `sm`, `md`, `lg`, `xl`.                                            |
| `disabled`  | `boolean` | `false`     | Désactive le bouton et ajoute `aria-disabled="true"`.                       |
| `fullWidth` | `boolean` | `false`     | Étend le bouton à toute la largeur de son conteneur (`.btn--full`).         |

## Accessibilité

- L'attribut `type="button"` est toujours présent pour éviter une soumission de formulaire non intentionnelle.
- En état désactivé, `disabled` et `aria-disabled="true"` sont tous deux appliqués pour couvrir les navigateurs et les technologies d'assistance.
- Le focus visible est géré via les styles globaux (`:focus-visible`) — ne pas supprimer l'outline.
- Le texte du bouton doit être explicite et décrire l'action ; éviter « Cliquer ici » en production.

## Exemples

Bouton primaire par défaut :

```twig
{% include 'dev/components/button/button.twig' with {
  text: 'Envoyer'
} %}
```

Bouton danger, grande taille, pleine largeur :

```twig
{% include 'dev/components/button/button.twig' with {
  text: 'Supprimer le compte',
  variant: 'danger',
  size: 'lg',
  fullWidth: true
} %}
```

Bouton désactivé (outline) :

```twig
{% include 'dev/components/button/button.twig' with {
  text: 'Indisponible',
  variant: 'outline',
  disabled: true
} %}
```
