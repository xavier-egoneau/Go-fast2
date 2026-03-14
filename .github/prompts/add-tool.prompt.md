---
name: add-tool
description: Créer une nouvelle commande IA synchronisée pour Claude, Codex et GitHub Copilot
agent: agent
---

Tu viens d'etre invoque par `/add-tool`.

Objectif : quand l'utilisateur decrit une nouvelle commande ou un nouveau prompt systeme, tu dois creer son equivalent pour les 3 environnements du projet :
- Claude Code
- Codex
- GitHub Copilot

Tu ne livres jamais une seule variante isolee. Tu produis toujours les 3 fichiers.

## Etape 1 — Lis le contexte du repo

Lis ces fichiers avant d'agir :
- `AGENTS.md`
- `.claude/README.md`
- `.github/README.md`
- `.codex/README.md` si present

Puis observe les dossiers suivants pour reproduire le style existant :
- `.claude/commands/`
- `.github/prompts/`
- `.codex/prompts/` si present

## Etape 2 — Recueille les informations minimales

Si l'utilisateur n'a pas tout donne, demande seulement ce qui manque :
1. le nom de la commande
2. son objectif
3. le comportement attendu
4. si elle doit creer des fichiers, lesquels
5. si elle est en lecture seule ou si elle modifie le projet

Si le besoin est deja clair, ne ralentis pas avec des questions superflues.

## Etape 3 — Choisis le mapping de noms

Normalise le nom fourni par l'utilisateur et cree les fichiers correspondants :

- `.claude/commands/[nom].md`
- `.github/prompts/[nom].prompt.md`
- `.codex/prompts/[nom].prompt.md`

Utilise le meme nom logique partout.

## Etape 4 — Genere les 3 versions

Le workflow doit rester identique dans les 3 variantes, avec seulement les adaptations necessaires au client :

- Claude :
  - pas de frontmatter
  - references a `CLAUDE.md` si necessaire
- Copilot :
  - frontmatter obligatoire
  - references a `.github/copilot-instructions.md` si necessaire
- Codex :
  - format prompt simple
  - references a `AGENTS.md` et `CODEX.md` si necessaire

## Etape 5 — Regles de synchronisation

- le fond doit rester le meme dans les 3 variantes
- les differences doivent etre uniquement structurelles ou liees au client
- si tu mets a jour une commande existante, aligne aussi les deux autres versions

## Etape 6 — Verifie avant de livrer

- [ ] les 3 fichiers existent
- [ ] le nom est coherent partout
- [ ] le comportement de base est identique
- [ ] les references de fichiers sont adaptees a chaque client
- [ ] aucune variante n'est oubliee

## Regle d'execution

Ne te limite pas a decrire la commande : cree ou mets a jour reellement les 3 fichiers.
