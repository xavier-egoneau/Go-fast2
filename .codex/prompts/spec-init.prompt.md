# /spec — Specification du projet

Tu viens d'etre invoque par `/spec`. Objectif : comprendre le projet avant toute ligne de code.

## Process

**Etape 1 — Lis d'abord `AGENTS.md` si present.**

**Etape 2 — Pose ces 6 questions une par une, attends chaque reponse :**

1. Quel est l'objectif principal ? Qu'est-ce que l'utilisateur doit pouvoir faire ?
2. Qui sont les utilisateurs ? Quel est le contexte d'usage ?
3. Quel est le perimetre ? (ce qui est IN / ce qui est OUT explicitement)
4. Quelles sont les contraintes techniques importantes ? (stack, donnees, dependances)
5. Quel est le critere de succes minimal — comment sait-on que c'est done ?
6. Quelle commande lance les tests ? (repondre `aucun` s'il n'y en a pas)

**Etape 3 — Genere `spec.md` a la racine du projet :**

```markdown
# Spec — [Nom du projet]

## Objectif
...

## Utilisateurs
...

## Perimetre
**IN :** ...
**OUT :** ...

## Contraintes
...

## Succes (MVP)
...
```

**Etape 4 — Cree ou mets a jour `CODEX.md` a la racine avec une section `## Constitution` :**

Extrais 3 a 5 principes non-negociables formules en imperatif.

```markdown
## Constitution

Principes non-negociables pour ce projet :
- [principe 1]
- [principe 2]
- ...

## Contexte projet

- Lis toujours `AGENTS.md` au debut de la session s'il existe
- Lis toujours `tasks.md` s'il existe
- Respecte la constitution ci-dessus a chaque implementation
- Apres chaque tache completee, coche-la dans `tasks.md`
- Commande de tests : [reponse a la question 6, ou `aucun`]
```

## Regles

- Ne planifie pas et ne code pas. `/plan` vient ensuite.
- Si `spec.md` existe deja, propose de le mettre a jour plutot que de l'ecraser.
- N'ecrase pas `AGENTS.md`.
