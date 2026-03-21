# /audit — Auditer la conformité des composants Go-fast

Tu vas vérifier que les composants du projet respectent la constitution Go-fast v2.

## Étape 1 — Lis les références

Lis `GUIDELINES_AI.md` et `gofast.config.json` avant d'agir.

## Étape 2 — Sélectionne les composants à auditer

Par défaut : tous les composants dans `dev/components/`.
Si l'utilisateur précise un nom, audite uniquement ce composant.

## Étape 3 — Vérifie chaque règle constitutionnelle

Pour chaque composant `dev/components/[nom]/` :

### 3a — Fichiers requis
- [ ] `[nom].json` présent
- [ ] `[nom].twig` présent
- [ ] `[nom].md` présent
- [ ] `_[nom].scss` présent dans `dev/assets/scss/components/` (si `scss: true`)

### 3b — JSON valide
- [ ] JSON parseable (syntaxe valide)
- [ ] Champ `name` présent
- [ ] Champ `level` présent et valeur dans `[atom, molecule, organism, template, page]`
- [ ] Champ `category` présent
- [ ] Champ `description` présent

### 3c — Twig : `|default()` obligatoire
- [ ] Toutes les variables `{% set var = ... %}` utilisent `|default(...)` ou `|default`
- Signale chaque variable sans `|default()`

### 3d — SCSS : zéro valeur hardcodée (si `_[nom].scss` existe)
- [ ] Aucune valeur numérique directe pour couleurs (ex: `#fff`, `rgb(...)`)
- [ ] Aucune valeur de spacing hardcodée (ex: `16px`, `1rem` sans variable)
- Signale les lignes suspectes

### 3e — BEM strict (si `_[nom].scss` existe)
- [ ] Les sélecteurs racines correspondent au nom du composant (`.nom-composant`)
- [ ] Les éléments suivent le pattern `.nom-composant__element`
- [ ] Les modificateurs suivent le pattern `.nom-composant--modifier` ou `.nom-composant__element--modifier`

### 3f — Import SCSS dans style.scss (si `scss: true`)
- [ ] `@use 'components/[nom]'` présent dans `dev/assets/scss/style.scss`

## Étape 4 — Rapport

Présente le résultat par composant :

```
AUDIT GO-FAST — [date]

✅ [nom] (atom) — conforme
⚠️  [nom] (molecule) — 2 problèmes
   • Twig : variable `color` sans |default()  (ligne 5)
   • JSON : champ `description` manquant
❌  [nom] — fichiers manquants : .json, .md

---
Résumé : N composants · N conformes · N avertissements · N erreurs
```

En fin de rapport, propose les corrections prioritaires (erreurs critiques en premier).
