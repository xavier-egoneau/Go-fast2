# Instructions — Go-fast v2

Go-fast v2 — starter kit d'intégration HTML Atomic Design.
Stack : Vite + Vituum + Twig + SCSS + axe-core. Pas de framework frontend.

## Document de référence

**Lis `GUIDELINES_AI.md`** avant toute création ou modification de composant. C'est la source de vérité complète.

## Structure du projet

```
app/      → Framework showcase (ne pas modifier)
dev/      → Projet utilisateur (travailler ici)
scripts/  → Utilitaires Node
```

## Commandes disponibles

| Commande       | Rôle                                                         |
|----------------|--------------------------------------------------------------|
| `/spec`        | Spécifier le projet                                          |
| `/plan`        | Planifier les tâches                                         |
| `/dev`         | Implémenter les tâches                                       |
| `/resume`      | Reprendre une session                                        |
| `/add`         | Ajouter une feature en cours de projet                       |
| `/new`         | Créer un composant (atom / molecule / organism / template)   |
| `/edit`        | Modifier un composant existant                               |
| `/delete`      | Supprimer un composant                                       |
| `/rename`      | Renommer un composant                                        |
| `/move`        | Changer le niveau atomique d'un composant                    |
| `/list`        | Lister les composants                                        |
| `/audit`       | Auditer la conformité des composants                         |
| `/from-figma`  | Générer un composant depuis Figma                            |
| `/add-tool`    | Créer un outil IA pour Claude, Codex et Copilot              |

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

## Commandes de base

```bash
npm run dev      # Serveur de développement (port 3000)
npm run build    # Build de production
npm run reset    # Remet dev/ à zéro
```

## Tests

*(pas de suite de tests automatisés — vérification manuelle via le showcase)*
