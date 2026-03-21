# Tasks — Refactor agentic setup

## Contexte

Simplification de la gestion des fichiers IA :
- `.claude/` devient la source de vérité unique (suppression de `.ai/`)
- `setup-agentic.js` ne fait que créer (jamais supprimer) et génère copilot ou codex depuis `.claude/`
- Les commandes spec retirées de `.claude/commands/` (déjà fait)

---

## Tâches

- [ ] Supprimer le dossier `.ai/` (devenu redondant)
- [ ] Réécrire `scripts/setup-agentic.js`
  - Source : `.claude/commands/` + `CLAUDE.md`
  - Cibles au choix : `--tool copilot` et/ou `--tool codex`
  - Copilot → `.github/prompts/*.prompt.md` + `.github/copilot-instructions.md`
  - Codex → `.codex/prompts/*.prompt.md` + `AGENTS.md`
  - Ne supprime rien — création uniquement
- [ ] Mettre à jour `.claude/commands/add-tool.md`
  - Retirer toutes les références à `.ai/`
  - Source de vérité = `.claude/commands/`
  - Adapter la checklist à la nouvelle archi
- [ ] Réécrire `.claude/README.md`
  - Retirer les refs `.ai/` et le workflow spec
  - Documenter la nouvelle archi (`.claude/` → source, script → génère copilot/codex)
- [ ] Mettre à jour `.github/README.md` (idem)
- [ ] Mettre à jour `.github/copilot-instructions.md`
  - Retirer `/dev`, `/plan` de la liste des commandes (trop générique)
  - Ne garder que les commandes gofast
- [ ] Réécrire `.codex/README.md`
  - Retirer les refs spec et `.ai/`
  - Documenter la nouvelle archi
