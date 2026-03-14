# AGENTS.md — Go-fast v2

Instructions pour les agents OpenAI (Codex, ChatGPT avec accès fichiers, etc.)

---

## Projet

**Go-fast v2** est un starter kit d'intégration HTML orienté design system Atomic Design. Stack : Vite + Vituum + Twig + SCSS. Pas de framework frontend.

## Document de référence

**Lis `GUIDELINES_AI.md` en priorité.** C'est le seul document dont tu as besoin pour créer du bon travail. Il couvre :
- Hiérarchie Atomic Design et structure des fichiers
- Format JSON, Twig et SCSS de chaque composant
- Variables SCSS disponibles
- Règles d'accessibilité
- Procédure complète de création

## Structure du projet

```
app/      → Framework showcase (ne pas modifier)
dev/      → Projet utilisateur (travailler ici)
scripts/  → Utilitaires Node
```

## Commandes

```bash
npm run dev      # Serveur de développement (port 3000)
npm run build    # Build de production
npm run reset    # Remet dev/ à zéro
```

## Créer un composant

1. Dossier `dev/components/[nom]/` avec `[nom].json` + `[nom].twig`
2. Fichier `dev/assets/scss/components/_[nom].scss`
3. Import dans `dev/assets/scss/style.scss`
4. Voir `GUIDELINES_AI.md` §8 pour la procédure détaillée

## Règles non-négociables

- `|default()` obligatoire sur toutes les variables Twig
- Variables SCSS design system uniquement — zéro valeur hardcodée
- BEM strict sur toutes les classes CSS
- Accessibilité intégrée dès la conception
- Composition descendante : atom → molecule → organism (jamais l'inverse)
- Ne jamais modifier `app/` — c'est le framework showcase
