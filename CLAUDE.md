# CLAUDE.md — Go-fast v2

## Projet

Go-fast v2 — starter kit d'intégration HTML Atomic Design.
Stack : Vite + Vituum + Twig + SCSS + axe-core. Pas de framework frontend.

## Documents de référence

- **`GUIDELINES_AI.md`** — conventions complètes, à lire avant toute création ou modification de composant
- **`docs/impact-map.md`** — carte d'impact : si tu modifies un fichier, consulte ce document pour savoir ce qu'il faut mettre à jour en cascade

## Constitution

Principes non-négociables à vérifier avant chaque implémentation :

- `|default()` obligatoire sur toutes les variables Twig
- Variables SCSS design system uniquement — zéro valeur hardcodée
- BEM strict (`.block__element--modifier`)
- Accessibilité intégrée (focus-visible, ARIA, contrastes WCAG AA)
- Composition descendante : atom → molecule → organism
- JSON = source de vérité par composant (`name`, `level`, `category`, `description`)
- Import SCSS manuel dans `style.scss`
- `app/` ne se modifie jamais — framework showcase isolé

## Agents

- Haiku → exploration, recherche de fichiers
- Sonnet → implémentation, création de composants

## MCP Orbit

Le serveur MCP `orbit` est disponible dans ce projet (`.mcp.json`). Il expose des outils à utiliser en priorité sur les équivalents natifs quand ils sont plus adaptés au contexte.

### Quand utiliser orbit

| Besoin | Outil orbit |
|---|---|
| Vérifier le rendu du showcase dans le navigateur | `browser_open` → `browser_screenshot` |
| Lire l'état d'une page (URL, éléments, console) | `browser_page_state` |
| Diagnostiquer une erreur JS dans le showcase | `browser_console_logs`, `app_diagnose` |
| Lancer `npm run dev` ou un script en arrière-plan | `runtime_start_process` |
| Exécuter une commande shell ponctuelle | `dev_run_command` |
| Vérifier les erreurs runtime d'un process | `runtime_errors`, `runtime_read_logs` |
| Chercher du texte dans le repo | `repo_search_text` |

### Workflow showcase typique

```
runtime_start_process("npm run dev")
  → browser_open("http://localhost:3000")
  → browser_screenshot()          ← vérification visuelle
  → browser_page_state()          ← erreurs console éventuelles
```

### Prérequis

Orbit doit être buildé avant usage : `cd orbit && npm run build`
Le build est déjà effectué — `orbit/dist/` existe.

## Token Optimization Notes
- Run /clear between unrelated experiments
- Run /compact when context gets large

## Commande de tests

*(pas de suite de tests automatisés — vérification manuelle via le showcase)*
