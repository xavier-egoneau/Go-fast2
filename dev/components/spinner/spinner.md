# Spinner

Indicateur de chargement animé. Signale une action en cours (atom — Feedback).

## Usage

Utiliser le spinner pour indiquer qu'une opération asynchrone est en cours (chargement de données, soumission de formulaire, etc.). Il doit toujours être accompagné d'un libellé accessible.

## Props

| Prop      | Type   | Défaut                  | Description                                                              |
|-----------|--------|-------------------------|--------------------------------------------------------------------------|
| `size`    | string | `md`                    | Taille du spinner. Valeurs : `sm`, `md`, `lg`, `xl`.                     |
| `variant` | string | `primary`               | Couleur du spinner. Valeurs : `primary`, `secondary`, `success`, `danger`, `neutral`. |
| `label`   | string | `Chargement en cours…`  | Libellé visible masqué visuellement (ou affiché) et lu par les lecteurs d'écran. |

## Accessibilité

- L'élément racine porte `role="status"` et `aria-live="polite"` : les lecteurs d'écran annoncent le changement d'état sans interrompre la navigation.
- L'anneau animé (`.spinner__ring`) est masqué avec `aria-hidden="true"` pour éviter un bruit inutile.
- `.spinner__label` contient le texte lu par les technologies d'assistance ; il peut être visuellement masqué via une classe utilitaire (ex. `.sr-only`) si nécessaire, mais ne doit jamais être absent.
- Toujours fournir un `label` explicite et contextuel (ex. `"Envoi du formulaire…"`) plutôt que le texte générique par défaut lorsque le contexte le permet.

## Exemples

### Base — taille et variante par défaut

```twig
{% include 'dev/components/spinner/spinner.twig' with {} %}
```

### Variante grande taille, couleur succès

```twig
{% include 'dev/components/spinner/spinner.twig' with {
  size: 'lg',
  variant: 'success',
  label: 'Enregistrement en cours…'
} %}
```

### Petite taille, couleur danger, libellé contextuel

```twig
{% include 'dev/components/spinner/spinner.twig' with {
  size: 'sm',
  variant: 'danger',
  label: 'Suppression en cours…'
} %}
```
