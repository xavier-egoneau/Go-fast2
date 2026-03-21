# /gofast-init — Initialiser un projet Go-fast v2

Tu vas initialiser un nouveau projet Go-fast v2 en scaffoldant la structure `dev/`.

## Étape 1 — Vérifie l'état actuel

Vérifie si `dev/` existe déjà avec du contenu (composants, pages).
Si oui, avertis l'utilisateur : **l'initialisation va effacer `dev/`**. Demande confirmation avant de continuer.

Vérifie que `scripts/init-project.js` et `templates/scss/base/` existent — si non, le starter kit est incomplet.

## Étape 2 — Demande les informations

Demande à l'utilisateur :
1. **Nom du projet** (ex: `mon-site`, `client-acme`)
2. **Stratégie CSS** :
   - `1` SCSS seul *(défaut recommandé)*
   - `2` Tailwind seul
   - `3` SCSS + Tailwind

## Étape 3 — Lance le script d'init

Execute : `node scripts/init-project.js`

Le script va :
- Recréer `dev/` avec la structure vide
- Copier les fichiers SCSS base depuis `templates/scss/base/`
- Générer `style.scss` ou `style.css` selon la stratégie
- Initialiser `dev/data/showcase.json` vide
- Mettre à jour `gofast.config.json` et `package.json`

## Étape 4 — Confirme et oriente

Après l'init, indique :
- Le nom du projet configuré
- La stratégie CSS choisie
- Les prochaines étapes recommandées :
  - `npm run dev` pour lancer le serveur
  - `/new` pour créer un premier composant
  - `/spec` si un cadrage projet est nécessaire
