# Copilot Instructions — Go-fast v2

Ce fichier est chargé automatiquement par GitHub Copilot dans tous les chats du workspace.

## Document de référence

**Lis `GUIDELINES_AI.md` à la racine du projet** avant toute création ou modification de composant. C'est la source de vérité complète pour les conventions du projet.

## Contexte projet

- Go-fast v2 est un starter kit HTML Atomic Design — pas de framework frontend
- Stack : Vite + Vituum + Twig + SCSS + axe-core
- `app/` → framework showcase (ne pas modifier)
- `dev/` → projet utilisateur (travailler ici)
- Lis `tasks.md` s'il existe et coche les tâches complétées

## Règles non-négociables

- `|default()` obligatoire sur toutes les variables Twig
- Variables SCSS design system uniquement — zéro valeur hardcodée
- BEM strict sur toutes les classes CSS (`.block__element--modifier`)
- Accessibilité intégrée dès la conception (focus-visible, ARIA, contrastes)
- Composition descendante : atom → molecule → organism (jamais l'inverse)
- JSON = source de vérité : chaque composant a son JSON avec `name`, `level`, `category`, `description`
- Imports SCSS manuels dans `style.scss` — pas d'auto-génération

## Commandes disponibles

| Commande | Rôle |
|----------|------|
| `/new` | Créer un composant (atom / molecule / organism / template / page) |
| `/dev` | Implémenter les tâches |
| `/plan` | Planifier les tâches |
