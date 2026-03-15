# Form Field

Molecule — composition `label` + `input` + message d'erreur optionnel. Constitue un champ de formulaire autonome et accessible.

## Usage

À utiliser dès qu'un champ de saisie nécessite un label associé. Gère nativement l'état d'erreur et le marquage obligatoire.

## Props

| Prop           | Type      | Défaut                    | Description                                              |
|----------------|-----------|---------------------------|----------------------------------------------------------|
| `label`        | `string`  | `'Label'`                 | Texte du label affiché au-dessus du champ                |
| `id`           | `string`  | `'field'`                 | Attribut `id` de l'input ; lie le label via `for`        |
| `type`         | `string`  | `'text'`                  | Type HTML de l'input : `text`, `email`, `password`, `number`, `search` |
| `placeholder`  | `string`  | `''`                      | Texte indicatif dans l'input                             |
| `required`     | `boolean` | `false`                   | Marque le champ comme obligatoire                        |
| `disabled`     | `boolean` | `false`                   | Désactive le champ                                       |
| `hasError`     | `boolean` | `false`                   | Active l'état d'erreur et affiche le message             |
| `errorMessage` | `string`  | `'Ce champ est invalide.'`| Message d'erreur affiché sous le champ                   |

## Accessibilité

- Le label est lié à l'input via `for` / `id` — la relation est toujours présente.
- Le message d'erreur porte `role="alert"` : il est annoncé automatiquement par les lecteurs d'écran à l'apparition.
- Le message d'erreur reçoit un `id` (`{id}-error`) prévu pour être référencé par `aria-describedby` sur l'input atom.
- L'état `required` est propagé à l'atom label pour afficher l'indicateur visuel attendu.
- L'état `disabled` est propagé à l'atom input ; aucune interaction clavier n'est possible sur un champ désactivé.
- Les contrastes de texte et de bordure respectent le niveau WCAG AA.

## Exemples

### Base — champ e-mail

```twig
{% include 'dev/components/form-field/form-field.twig' with {
  label: 'Adresse e-mail',
  id: 'email',
  type: 'email',
  placeholder: 'exemple@domaine.fr',
  required: true
} %}
```

### Variante — état d'erreur

```twig
{% include 'dev/components/form-field/form-field.twig' with {
  label: 'Adresse e-mail',
  id: 'email',
  type: 'email',
  placeholder: 'exemple@domaine.fr',
  required: true,
  hasError: true,
  errorMessage: 'Veuillez saisir une adresse e-mail valide.'
} %}
```

### Variante — champ désactivé

```twig
{% include 'dev/components/form-field/form-field.twig' with {
  label: 'Nom d\'utilisateur',
  id: 'username',
  type: 'text',
  placeholder: 'john.doe',
  disabled: true
} %}
```
