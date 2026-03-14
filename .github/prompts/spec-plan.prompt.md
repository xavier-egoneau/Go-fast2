---
name: plan
description: Planification des tâches — décompose le projet et génère tasks.md
agent: agent
---

Tu viens d'être invoqué par `/plan`. Objectif : décomposer le projet en tâches actionnables.

## Process

**Étape 1 — Vérifie les prérequis :**

- Lis `.github/copilot-instructions.md` pour prendre en compte la constitution.
- Lis `context.md` s'il existe — il définit le périmètre de l'US en cours.
- Sinon, lis `spec.md`. Si absent également, dis à l'utilisateur de lancer `/spec` d'abord et arrête-toi.

> Priorité de lecture : `context.md` > `spec.md`. Si `context.md` est présent, c'est lui qui délimite le périmètre à planifier.

**Étape 2 — Analyse les dépendances entre tâches :**

Pour chaque groupe de tâches, détermine :
- Les tâches dépendent d'un groupe précédent ? → `[séquentiel]`
- Les tâches sont indépendantes (fichiers différents, domaines distincts) ? → `[parallélisable]`

Note : en mode Copilot, les tâches `[parallélisable]` restent traitées séquentiellement — le marqueur sert à l'information.

**Étape 3 — Génère `tasks.md` à la racine :**

```markdown
# Tasks — [Nom du projet]

## [Groupe fondations] [séquentiel]
- [ ] Tâche concrète et actionnable
- [ ] ...

## [Groupe features] [parallélisable]
- [ ] ...
- [ ] ...

## [Groupe intégration] [séquentiel]
- [ ] ...
```

**Règles de décomposition :**

- Chaque tâche = une action concrète vérifiable
- Maximum 20 tâches au total
- Ordre logique : fondations → fonctionnalités → polish
- Pas de tâches de documentation — uniquement du code qui tourne

**Étape 4 — Présente le plan à l'utilisateur** avant d'écrire `tasks.md` :

- Montre la liste complète avec les marqueurs
- Demande validation ou ajustements
- Écris `tasks.md` seulement après accord

## Règles

- Ne commence pas à implémenter. `/dev` vient ensuite.
- `tasks.md` est toujours écrasé — chaque `/plan` repart de zéro pour l'US en cours.
