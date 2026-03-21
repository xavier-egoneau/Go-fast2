# /add-tool — Créer un outil IA pour Copilot et/ou Codex

Tu viens d'être invoqué par `/add-tool`.

Objectif : quand l'utilisateur décrit une nouvelle commande, tu dois créer sa version Claude Code dans `.claude/commands/`, puis générer les variantes pour les outils actifs dans le repo (Copilot, Codex).

## Étape 1 — Lis le contexte du repo

Lis ces fichiers avant d'agir :
- `CLAUDE.md`
- `.claude/README.md`

Vérifie la présence des dossiers pour déterminer quels outils sont actifs :
- `.github/prompts/` → Copilot actif
- `.codex/prompts/` → Codex actif

Observe `.claude/commands/` pour reproduire le style existant.

## Étape 2 — Recueille les informations minimales

Si l'utilisateur n'a pas tout donné, demande seulement ce qui manque :
1. le nom de la commande
2. son objectif
3. le comportement attendu
4. si elle doit créer des fichiers, lesquels
5. si elle est en lecture seule ou si elle modifie le projet

Si le besoin est assez clair, ne pose pas de questions inutiles.

## Étape 3 — Choisis le mapping de noms

Normalise le nom fourni par l'utilisateur et crée les fichiers correspondants :

- Claude Code (toujours) :
  - `.claude/commands/[nom].md`
- GitHub Copilot (si `.github/prompts/` existe) :
  - `.github/prompts/[nom].prompt.md`
- Codex (si `.codex/prompts/` existe) :
  - `.codex/prompts/[nom].prompt.md`

Utilise le même nom logique partout.

## Étape 4 — Génère les versions

La logique doit être identique dans toutes les variantes, avec seulement les adaptations nécessaires au client :

- Claude (source de vérité) :
  - pas de frontmatter
  - références à `CLAUDE.md`
- Copilot :
  - ajouter le frontmatter attendu (`agent`, `description`)
  - références à `.github/copilot-instructions.md`
- Codex :
  - format prompt simple
  - remplacer `CLAUDE.md` par `AGENTS.md`

## Étape 5 — Règles de synchronisation

- le fond doit rester le même dans toutes les variantes
- les différences ne doivent venir que du client cible
- évite les divergences de workflow

## Étape 6 — Vérifie avant de livrer

- [ ] `.claude/commands/[nom].md` existe
- [ ] les variantes existent pour chaque outil actif dans le repo
- [ ] le nom est cohérent partout
- [ ] le comportement de base est le même partout
- [ ] les références de fichiers sont adaptées à chaque outil

## Règle d'exécution

Ne te contente pas de proposer un contenu.
Crée ou mets à jour réellement les fichiers dans le repo.

> Pour synchroniser Copilot et Codex à partir de `.claude/`, utilise `npm run setup-agentic`.
