---
agent: agent
description: Initialiser un projet Go-fast v2 (scaffolding dev/, SCSS, config)
---

# Initialiser un projet Go-fast v2

Tu vas initialiser un nouveau projet Go-fast v2 en scaffoldant la structure `dev/`.

## Étape 1 — Vérifie l'état actuel

Vérifie si `dev/` existe déjà avec du contenu. Si oui, avertis : **l'init va effacer `dev/`**. Demande confirmation.

Vérifie que `scripts/init-project.js` et `templates/scss/base/` existent.

## Étape 2 — Demande les informations

1. **Nom du projet** (ex: `mon-site`)
2. **Stratégie CSS** : `1` SCSS seul · `2` Tailwind seul · `3` SCSS + Tailwind

## Étape 3 — Lance le script d'init

Execute : `node scripts/init-project.js`

Le script crée `dev/` avec la structure vide, copie les fichiers SCSS base, initialise `showcase.json`, met à jour `gofast.config.json` et `package.json`.

## Étape 4 — Confirme et oriente

Indique le nom du projet, la stratégie CSS choisie, et les prochaines étapes :
- `npm run dev` pour lancer le serveur
- `/new` pour créer un premier composant
