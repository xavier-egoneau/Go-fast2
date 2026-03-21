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

## Étape 3 — Crée la commande Claude

`.claude/commands/` est la source de vérité unique. Tu ne crées **que** le fichier Claude :

- `.claude/commands/[nom].md`

Les variantes Copilot et Codex sont générées automatiquement depuis cette source via `npm run setup-agentic`. Tu ne les écris pas à la main.

## Étape 4 — Règles de rédaction

- pas de frontmatter
- références à `CLAUDE.md` pour la constitution
- étapes numérotées, checklist de vérification en fin de commande
- règle d'exécution explicite en dernière section

## Étape 5 — Vérifie avant de livrer

- [ ] `.claude/commands/[nom].md` existe
- [ ] le nom est en kebab-case
- [ ] le comportement attendu est décrit clairement
- [ ] une checklist de vérification est présente

## Règle d'exécution

Ne te contente pas de proposer un contenu.
Crée ou mets à jour réellement le fichier dans `.claude/commands/`.

Ensuite, informe l'utilisateur :
> Commande créée dans `.claude/commands/`. Pour la déployer vers Copilot ou Codex :
> ```bash
> npm run setup-agentic -- --tool copilot
> npm run setup-agentic -- --tool codex
> ```
