---
agent: agent
description: Lister tous les composants Go-fast avec niveau et statut (complet/incomplet/vide)
---

# Lister les composants Go-fast

Tu vas lister tous les composants du projet Go-fast v2 avec leur niveau et leur statut.

## Étape 1 — Parcours dev/components/

Lis la structure de `dev/components/` pour trouver tous les sous-dossiers.

## Étape 2 — Évalue le statut de chaque composant

Pour chaque `dev/components/[nom]/`, vérifie :
- `[nom].json` présent
- `[nom].twig` présent
- `_[nom].scss` dans `dev/assets/scss/components/` (si `scss: true` dans `gofast.config.json`)
- `[nom].md` présent
- Import `@use 'components/[nom]'` dans `style.scss` (si `scss: true`)

Statuts : **complet** · **incomplet** (liste les manquants) · **vide**

## Étape 3 — Lis les métadonnées JSON

Pour chaque composant avec `.json` valide, extrais `level`, `category`, `description`.

## Étape 4 — Affiche le résultat

```
Composants Go-fast — [N] composants

ATOM (N)
  ✅ [nom]   Forms    Description courte
  ⚠️  [nom]   Layout   [manque : .md, import SCSS]
  ❌  [nom]   —        [vide]

MOLECULE (N) ...
```

Résumé final : total · complets · incomplets · vides · fichiers manquants fréquents.
