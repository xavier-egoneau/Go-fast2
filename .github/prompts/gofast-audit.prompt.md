---
agent: agent
description: Auditer la conformité des composants Go-fast (|default(), BEM, .md, SCSS, JSON)
---

# Auditer la conformité des composants Go-fast

Tu vas vérifier que les composants respectent la constitution Go-fast v2.

## Étape 1 — Lis les références

Lis `GUIDELINES_AI.md` et `gofast.config.json` avant d'agir.

## Étape 2 — Sélectionne les composants à auditer

Par défaut : tous. Si l'utilisateur précise un nom, audite uniquement ce composant.

## Étape 3 — Vérifie chaque règle

Pour chaque composant `dev/components/[nom]/` :

### Fichiers requis
- `[nom].json`, `[nom].twig`, `[nom].md` présents
- `_[nom].scss` dans `dev/assets/scss/components/` (si scss actif)

### JSON valide
- Parseable + champs `name`, `level`, `category`, `description` présents
- `level` dans `[atom, molecule, organism, template, page]`

### Twig : `|default()` obligatoire
- Toutes les variables `{% set var = ... %}` utilisent `|default(...)`
- Signale chaque variable sans `|default()`

### SCSS : zéro valeur hardcodée
- Pas de couleurs directes (`#fff`, `rgb(...)`)
- Pas de spacing hardcodé (`16px`, `1rem` sans variable)

### BEM strict
- Sélecteurs racines = `.nom-composant`
- Éléments = `.nom-composant__element`
- Modificateurs = `.nom-composant--modifier`

### Import SCSS dans style.scss
- `@use 'components/[nom]'` présent (si scss actif)

## Étape 4 — Rapport

```
AUDIT GO-FAST

✅ [nom] (atom) — conforme
⚠️  [nom] (molecule) — 2 problèmes
   • Twig : variable `color` sans |default()  (ligne 5)
   • JSON : champ `description` manquant
❌  [nom] — fichiers manquants : .json, .md

---
Résumé : N composants · N conformes · N avertissements · N erreurs
```

Propose les corrections prioritaires (erreurs critiques en premier).
