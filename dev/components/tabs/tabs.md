# Tabs

Système d'onglets (molecule / Navigation). Affiche plusieurs panneaux de contenu associés à des déclencheurs, avec navigation au clavier intégrée.

## Usage

Composant autonome : le script inline gère l'activation des panneaux et la navigation clavier. Chaque instance doit recevoir un `id` unique pour éviter les conflits lorsque plusieurs Tabs coexistent sur la même page.

## Props

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `variant` | `string` | `'line'` | Style visuel des onglets : `line`, `pill`, `card` |
| `size` | `string` | `'md'` | Taille des onglets : `sm`, `md`, `lg` |
| `fullWidth` | `boolean` | `false` | Si `true`, ajoute `.tabs--full` — les onglets occupent toute la largeur disponible |
| `tab1Label` | `string` | `'Aperçu'` | Libellé du premier onglet |
| `tab2Label` | `string` | `'Détails'` | Libellé du deuxième onglet |
| `tab3Label` | `string` | `'Paramètres'` | Libellé du troisième onglet |
| `id` | `string` | `'tabs-1'` | Identifiant unique du composant — obligatoire si plusieurs instances sur la même page |

## Accessibilité

- Le conteneur de liste utilise `role="tablist"` avec un `aria-label` descriptif.
- Chaque déclencheur porte `role="tab"`, `aria-controls` pointant vers son panneau, et `aria-selected` reflétant son état actif.
- Le panneau actif porte `role="tabpanel"` et `aria-labelledby` pointant vers son déclencheur ; les panneaux inactifs sont masqués via l'attribut `hidden`.
- Navigation clavier : `ArrowRight` / `ArrowLeft` déplacent le focus entre les onglets (rotatif). `Tab` sort de la liste d'onglets vers le panneau actif (tabindex `-1` sur les onglets inactifs).
- Respecte WCAG 2.1 — pattern ARIA Tabs Authoring Practices.

## Exemples

**Base — style par défaut**

```twig
{% include 'dev/components/tabs/tabs.twig' with {
  id: 'tabs-base',
  variant: 'line',
  size: 'md',
  tab1Label: 'Aperçu',
  tab2Label: 'Détails',
  tab3Label: 'Paramètres'
} %}
```

**Variante pill, grande taille, pleine largeur**

```twig
{% include 'dev/components/tabs/tabs.twig' with {
  id: 'tabs-pill-lg',
  variant: 'pill',
  size: 'lg',
  fullWidth: true,
  tab1Label: 'Description',
  tab2Label: 'Avis',
  tab3Label: 'FAQ'
} %}
```

**Variante card, petite taille**

```twig
{% include 'dev/components/tabs/tabs.twig' with {
  id: 'tabs-card-sm',
  variant: 'card',
  size: 'sm',
  tab1Label: 'Général',
  tab2Label: 'Avancé',
  tab3Label: 'Sécurité'
} %}
```
