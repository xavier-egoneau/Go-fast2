---
agent: agent
description: Modifier un composant ou une page Go-fast existant (twig / json / scss)
---

# Modifier un composant Go-fast

Tu vas modifier un composant ou une page existant dans ce projet Go-fast v2.

## Étape 1 — Lis GUIDELINES_AI.md

Lis le fichier `GUIDELINES_AI.md` à la racine du projet. Il contient toutes les conventions, règles et exemples. Tu dois les respecter intégralement.

## Étape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Nom** du composant ou de la page à modifier (en kebab-case)
2. **Niveau** : atom / molecule / organism / template / page
3. **Ce qui doit changer** : décris la modification souhaitée

## Étape 3 — Lis les fichiers existants

Avant toute modification, lis les fichiers actuels du composant :
- `dev/components/[nom]/[nom].twig`
- `dev/components/[nom]/[nom].json`
- `dev/assets/scss/components/_[nom].scss`

Pour une page :
- `dev/pages/[nom].twig`
- `dev/pages/[nom].json` si présent

Comprends la structure en place avant d'agir.

## Étape 4 — Applique les modifications

Modifie uniquement les fichiers concernés par la demande :

### `[nom].twig`
- Conserve `{% set var = var|default(...) %}` sur toutes les variables existantes
- Ajoute `|default()` sur toute nouvelle variable introduite
- Maintiens le BEM strict — `.block__element--modifier`
- Préserve les attributs ARIA existants, ajoute ceux requis par les nouvelles fonctionnalités

### `[nom].json` (si les métadonnées ou les variantes doivent évoluer)
- Conserve les 4 champs obligatoires : `name`, `level`, `category`, `description`
- Mets à jour `variants` ou `content` si les contrôles changent

### `_[nom].scss` (si le style doit évoluer)
- Utilise uniquement les variables du design system — zéro valeur hardcodée
- Maintiens `:focus-visible` avec les mixins disponibles si déjà présent
- N'ajoute pas d'import dans `style.scss` — le composant est déjà branché

## Étape 5 — Vérifie

- [ ] Toutes les variables Twig (anciennes et nouvelles) ont un `|default()`
- [ ] Toutes les valeurs CSS utilisent les variables SCSS
- [ ] Les attributs ARIA requis sont présents et cohérents
- [ ] Le JSON conserve les 4 champs obligatoires
- [ ] La composition reste descendante (pas d'atom qui inclut une molecule)
- [ ] Aucun fichier non concerné par la demande n'a été touché
