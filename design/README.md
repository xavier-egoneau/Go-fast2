# Design Surface

Prototype de mode design pour Go-fast2.

## Démarrage

```bash
npm run design
```

Puis ouvrir :

- `http://localhost:3000/design/`

## MVP actuel

- library alimentée par `dev/data/showcase.json`
- canvas simple
- rendu réel via iframes Twig
- inspector auto-généré depuis les métadonnées JSON
- persistance locale via `localStorage`

## Limites actuelles

- pas encore de scènes sur fichiers JSON
- pas encore de tokens panel
- pas encore de drag & drop / resize visuel
- sélection au niveau item canvas uniquement
