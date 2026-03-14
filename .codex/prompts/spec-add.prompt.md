# /add — Ajouter une feature en cours de projet

Tu viens d'etre invoque par `/add`. Objectif : integrer une nouvelle feature dans un projet existant sans repartir de zero.

## Process

**Etape 1 — Verifie les prerequis :**

- Lis `AGENTS.md` si present
- Lis `CODEX.md`
- Lis `spec.md`
- Lis `tasks.md`

Si `spec.md` ou `tasks.md` est absent, demande de lancer d'abord `/spec` puis `/plan`.

**Etape 2 — Pose 3 questions ciblees :**

1. Quelle feature / US veux-tu traiter ?
2. Quel est le perimetre exact ? (IN / OUT)
3. Y a-t-il des contraintes specifiques a cette feature ?

**Etape 3 — Verifie la compatibilite avec la constitution :**

Analyse si la feature entre en conflit avec un principe de `CODEX.md`.
S'il y a conflit, signale-le et demande une decision explicite avant de continuer.

**Etape 4 — Ecris `context.md` a la racine :**

```markdown
# Context — [Nom de la feature / US]

**Objectif :** ...
**IN :** ...
**OUT :** ...
**Contraintes specifiques :** ...
**Criteres d'acceptance :** ...
```

Ne modifie pas `spec.md`.

## Regles

- Ne commence pas a implementer
- `context.md` represente toujours l'US active et remplace l'ancienne
- Si la feature contredit la constitution, bloque proprement
