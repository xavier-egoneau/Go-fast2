# /list — Lister les composants Go-fast

Tu vas lister tous les composants du projet Go-fast v2 avec leur niveau et statut.

## Etape 1 — Lis les references

Lis `AGENTS.md` et `gofast.config.json`.

## Etape 2 — Parcours dev/components/

Liste tous les sous-dossiers de `dev/components/`.

## Etape 3 — Evalue le statut de chaque composant

Pour chaque `dev/components/[nom]/`, verifie :
- `[nom].json` present
- `[nom].twig` present
- `_[nom].scss` dans `dev/assets/scss/components/` (si scss actif)
- `[nom].md` present
- Import `@use 'components/[nom]'` dans `style.scss` (si scss actif)

Statuts : **complet** · **incomplet** (liste les manquants) · **vide**

## Etape 4 — Lis les metadonnees JSON

Extrais `level`, `category`, `description` pour chaque composant avec `.json` valide.

## Etape 5 — Affiche le resultat

```
Composants Go-fast — [N] composants

ATOM (N)
  OK  [nom]   Forms    Description
  !!  [nom]   Layout   [manque : .md, import SCSS]
  XX  [nom]   —        [vide]

MOLECULE (N) ...
```

Resume : total · complets · incomplets · vides.
