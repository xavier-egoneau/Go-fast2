---
agent: agent
description: Renommer un composant Go-fast (dossier, fichiers, imports SCSS, références)
---

# Renommer un composant Go-fast

Tu vas renommer un composant existant dans ce projet Go-fast v2.

## Étape 1 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Nom actuel** du composant (en kebab-case)
2. **Nouveau nom** souhaité (en kebab-case)

## Étape 2 — Identifie tous les fichiers concernés

Pour un composant dans `dev/components/[ancien-nom]/` :
- `dev/components/[ancien-nom]/[ancien-nom].twig`
- `dev/components/[ancien-nom]/[ancien-nom].json`
- `dev/components/[ancien-nom]/[ancien-nom].md` (si présent)
- `dev/assets/scss/components/_[ancien-nom].scss`

Et les fichiers à mettre à jour :
- `dev/assets/scss/style.scss` (ligne `@use 'components/[ancien-nom]'`)
- Tous les fichiers `dev/components/**/*.twig` et `dev/pages/**/*.twig` qui incluent ce composant

## Étape 3 — Vérifie les dépendances

Cherche les `{% include %}` référençant ce composant dans `dev/`. Liste-les avant de procéder.

## Étape 4 — Renomme

1. Renomme le dossier `dev/components/[ancien-nom]/` → `dev/components/[nouveau-nom]/`
2. Renomme chaque fichier à l'intérieur
3. Renomme `_[ancien-nom].scss` → `_[nouveau-nom].scss`
4. Dans `_[nouveau-nom].scss` : remplace les sélecteurs BEM `.ancien-nom` → `.nouveau-nom`
5. Dans `[nouveau-nom].twig` : remplace les classes BEM `.ancien-nom` → `.nouveau-nom`
6. Dans `[nouveau-nom].json` : met à jour le champ `"name"`
7. Dans `style.scss` : remplace l'import
8. Dans tous les fichiers dépendants : met à jour les chemins `{% include %}`

## Étape 5 — Confirme

Liste les fichiers renommés, mis à jour, et les dépendances corrigées.
