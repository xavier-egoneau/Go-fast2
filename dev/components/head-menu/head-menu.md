# Head Menu

Organism — Navigation. En-tête de navigation avec logo, liens, menu déroulant optionnel et bouton CTA. Supporte les thèmes clair/sombre, pleine largeur, transparent et responsive.

## Usage

Inclure le composant dans un template Twig en passant les props souhaitées. Par défaut, un jeu de liens de démonstration est fourni via `items`. La navigation mobile est gérée par le bouton burger intégré.

## Props

### Apparence & comportement

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `theme` | `string` | `'light'` | Thème de couleur : `'light'` ou `'dark'` |
| `sticky` | `boolean` | `false` | Position fixe en haut de page au défilement |
| `fullWidth` | `boolean` | `false` | Supprime la contrainte de largeur du conteneur |
| `transparent` | `boolean` | `false` | Fond transparent (utile sur hero image) |
| `shadow` | `boolean` | `false` | Applique une ombre portée à la place de la bordure |
| `navAlign` | `string` | `'right'` | Alignement des liens : `'right'` ou `'center'` |
| `showButton` | `boolean` | `true` | Affiche ou masque le bouton CTA |
| `showMobileBurger` | `boolean` | `false` | Force l'état ouvert du menu mobile (démo) |

### Contenu

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `logoText` | `string` | `'Logo'` | Texte affiché si aucune image logo n'est fournie |
| `logoSrc` | `string` | `''` | URL de l'image logo ; si renseigné, remplace `logoText` |
| `logoHref` | `string` | `'#'` | URL cible du lien logo |
| `activeItem` | `string` | `''` | Label exact du lien actif (déclenche `aria-current="page"`) |
| `buttonText` | `string` | `'Commencer'` | Libellé du bouton CTA |
| `buttonVariant` | `string` | `'primary'` | Variante du bouton (`btn--{variant}`) |
| `menuId` | `string` | `'head-menu-nav'` | `id` du `<nav>`, référencé par le bouton burger via `aria-controls` |
| `items` | `array` | voir ci-dessous | Tableau de liens. Chaque entrée : `{ label, href }`. Pour un sous-menu : `{ label, children: [{ label, href, icon? }] }` |

**Structure par défaut de `items` :**
```twig
[
  { label: 'Accueil',   href: '#' },
  { label: 'Produit',   href: '#' },
  { label: 'Solutions', children: [
      { label: 'Pour les équipes',      href: '#' },
      { label: 'Pour les entreprises',  href: '#' },
      { label: 'Pour les indépendants', href: '#' }
  ]},
  { label: 'Tarifs',  href: '#' },
  { label: 'Contact', href: '#' }
]
```

## Accessibilité

- Le `<header>` porte `role="banner"`.
- Le lien logo porte `aria-label="Retour à l'accueil"` ; si une image est utilisée, son `alt` reprend `logoText`.
- Le `<nav>` porte `aria-label="Navigation principale"`.
- Le lien actif reçoit `aria-current="page"`.
- Les triggers de sous-menu sont des `<button>` avec `aria-expanded` et `aria-haspopup="true"` ; le chevron est masqué avec `aria-hidden="true"`.
- La liste déroulante utilise `role="menu"` / `role="menuitem"` / `role="none"`.
- Le bouton burger porte `aria-controls` (pointant vers l'`id` du `<nav>`), `aria-expanded` et `aria-label="Ouvrir le menu"` ; les barres sont `aria-hidden="true"`.

## Exemples

### Base — thème clair, liens alignés à droite

```twig
{% include 'dev/components/head-menu/head-menu.twig' with {
  logoText: 'MonSite',
  logoHref: '/',
  activeItem: 'Accueil',
  navAlign: 'right',
  showButton: true,
  buttonText: 'Essai gratuit'
} %}
```

### Variante — thème sombre, navigation centrée, sans bouton CTA

```twig
{% include 'dev/components/head-menu/head-menu.twig' with {
  theme: 'dark',
  logoSrc: '/assets/img/logo-white.svg',
  logoText: 'MonSite',
  logoHref: '/',
  navAlign: 'center',
  showButton: false,
  sticky: true,
  items: [
    { label: 'Accueil',  href: '/' },
    { label: 'À propos', href: '/about' },
    { label: 'Offres', children: [
        { label: 'Starter',      href: '/offres/starter' },
        { label: 'Pro',          href: '/offres/pro' },
        { label: 'Entreprise',   href: '/offres/enterprise' }
    ]},
    { label: 'Contact', href: '/contact' }
  ],
  activeItem: 'À propos'
} %}
```
