# Workflow spec -> plan -> dev pour Codex

Version Codex du workflow deja present pour Claude Code et GitHub Copilot.

L'objectif est de garder la meme structuration IA dans le repo :
- un lot de prompts reutilisables
- un fichier de constitution dedie a Codex
- le meme vocabulaire de commandes : `/spec`, `/plan`, `/dev`, `/resume`, `/add`, `/new`

## Principe

Codex ne consomme pas forcement des slash-commands locales comme Claude ou Copilot selon le client utilise.
Du coup, cette version est pensee comme une bibliotheque de prompts projet :

1. ouvrir le prompt voulu dans `.codex/prompts/`
2. le coller dans la session Codex
3. laisser Codex executer le workflow

## Fichier de constitution

La version Codex utilise `CODEX.md` a la racine du projet comme fichier de constitution genere par `/spec`.

Pourquoi pas `AGENTS.md` ?
- `AGENTS.md` contient deja les instructions stables du projet
- l'ecraser automatiquement serait trop risqué
- `CODEX.md` joue donc le role de constitution evolutive du projet, comme `CLAUDE.md` pour Claude

Les prompts Codex ci-dessous demandent systematiquement de lire :
- `AGENTS.md` pour les regles permanentes du repo
- `CODEX.md` pour la constitution generee par le workflow

## Prompts disponibles

```
.codex/
├── README.md
└── prompts/
    ├── gofast-new.prompt.md
    ├── spec-init.prompt.md
    ├── spec-plan.prompt.md
    ├── spec-dev.prompt.md
    ├── spec-resume.prompt.md
    └── spec-add.prompt.md
```

## Workflow recommande

- Nouveau projet : `/spec` -> `/plan` -> `/dev`
- Nouvelle session : `/resume`
- Nouvelle feature en cours de projet : `/add` -> `/plan` -> `/dev`
- Nouveau composant Go-fast : `/new`
- Nouvelle commande IA multi-clients : `/add-tool`

## Fichiers generes par le workflow

```
projet/
├── AGENTS.md
├── CODEX.md
├── spec.md
├── context.md
├── tasks.md
└── .codex/
    └── prompts/
```

## Note d'usage

Si tu veux un usage encore plus natif pour Codex, l'etape suivante serait de transformer ces prompts en skills specialises ou en wrappers d'outillage selon ton environnement.
La base ci-dessous te donne deja le meme coeur methodologique que `.claude/commands/` et `.github/prompts/`.
