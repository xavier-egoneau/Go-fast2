# /edit — Modifier un composant Go-fast

Tu vas modifier un composant ou une page existant dans ce projet Go-fast v2.

## Etape 1 — Lis les references

Lis ces fichiers avant de faire quoi que ce soit :
- `AGENTS.md`
- `GUIDELINES_AI.md`

Tu dois respecter integralement leurs conventions.

## Etape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas precise, demande :
1. **Nom** du composant ou de la page a modifier (en kebab-case)
2. **Niveau** : atom / molecule / organism / template / page
3. **Ce qui doit changer** : decris la modification souhaitee

## Etape 3 — Lis les fichiers existants

Avant toute modification, lis les fichiers actuels du composant :
- `dev/components/[nom]/[nom].twig`
- `dev/components/[nom]/[nom].json`
- `dev/assets/scss/components/_[nom].scss`

Pour une page :
- `dev/pages/[nom].twig`
- `dev/pages/[nom].json` si present

Comprends la structure en place avant d'agir.

## Etape 4 — Applique les modifications

Modifie uniquement les fichiers concernes par la demande :

### `[nom].twig`
- Conserve `{% set var = var|default(...) %}` sur toutes les variables existantes
- Ajoute `|default()` sur toute nouvelle variable introduite
- Maintiens le BEM strict — `.block__element--modifier`
- Preserve les attributs ARIA existants, ajoute ceux requis par les nouvelles fonctionnalites

### `[nom].json` (si les metadonnees ou les variantes doivent evoluer)
- Conserve les 4 champs obligatoires : `name`, `level`, `category`, `description`
- Mets a jour `variants` ou `content` si les controles changent

### `_[nom].scss` (si le style doit evoluer)
- Utilise uniquement les variables du design system — zero valeur hardcodee
- Maintiens `:focus-visible` avec `@include focus-ring` si deja present
- N'ajoute pas d'import dans `style.scss` — le composant est deja branche

## Etape 5 — Verifie avant de livrer

- [ ] Toutes les variables Twig (anciennes et nouvelles) ont un `|default()`
- [ ] Toutes les valeurs SCSS viennent du design system
- [ ] Les attributs ARIA utiles sont presents et coherents
- [ ] Le JSON conserve bien les metadonnees minimales
- [ ] La composition reste descendante
- [ ] Aucun fichier non concerne par la demande n'a ete touche

## Regle d'execution

Ne te limite pas a expliquer quoi faire : modifie reellement les fichiers concernes dans le projet.
