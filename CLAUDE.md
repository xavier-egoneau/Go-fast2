# CLAUDE.md — Go-fast v2

## Projet

Go-fast v2 — starter kit d'intégration HTML Atomic Design.
Stack : Vite + Vituum + Twig + SCSS + axe-core. Pas de framework frontend.

## Document de référence

**Lis `GUIDELINES_AI.md`** avant toute création ou modification de composant. C'est la source de vérité complète.

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

## Token Optimization Notes
- Run /clear between unrelated experiments
- Run /compact when context gets large

## Commande de tests

*(pas de suite de tests automatisés — vérification manuelle via le showcase)*
