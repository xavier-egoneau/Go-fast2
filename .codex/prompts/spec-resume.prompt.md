# /resume — Reprendre une session

Tu viens d'etre invoque par `/resume`. Objectif : reconstruire le contexte du projet en cours et indiquer la prochaine action.

## Process

Lis ces fichiers dans cet ordre :
1. `AGENTS.md`
2. `CODEX.md`
3. `spec.md`
4. `context.md` si present
5. `tasks.md`

Si `spec.md` est absent, indique qu'il faut lancer `/spec`.
Si `tasks.md` est absent, indique qu'il faut lancer `/plan`.

Puis produis un resume structure sous la forme :

```markdown
## Resume du projet
...

## US en cours
...

## Constitution active
...

## Etat des taches
Completees : X / Y
[x] ...

Restantes :
[ ] ...

## Prochaine action
-> ...
```

## Regles

- Ne modifie aucun fichier
- Ne commence pas a implementer sans demande explicite
