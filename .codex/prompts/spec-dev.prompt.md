# /dev — Implementation

Tu viens d'etre invoque par `/dev`. Objectif : implementer les taches dans l'ordre en respectant la constitution du projet.

## Process

**Etape 1 — Verifie les prerequis :**

- Lis `tasks.md`. S'il est absent, demande de lancer `/plan` d'abord et arrete-toi.
- Lis `AGENTS.md` si present
- Lis `CODEX.md`
- Lis `spec.md`
- Lis `context.md` si present

**Etape 2 — Traite les groupes dans l'ordre**

Pour chaque groupe dans `tasks.md` :

### Groupe `[sequentiel]`

Pour chaque tache non cochee :

1. Cite les principes de la constitution qui s'appliquent
2. Annonce la tache traitee
3. Implemente-la completement
4. Verifie apres implementation que la constitution est respectee
5. Lance les tests si une commande de tests est definie dans `CODEX.md`
6. Coche la tache dans `tasks.md` uniquement si tout est valide

### Groupe `[parallelisable]`

Si l'environnement Codex permet des sous-taches ou une execution parallele, tu peux parallelliser.
Sinon, traite ces taches sequentiellement tout en conservant le groupe comme unite logique.

Dans tous les cas :
1. Cite les principes applicables au groupe
2. Implemente chaque tache completement
3. Lance les tests a la fin du groupe si une commande est definie
4. Coche les taches uniquement apres validation

## Format obligatoire avant chaque tache

```text
Constitution applicable :
- [principe X] -> impact : [ce que cela impose ou interdit ici]
```

Si aucun principe n'est directement concerne, indique-le explicitement.

## Regles

- Ne saute aucune tache
- N'interprete pas silencieusement une tache ambigue : arrete-toi et demande
- Ne coche jamais une tache sans verification reelle
- Continue jusqu'a completion ou blocage explicite
