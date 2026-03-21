# Tasks — Corrections post-critique

## Contexte

Suite à la critique du projet, 6 points à corriger.

---

## Tâches

- [ ] **Refactorer la gestion de `dev/` dans `.gitignore`**
  - Supprimer `dev/` du `.gitignore` racine
  - Créer `dev/.gitignore` avec `*` + `!.gitignore` (ignore le contenu, garde le dossier tracké)

- [ ] **Corriger la typo `task.md` → `tasks.md` dans `.gitignore`**

- [ ] **Réinitialiser `gofast.config.json`**
  - Retirer le nom "test", remettre à l'état template vierge

- [ ] **Ajouter `orbit/dist/` et `orbit/node_modules/` dans `.gitignore` et `.claudeignore`**

- [ ] **Ajouter une entrée auto-référente dans `docs/impact-map.md`**
  - "Si tu modifies impact-map.md → mettre à jour CLAUDE.md si le lien change"

- [ ] **Clarifier `add-tool.md` vs `setup-agentic`**
  - `/add-tool` écrit uniquement dans `.claude/commands/`
  - La sync vers `.github/` et `.codex/` se fait via `npm run setup-agentic`
  - Retirer la logique de création multi-cibles de `add-tool.md`
