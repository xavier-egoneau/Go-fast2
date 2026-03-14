# /delete — Supprimer un composant Go-fast

Tu vas supprimer un composant ou une page existant dans ce projet Go-fast v2.

## Etape 1 — Demande les informations manquantes

Si l'utilisateur n'a pas precise, demande :
1. **Nom** du composant ou de la page a supprimer (en kebab-case)
2. **Niveau** : atom / molecule / organism / template / page

## Etape 2 — Identifie les fichiers concernes

Liste les fichiers a supprimer selon le type :

Pour un composant :
- `dev/components/[nom]/[nom].twig`
- `dev/components/[nom]/[nom].json`
- `dev/assets/scss/components/_[nom].scss`
- le dossier `dev/components/[nom]/` lui-meme

Pour une page :
- `dev/pages/[nom].twig`
- `dev/pages/[nom].json` si present

## Etape 3 — Verifie les dependances

Cherche dans `dev/` si d'autres composants incluent ce composant via `{% include %}`.
Si des dependances existent, avertis l'utilisateur et demande confirmation avant de continuer.

## Etape 4 — Supprime

1. Supprime les fichiers et le dossier du composant
2. Pour un composant : retire la ligne d'import dans `dev/assets/scss/style.scss` :
   ```scss
   @use 'components/[nom]';
   ```

## Etape 5 — Confirme

Liste les fichiers supprimes et la ligne retiree de `style.scss`.

## Regle d'execution

Ne te limite pas a expliquer quoi faire : supprime reellement les fichiers et mets a jour `style.scss`.
