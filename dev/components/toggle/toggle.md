# Toggle

Interrupteur on/off accessible. Alternative visuelle à la checkbox (atom — Forms).

## Usage

Utilisé pour activer ou désactiver une option de manière immédiate, sans validation de formulaire.

## Props

| Prop       | Type      | Défaut                      | Description                                     |
|------------|-----------|-----------------------------|-------------------------------------------------|
| `label`    | `string`  | `'Activer'`                 | Texte affiché à côté de l'interrupteur          |
| `id`       | `string`  | `'toggle-1'`                | Attribut `id` de l'input (doit être unique)     |
| `size`     | `string`  | `'md'`                      | Taille du toggle : `sm`, `md`, `lg`             |
| `checked`  | `boolean` | `false`                     | État activé par défaut                          |
| `disabled` | `boolean` | `false`                     | Désactive l'interrupteur                        |

## Accessibilité

- L'input porte `role="switch"` et `aria-checked` reflète l'état courant (`true` / `false`).
- En état désactivé, `disabled` et `aria-disabled="true"` sont tous deux présents.
- La piste visuelle (`toggle__track` et `toggle__thumb`) est masquée aux lecteurs d'écran via `aria-hidden="true"` — le label textuel reste l'ancre sémantique.
- L'`id` doit être unique par page pour que le `<label>` lie correctement l'input.
- Le focus doit être rendu visible via `:focus-visible` (règle WCAG 2.4.7).

## Exemples

**Base — état par défaut**

```twig
{% include 'dev/components/toggle/toggle.twig' with {
  id: 'toggle-notifications',
  label: 'Activer les notifications'
} %}
```

**Activé au chargement**

```twig
{% include 'dev/components/toggle/toggle.twig' with {
  id: 'toggle-darkmode',
  label: 'Mode sombre',
  checked: true,
  size: 'md'
} %}
```

**Petite taille, désactivé**

```twig
{% include 'dev/components/toggle/toggle.twig' with {
  id: 'toggle-beta',
  label: 'Fonctionnalités bêta',
  size: 'sm',
  disabled: true
} %}
```
