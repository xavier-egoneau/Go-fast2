# Label

Atome — catégorie : Forms.
Étiquette accessible associée à un champ de formulaire.

## Usage

Utilisé pour labelliser tout champ de formulaire (`<input>`, `<select>`, `<textarea>`). L'attribut `for` doit correspondre à l'`id` du champ cible.

## Props

| Prop       | Type    | Défaut       | Description                                           |
|------------|---------|--------------|-------------------------------------------------------|
| `text`     | string  | `'Étiquette'` | Texte affiché dans l'étiquette.                      |
| `for`      | string  | `'field'`    | Valeur de l'attribut `for` — doit correspondre à l'`id` du champ associé. |
| `required` | boolean | `false`      | Affiche un astérisque `*` avec un `aria-label="obligatoire"` pour signaler un champ obligatoire. |

## Accessibilité

- Le `for` lie explicitement l'étiquette au champ via l'`id` correspondant (relation programmatique exigée par WCAG 1.3.1).
- L'astérisque de champ obligatoire est enveloppé dans un `<span aria-label="obligatoire">` pour que les lecteurs d'écran ne lisent pas le symbole brut `*`.
- Ne jamais omettre `for` : sans cette liaison, le champ n'est pas correctement exposé aux technologies d'assistance.

## Exemples

**Base**

```twig
{% include 'dev/components/label/label.twig' with {
  text: 'Adresse e-mail',
  for: 'email'
} %}
```

**Champ obligatoire**

```twig
{% include 'dev/components/label/label.twig' with {
  text: 'Mot de passe',
  for: 'password',
  required: true
} %}
```
