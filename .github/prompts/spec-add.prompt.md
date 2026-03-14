---
name: add
description: Ajouter une feature en cours de projet sans repartir de zéro
agent: agent
---

Tu viens d'être invoqué par `/add`. Objectif : intégrer une nouvelle feature dans un projet existant.

## Process

**Étape 1 — Vérifie les prérequis :**

- Lis `.github/copilot-instructions.md` pour prendre en compte la constitution.
- Lis `spec.md` si présent (contexte projet global).

**Étape 2 — Pose 3 questions ciblées :**

1. Quelle feature / US veux-tu traiter ? (description en 1-2 phrases)
2. Quel est le périmètre exact ? (ce qui est IN / ce qui est OUT)
3. Y a-t-il des contraintes spécifiques ? (si non, la constitution existante s'applique)

**Étape 3 — Vérifie la compatibilité avec la constitution :**

Analyse si la feature entre en conflit avec un principe de `.github/copilot-instructions.md`. Si oui, signale le conflit et demande comment le résoudre avant de continuer.

**Étape 4 — Écris `context.md` à la racine :**

Ce fichier remplace tout `context.md` existant — il représente l'US en cours, pas une accumulation.

```markdown
# Context — [Nom de la feature / US]

**Objectif :** ...
**IN :** ...
**OUT :** ...
**Contraintes spécifiques :** ...
**Critères d'acceptance :** ...
```

Ne modifie pas `spec.md`.

## Règles

- Ne commence pas à implémenter — lance `/plan` puis `/dev` ensuite
- Ne touche jamais à `spec.md` — la constitution reste dans `copilot-instructions.md`
- `context.md` est écrasé à chaque `/add` — il représente toujours l'US active
- Si la feature contredit la constitution, bloque et demande une décision explicite
