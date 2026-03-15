# Input

Champ de saisie de texte accessible. Atom — catégorie Forms.

## Usage

Utiliser pour tout champ de formulaire texte natif. Associer systématiquement à un `<label>` via l'attribut `id`/`for`. Ne pas utiliser seul sans libellé visible ou `aria-label`.

## Props

| Prop          | Type      | Défaut                  | Description                                                                 |
|---------------|-----------|-------------------------|-----------------------------------------------------------------------------|
| `type`        | `string`  | `'text'`                | Type HTML du champ. Valeurs : `text`, `email`, `password`, `number`, `search`, `tel`, `url`. |
| `id`          | `string`  | `'field'`               | Valeur de l'attribut `id` et `name` du champ.                               |
| `placeholder` | `string`  | `''`                    | Texte indicatif affiché dans le champ vide.                                 |
| `disabled`    | `boolean` | `false`                 | Désactive le champ. Ajoute `disabled` et `aria-disabled="true"`.            |
| `hasError`    | `boolean` | `false`                 | Indique un état d'erreur. Ajoute la classe `input--error` et `aria-invalid="true"`. |

## Accessibilité

- L'attribut `aria-disabled="true"` est ajouté automatiquement lorsque `disabled` est `true`.
- L'attribut `aria-invalid="true"` est ajouté automatiquement lorsque `hasError` est `true`.
- Le champ doit toujours être associé à un `<label>` via `for="{{ id }}"` dans le composant parent.
- Le focus-visible doit être garanti par les styles SCSS du composant (ne pas supprimer l'outline).
- Le contraste du placeholder doit respecter WCAG AA (ratio minimum 4.5:1 pour le texte courant).

## Exemples

### Base — champ email

```twig
{% include 'dev/components/input/input.twig' with {
  type: 'email',
  id: 'user-email',
  placeholder: 'exemple@domaine.fr'
} %}
```

### Variante — champ en erreur

```twig
{% include 'dev/components/input/input.twig' with {
  type: 'text',
  id: 'username',
  placeholder: 'Nom d\'utilisateur',
  hasError: true
} %}
```

### Variante — champ désactivé

```twig
{% include 'dev/components/input/input.twig' with {
  type: 'text',
  id: 'readonly-field',
  placeholder: 'Non modifiable',
  disabled: true
} %}
```
