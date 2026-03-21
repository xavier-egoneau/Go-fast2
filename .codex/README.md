# Go-fast v2 — Codex

Les prompts sont dans `.codex/prompts/`.

> Ces fichiers sont **générés** depuis `.claude/` via `npm run setup-agentic -- --tool codex`.
> Ne les modifie pas directement — édite la source dans `.claude/commands/`.

---

## Principe

Codex ne consomme pas de slash-commands locales comme Claude ou Copilot.
Cette version est une bibliothèque de prompts projet :

1. ouvre le prompt voulu dans `.codex/prompts/`
2. colle-le dans la session Codex
3. laisse Codex exécuter le workflow

## Fichier de constitution

La version Codex utilise `AGENTS.md` à la racine du projet (généré par `setup-agentic`).

## Prompts disponibles

```
.codex/
├── README.md
└── prompts/
    ├── gofast-new.prompt.md
    ├── gofast-edit.prompt.md
    ├── gofast-delete.prompt.md
    ├── gofast-rename.prompt.md
    ├── gofast-move.prompt.md
    ├── gofast-list.prompt.md
    ├── gofast-audit.prompt.md
    ├── gofast-from-figma.prompt.md
    └── add-tool.prompt.md
```

## Structure complète

```
projet/
├── .claude/          ← source de vérité (éditer ici)
├── .codex/           ← généré par setup-agentic
├── AGENTS.md         ← constitution Codex (générée par setup-agentic)
└── scripts/
    └── setup-agentic.js
```
