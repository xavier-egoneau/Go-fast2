# /delete — Supprimer un composant Go-fast

Tu vas supprimer un composant ou une page existant dans ce projet Go-fast v2.

## Étape 1 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Nom** du composant ou de la page à supprimer (en kebab-case)
2. **Niveau** : atom / molecule / organism / template / page

## Étape 2 — Identifie les fichiers concernés

Liste les fichiers à supprimer selon le type :

Pour un composant :
- `dev/components/[nom]/[nom].twig`
- `dev/components/[nom]/[nom].json`
- `dev/assets/scss/components/_[nom].scss`
- le dossier `dev/components/[nom]/` lui-même

Pour une page :
- `dev/pages/[nom].twig`
- `dev/pages/[nom].json` si présent

## Étape 3 — Vérifie les dépendances

Cherche dans `dev/` si d'autres composants incluent ce composant via `{% include %}`.
Si des dépendances existent, avertis l'utilisateur et demande confirmation avant de continuer.

## Étape 4 — Supprime

1. Supprime les fichiers et le dossier du composant
2. Pour un composant : retire la ligne d'import dans `dev/assets/scss/style.scss` :
   ```scss
   @use 'components/[nom]';
   ```

## Étape 5 — Confirme

Liste les fichiers supprimés et la ligne retirée de `style.scss`.
