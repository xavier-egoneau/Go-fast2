# Go-fast v2 — GitHub Copilot

Les prompts sont dans `.github/prompts/` et s'invoquent avec `#[nom]` dans le chat Copilot.

> Ces fichiers sont **générés** depuis `.claude/` via `npm run setup-agentic -- --tool copilot`.
> Ne les modifie pas directement — édite la source dans `.claude/commands/`.

---

## Prompts disponibles

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

## Structure

```
.github/
├── copilot-instructions.md   ← constitution chargée automatiquement par Copilot
├── prompts/                  ← commandes Copilot (générées depuis .claude/)
│   ├── gofast-new.prompt.md
│   └── ...
└── README.md
```
