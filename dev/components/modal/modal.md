# Modal

Fenêtre modale centrée avec overlay, en-tête, corps et pied de page optionnel. Molecule — catégorie Feedback.

## Usage

Utiliser pour interrompre le flux utilisateur afin d'obtenir une confirmation ou afficher une information critique. Chaque modale doit avoir un `id` unique sur la page.

## Props

| Prop           | Type      | Défaut                    | Description                                          |
|----------------|-----------|---------------------------|------------------------------------------------------|
| `id`           | `string`  | `'modal-1'`               | Identifiant HTML unique ; utilisé pour l'ARIA.       |
| `title`        | `string`  | `'Titre de la modale'`    | Texte du `<h2>` dans l'en-tête.                      |
| `body`         | `string`  | `'Contenu de la modale.'` | Texte affiché dans le corps de la modale.            |
| `open`         | `boolean` | `true`                    | Affiche la modale (`modal--open`) si `true`.         |
| `size`         | `string`  | `'md'`                    | Taille du dialogue : `sm`, `md`, `lg`, `xl`.         |
| `showFooter`   | `boolean` | `true`                    | Affiche le pied de page avec les boutons d'action.   |
| `confirmLabel` | `string`  | `'Confirmer'`             | Libellé du bouton principal (`.btn--primary`).       |
| `cancelLabel`  | `string`  | `'Annuler'`               | Libellé du bouton secondaire (`.btn--outline`).      |

## Accessibilité

- `role="dialog"` et `aria-modal="true"` sont appliqués sur l'élément racine.
- `aria-labelledby` pointe vers l'`id` du `<h2>` (`{{ id }}-title`), fournissant un nom accessible au dialogue.
- `aria-hidden="true"` est positionné sur la racine lorsque la modale est fermée (`open: false`), et retiré à l'ouverture.
- L'overlay porte `aria-hidden="true"` pour être ignoré des technologies d'assistance.
- Le bouton de fermeture dispose d'un `aria-label="Fermer"` explicite ; l'icône SVG est masquée avec `aria-hidden="true"`.
- Fermeture au clic sur l'overlay, au clic sur le bouton de fermeture, et à la touche `Escape`.
- S'assurer que le focus est déplacé vers la modale à l'ouverture et restitué à l'élément déclencheur à la fermeture (gestion à implémenter côté intégrateur).

## Exemples

### Base — modale de confirmation (taille par défaut)

```twig
{% include 'dev/components/modal/modal.twig' with {
  id: 'modal-confirm',
  title: 'Confirmer la suppression',
  body: 'Cette action est irréversible. Souhaitez-vous continuer ?',
  open: true
} %}
```

### Variante — grande taille, sans pied de page

```twig
{% include 'dev/components/modal/modal.twig' with {
  id: 'modal-info',
  title: 'Informations importantes',
  body: 'Veuillez lire attentivement les conditions avant de poursuivre.',
  size: 'lg',
  showFooter: false,
  open: true
} %}
```

### Variante — libellés personnalisés, taille petite

```twig
{% include 'dev/components/modal/modal.twig' with {
  id: 'modal-logout',
  title: 'Se déconnecter',
  body: 'Vous allez être déconnecté de votre session en cours.',
  size: 'sm',
  confirmLabel: 'Me déconnecter',
  cancelLabel: 'Rester connecté',
  open: true
} %}
```
