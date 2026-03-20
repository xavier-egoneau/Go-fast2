# /from-figma — Générer un composant depuis Figma

> **⚠️ Prérequis : Figma MCP doit être connecté.**
> Vérifier que `.mcp.json` contient le bloc `"figma"` activé avec une clé API valide.
> Sans Figma MCP, cette commande ne peut pas lire les frames Figma.
> Voir `docs/figma-integration.md` pour l'activation.

---

## Étape 1 — Reçois le lien Figma

L'utilisateur fournit un lien vers une frame Figma annotée "Ready for dev".

Format attendu : `https://www.figma.com/file/[fileId]/...?node-id=[nodeId]`

Si le lien est absent, demande-le avant de continuer.

## Étape 2 — Lis la frame via Figma MCP

Utilise l'outil Figma MCP pour lire le contenu de la frame :

1. Extraire le `fileId` et le `nodeId` depuis l'URL
2. Appeler `figma.get_node` (ou l'outil équivalent du MCP) avec ces paramètres
3. Récupérer :
   - Le **nom de la frame** → devient le nom du composant (converti en kebab-case)
   - Les **annotations de niveau** (`atom` / `molecule` / `organism` / `template`) — chercher dans les annotations "Ready for dev" ou dans le nom de la frame
   - Les **styles appliqués** (couleurs, typographie, espacements) → mapper vers les tokens Go-fast
   - La **structure des éléments enfants** → inférer la composition et les props

## Étape 3 — Déterminer les métadonnées du composant

À partir des données Figma, déduire :

| Donnée | Source Figma | Règle |
|--------|-------------|-------|
| `name` | Nom de la frame | Convertir en Title Case |
| `slug` | Nom de la frame | Convertir en kebab-case |
| `level` | Annotation ou préfixe du nom (`[atom]`, `[molecule]`...) | Valeur par défaut : `atom` |
| `category` | Annotation ou page Figma | Valeur par défaut : `UI` |
| `description` | Annotation "Description" ou description du composant | Résumer en une phrase |

Si des informations sont manquantes ou ambiguës, demande confirmation avant de générer.

## Étape 4 — Mapper les tokens Figma → variables SCSS

Pour chaque style rencontré dans la frame :

1. Consulter `docs/figma-tokens-convention.md` pour la table de correspondance
2. Identifier la variable SCSS Go-fast correspondante
3. Si aucune correspondance → utiliser la valeur la plus proche du design system existant et signaler l'écart

Exemples :
- Couleur `#2563eb` → `$color-primary`
- Padding `16px` / `1rem` → `$spacing-md`
- Border-radius `6px` / `0.375rem` → `$radius-md`

## Étape 5 — Lire la config CSS du projet

Lire `gofast.config.json` pour déterminer la stratégie CSS :

| `scss` | `tailwind` | Action |
|--------|------------|--------|
| `true` | `false` | Créer fichier SCSS BEM |
| `false` | `true` | Classes Tailwind uniquement |
| `true` | `true` | SCSS BEM + classes Tailwind |

## Étape 6 — Générer les 4 fichiers

### `dev/components/[slug]/[slug].json`

```json
{
  "name": "[Name]",
  "level": "[level]",
  "category": "[Category]",
  "description": "[Description extraite de Figma]",
  "variants": {
    // contrôles d'apparence inférés depuis les variantes Figma
  },
  "content": {
    // contrôles de contenu inférés depuis les layers texte
  }
}
```

### `dev/components/[slug]/[slug].twig`

- `{% set var = var|default(...) %}` sur **toutes** les variables
- BEM strict : `.block__element--modifier`
- Attributs ARIA selon le type (boutons → `type="button"`, inputs → `for`/`id`, etc.)
- Composition descendante : inclure les atoms existants si applicable
- Pas de styles inline, pas de valeurs hardcodées

### `dev/assets/scss/components/_[slug].scss` *(si scss: true)*

- `@use '../base/variables' as *;` en tête
- Toutes les valeurs via variables SCSS ($color-*, $spacing-*, etc.)
- `:focus-visible` avec `@include focus-ring`
- États `:disabled` si le composant est interactif
- BEM cohérent avec le Twig

### `dev/components/[slug]/[slug].md`

Structure obligatoire :

```markdown
# [Name]

> Généré depuis Figma — frame : [URL de la frame]

## Usage
[Quand utiliser ce composant.]

## Props

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| ... |

## Accessibilité
[Attributs ARIA, comportement clavier.]

## Exemples

### Exemple de base
\`\`\`twig
{% include 'dev/components/[slug]/[slug].twig' with { ... } %}
\`\`\`
```

## Étape 7 — Ajouter l'import SCSS *(si scss: true)*

Ouvrir `dev/assets/scss/style.scss` et ajouter à la fin des imports composants :

```scss
@use 'components/[slug]';
```

## Étape 8 — Vérification finale

Avant de livrer, vérifier mentalement :

- [ ] Toutes les variables Twig ont un `|default()`
- [ ] Le JSON a les 4 champs obligatoires (`name`, `level`, `category`, `description`)
- [ ] Pas de valeur CSS hardcodée — uniquement des variables SCSS
- [ ] Les attributs ARIA requis sont présents
- [ ] La composition est descendante (atom n'inclut pas une molecule)
- [ ] L'import SCSS est ajouté dans `style.scss`
- [ ] Le fichier `.md` contient Usage, Props, Accessibilité, Exemples

## Étape 9 — Rapport de génération

Afficher un résumé :

```
✓ Composant généré : [name] ([level])
  Fichiers créés :
    dev/components/[slug]/[slug].json
    dev/components/[slug]/[slug].twig
    dev/components/[slug]/[slug].md
    dev/assets/scss/components/_[slug].scss

  Tokens mappés :  [N] correspondances exactes
  Écarts détectés : [liste des tokens sans correspondance, si applicable]

  → Vérifier dans le showcase : http://localhost:3000
```
