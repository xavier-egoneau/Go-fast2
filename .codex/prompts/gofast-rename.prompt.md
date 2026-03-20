# /rename — Renommer un composant Go-fast

Tu vas renommer un composant existant dans ce projet Go-fast v2.

## Etape 1 — Demande les informations manquantes

Si l'utilisateur n'a pas precise, demande :
1. **Nom actuel** du composant (en kebab-case)
2. **Nouveau nom** souhaite (en kebab-case)

## Etape 2 — Identifie tous les fichiers concernes

- `dev/components/[ancien-nom]/` et tous ses fichiers
- `dev/assets/scss/components/_[ancien-nom].scss`
- `dev/assets/scss/style.scss` (import a mettre a jour)
- Tous les `{% include %}` dans `dev/components/**/*.twig` et `dev/pages/**/*.twig`

## Etape 3 — Verifie les dependances

Cherche les `{% include %}` referençant ce composant. Liste-les avant de proceder.

## Etape 4 — Renomme

1. Renomme le dossier `dev/components/[ancien-nom]/` → `dev/components/[nouveau-nom]/`
2. Renomme chaque fichier a l'interieur
3. Renomme `_[ancien-nom].scss` → `_[nouveau-nom].scss`
4. Remplace les selecteurs BEM `.ancien-nom` → `.nouveau-nom` dans le SCSS
5. Remplace les classes BEM dans le Twig
6. Met a jour le champ `"name"` dans le JSON
7. Met a jour l'import dans `style.scss`
8. Met a jour les chemins `{% include %}` dans les fichiers dependants

## Etape 5 — Confirme

Liste les fichiers renommes, mis a jour, et les dependances corrigees.

## Regle d'execution

Ne te limite pas a expliquer : effectue reellement les modifications dans le projet.
