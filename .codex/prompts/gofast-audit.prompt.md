# /audit — Auditer la conformite des composants Go-fast

Tu vas verifier que les composants respectent la constitution Go-fast v2.

## Etape 1 — Lis les references

Lis `AGENTS.md`, `GUIDELINES_AI.md` et `gofast.config.json` avant d'agir.

## Etape 2 — Selecte les composants a auditer

Par defaut : tous. Si l'utilisateur precise un nom, audite uniquement ce composant.

## Etape 3 — Verifie chaque regle

Pour chaque composant `dev/components/[nom]/` :

**Fichiers requis** : `[nom].json`, `[nom].twig`, `[nom].md`, `_[nom].scss` (si scss actif)

**JSON** : parseable, champs `name` + `level` + `category` + `description` presents

**Twig** : toutes les variables `{% set var = ... %}` ont `|default(...)`

**SCSS** : pas de valeurs hardcodees (couleurs, spacing) — variables design system uniquement

**BEM** : selecteurs `.nom-composant`, `.nom-composant__element`, `.nom-composant--modifier`

**Import style.scss** : `@use 'components/[nom]'` present (si scss actif)

## Etape 4 — Rapport

```
AUDIT GO-FAST

OK  [nom] (atom) — conforme
!!  [nom] (molecule) — 2 problemes
    - Twig : variable `color` sans |default()  (ligne 5)
    - JSON : champ `description` manquant
XX  [nom] — fichiers manquants : .json, .md

---
Resume : N composants · N conformes · N avertissements · N erreurs
```

Propose les corrections prioritaires (erreurs critiques en premier).
