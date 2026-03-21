# Go-fast v2 — Commandes Claude Code

Les commandes sont dans `.claude/commands/` et s'invoquent avec `/nom` dans Claude Code.

`.claude/` est la source de vérité unique pour les commandes IA du projet.

---

## Commandes disponibles

| Commande | Rôle |
|---|---|
| `/new` | Créer un composant (atom / molecule / organism / template) |
| `/edit` | Modifier un composant existant |
| `/delete` | Supprimer un composant |
| `/rename` | Renommer un composant |
| `/move` | Changer le niveau atomique d'un composant |
| `/list` | Lister les composants |
| `/audit` | Auditer la conformité des composants |
| `/from-figma` | Générer un composant depuis Figma |
| `/add-tool` | Créer un outil IA pour Claude, Copilot et/ou Codex |

---

## Synchronisation vers d'autres outils

Pour déployer les commandes vers Copilot ou Codex à partir de `.claude/` :

```bash
npm run setup-agentic -- --tool copilot
npm run setup-agentic -- --tool codex
npm run setup-agentic -- --tool copilot --tool codex
```

Le script lit `.claude/commands/` + `CLAUDE.md` et génère les fichiers adaptés pour chaque outil.
Il ne supprime rien — création uniquement.

---

## Structure

```
.claude/
├── commands/        ← source de vérité des commandes
│   ├── gofast-new.md
│   ├── gofast-edit.md
│   ├── gofast-delete.md
│   ├── gofast-rename.md
│   ├── gofast-move.md
│   ├── gofast-list.md
│   ├── gofast-audit.md
│   ├── gofast-from-figma.md
│   ├── gofast-init.md
│   └── add-tool.md
└── README.md

CLAUDE.md            ← constitution du projet (chargée automatiquement)
```
