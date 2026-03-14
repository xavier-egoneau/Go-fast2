# /add-tool — Créer un outil IA pour Claude, Codex et Copilot

Tu viens d'etre invoque par `/add-tool`.

Objectif : quand l'utilisateur decrit une nouvelle commande ou un nouveau prompt systeme, tu dois creer son equivalent pour les 3 environnements du projet :
- Claude Code
- Codex
- GitHub Copilot

Tu ne crees pas une seule variante. Tu livres toujours le trio complet.

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

Si le besoin est assez clair, ne pose pas de questions inutiles.

## Etape 3 — Choisis le mapping de noms

Normalise le nom fourni par l'utilisateur et cree les fichiers correspondants :

- Claude Code :
  - `.claude/commands/[nom].md`
- GitHub Copilot :
  - `.github/prompts/[nom].prompt.md`
- Codex :
  - `.codex/prompts/[nom].prompt.md`

Utilise le meme nom logique partout.

## Etape 4 — Genere les 3 versions

La logique doit etre identique dans les 3 fichiers, avec seulement les adaptations necessaires au client :

- Claude :
  - pas de frontmatter
  - references a `CLAUDE.md` si la commande utilise la constitution Claude
- Copilot :
  - ajouter le frontmatter attendu dans `.github/prompts/`
  - references a `.github/copilot-instructions.md` si necessaire
- Codex :
  - format prompt simple, coherent avec `.codex/prompts/`
  - references a `AGENTS.md` et `CODEX.md` si necessaire

## Etape 5 — Regles de synchronisation

Quand tu crees ou modifies cet outil :

- le fond doit rester le meme dans les 3 variantes
- les differences ne doivent venir que du client cible
- evite les divergences de workflow
- si une variante existante contient deja des specifics utiles, reintegre-les dans les 2 autres si pertinent

## Etape 6 — Verifie avant de livrer

Controle ces points :
- [ ] les 3 fichiers existent
- [ ] le nom est coherent partout
- [ ] le comportement de base est le meme partout
- [ ] les references de fichiers sont adaptees a chaque outil
- [ ] aucune variante n'est oubliee

## Regle d'execution

Ne te contente pas de proposer un contenu.
Cree ou mets a jour reellement les 3 fichiers dans le repo.
