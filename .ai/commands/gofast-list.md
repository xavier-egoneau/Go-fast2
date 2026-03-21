# /list — Lister les composants Go-fast

Tu vas lister tous les composants du projet Go-fast v2 avec leur niveau et leur statut.

## Étape 1 — Parcours dev/components/

Lis la structure de `dev/components/` pour trouver tous les sous-dossiers (un dossier = un composant).

## Étape 2 — Évalue le statut de chaque composant

Pour chaque composant `dev/components/[nom]/`, vérifie la présence de :
- `[nom].json` — métadonnées (requis)
- `[nom].twig` — template (requis)
- `_[nom].scss` dans `dev/assets/scss/components/` — styles (requis si scss: true dans gofast.config.json)
- `[nom].md` — documentation (requis)
- Import `@use 'components/[nom]'` dans `dev/assets/scss/style.scss` (requis si scss: true)

Statuts possibles :
- **complet** : tous les fichiers requis présents
- **incomplet** : certains fichiers manquants (liste lesquels)
- **vide** : seul le dossier existe, aucun fichier dedans

## Étape 3 — Lis les métadonnées JSON

Pour chaque composant ayant un `.json` valide, extrais :
- `level` (atom / molecule / organism / template)
- `category`
- `description`

## Étape 4 — Affiche le résultat

Présente un tableau récapitulatif :

```
Composants Go-fast — [N] composants trouvés

ATOM (N)
  ✅ [nom]          Forms       Champ de texte accessible
  ⚠️  [nom]          Layout      [manque : .md, import SCSS]
  ❌  [nom]          —           [vide — aucun fichier]

MOLECULE (N)
  ...

ORGANISM (N)
  ...
```

Légende : ✅ complet · ⚠️ incomplet · ❌ vide

En fin de liste, affiche un résumé :
- Total composants
- Complets / incomplets / vides
- Fichiers manquants les plus fréquents
