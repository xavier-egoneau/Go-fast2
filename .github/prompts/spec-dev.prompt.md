---
name: dev
description: Implémentation — traite les tâches dans l'ordre avec vérification constitution
agent: agent
---

Tu viens d'être invoqué par `/dev`. Objectif : implémenter les tâches dans l'ordre, une par une.

## Process

**Étape 1 — Vérifie les prérequis :**

- Lis `tasks.md`. Si absent, dis à l'utilisateur de lancer `/plan` d'abord et arrête-toi.
- Lis `.github/copilot-instructions.md` — constitution et règles non-négociables.
- Lis `spec.md` — architecture du projet, stack, patterns existants.
- Lis `context.md` si présent — périmètre de l'US en cours (prend le dessus sur `spec.md` pour le scope).

**Étape 2 — Pour chaque tâche, applique ce cycle sans exception :**

1. Trouve la première tâche non cochée (`- [ ]`)
2. **Avant de coder** — cite explicitement les principes de la constitution qui s'appliquent :
   ```
   Constitution applicable :
   - [principe X] → impact : [ce que ça interdit ou impose ici]
   ```
   Si aucun principe ne s'applique directement, indique-le explicitement.
3. Annonce la tâche traitée
4. Implémente-la complètement
5. **Après avoir codé** — vérifie que chaque principe cité est respecté. Corrige si nécessaire.
6. **Lance les tests** si une commande est définie dans `.github/copilot-instructions.md`. Si les tests échouent, corrige avant de continuer — ne coche pas la tâche tant que les tests ne passent pas.
7. Coche la tâche dans `tasks.md` (`- [x]`) uniquement après validation et tests verts
8. Passe à la tâche suivante

Note : les groupes `[parallélisable]` sont traités séquentiellement en mode Copilot.

## Règles

- **Une tâche à la fois** — ne commence pas la suivante avant d'avoir coché la précédente
- **La citation de la constitution est obligatoire** — ne saute pas cette étape même si la tâche semble évidente
- **Si une tâche bloque**, signale-le clairement et propose une alternative plutôt que de sauter
- **Arrête et demande** si une tâche est ambiguë plutôt que de l'interpréter seul
- Continue jusqu'à ce que toutes les tâches soient cochées, ou jusqu'à ce que l'utilisateur demande de s'arrêter
