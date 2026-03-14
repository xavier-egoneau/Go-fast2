# /add-tool — Creer une commande IA synchronisee pour Claude, Codex et Copilot

Tu viens d'etre invoque par `/add-tool`.

Objectif : quand l'utilisateur decrit une nouvelle commande ou un nouveau prompt systeme, tu dois creer son equivalent pour les 3 environnements du projet :
- Claude Code
- Codex
- GitHub Copilot

Tu dois toujours produire le trio complet.

## Etape 1 — Lis le contexte du repo

Lis ces fichiers avant d'agir :
- `AGENTS.md`
- `.claude/README.md`
- `.github/README.md`
- `.codex/README.md` si present

Puis observe les dossiers suivants pour reproduire le style et les conventions deja en place :
- `.claude/commands/`
- `.github/prompts/`
- `.codex/prompts/` si present

## Etape 2 — Recueille les informations minimales

Si l'utilisateur n'a pas tout precise, demande seulement ce qui manque :
1. le nom de la commande
2. son objectif
3. le comportement attendu
4. les fichiers qu'elle doit creer ou modifier
5. si elle est lecture seule ou editable

Si la demande est deja suffisamment claire, avance sans poser plus de questions.

## Etape 3 — Choisis le mapping de noms

Normalise le nom et cree ces fichiers :
- `.claude/commands/[nom].md`
- `.github/prompts/[nom].prompt.md`
- `.codex/prompts/[nom].prompt.md`

Le nom logique doit rester le meme partout.

## Etape 4 — Genere les 3 variantes

Le comportement doit rester equivalent dans les 3 versions.

Adapte seulement ce qui depend du client :
- Claude :
  - pas de frontmatter
  - references a `CLAUDE.md` si la constitution Claude est utile
- Copilot :
  - frontmatter adapte a `.github/prompts/`
  - references a `.github/copilot-instructions.md` si necessaire
- Codex :
  - format prompt simple
  - references a `AGENTS.md` et `CODEX.md` si necessaire

## Etape 5 — Regles de synchronisation

- le fond du workflow doit etre le meme dans les 3 fichiers
- les differences ne doivent venir que des contraintes du client
- si une commande existe deja dans un environnement, aligne les deux autres versions plutot que de laisser diverger

## Etape 6 — Verifie avant de livrer

- [ ] les 3 fichiers existent
- [ ] le nom est coherent partout
- [ ] le comportement de base est le meme
- [ ] les references de fichiers sont adaptees a chaque client
- [ ] aucune variante n'est oubliee

## Regle d'execution

Ne te contente pas d'expliquer quoi faire.
Cree ou mets a jour reellement les 3 fichiers dans le repo.
