# /plan — Planification des taches

Tu viens d'etre invoque par `/plan`. Objectif : decomposer le projet en taches actionnables et identifier ce qui peut etre parallellise.

## Process

**Etape 1 — Verifie les prerequis :**

- Lis `AGENTS.md` si present
- Lis `CODEX.md` pour prendre en compte la constitution
- Lis `context.md` s'il existe
- Sinon lis `spec.md`
- Si ni `context.md` ni `spec.md` n'existent, demande de lancer `/spec` d'abord puis arrete-toi

> Priorite de lecture : `context.md` > `spec.md`

**Etape 2 — Analyse les dependances entre taches :**

Pour chaque groupe de taches, determine :
- dependances vers un groupe precedent -> `[sequentiel]`
- taches independantes sur des fichiers ou domaines distincts -> `[parallelisable]`

**Etape 3 — Presente le plan a l'utilisateur avant ecriture**

Montre la liste complete avec les marqueurs `[sequentiel]` et `[parallelisable]`, puis demande validation ou ajustements.

**Etape 4 — Ecris `tasks.md` a la racine seulement apres accord**

```markdown
# Tasks — [Nom du projet]

## [Groupe fondations] [sequentiel]
- [ ] Tache concrete et actionnable
- [ ] ...

## [Groupe features] [parallelisable]
- [ ] ...
- [ ] ...

## [Groupe integration] [sequentiel]
- [ ] ...
```

## Regles de decomposition

- Chaque tache = une action concrete et verifiable
- Maximum 20 taches au total
- Ordre logique : fondations -> fonctionnalites -> integration -> polish
- Pas de taches de documentation
- Les groupes `[parallelisable]` ne doivent jamais viser le meme fichier

## Regles

- Ne commence pas a implementer. `/dev` vient ensuite.
- `tasks.md` est toujours ecrase a chaque nouvel appel de `/plan`.
