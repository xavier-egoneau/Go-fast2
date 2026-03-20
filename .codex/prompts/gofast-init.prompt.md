# /gofast-init — Initialiser un projet Go-fast v2

Tu vas initialiser un nouveau projet Go-fast v2 en scaffoldant la structure `dev/`.

## Etape 1 — Lis les references

Lis `AGENTS.md` avant d'agir.

## Etape 2 — Verifie l'etat actuel

Verifie si `dev/` existe deja avec du contenu. Si oui, avertis : **l'init va ecraser `dev/`**. Demande confirmation.
Verifie que `scripts/init-project.js` et `templates/scss/base/` existent.

## Etape 3 — Demande les informations

1. **Nom du projet**
2. **Strategie CSS** : `1` SCSS seul · `2` Tailwind seul · `3` SCSS + Tailwind

## Etape 4 — Lance le script d'init

Execute : `node scripts/init-project.js`

Le script cree `dev/` avec la structure vide, copie les fichiers SCSS base, initialise `showcase.json`, met a jour `gofast.config.json` et `package.json`.

## Etape 5 — Confirme et oriente

Indique le nom du projet, la strategie CSS, et les prochaines etapes :
- `npm run dev` pour lancer le serveur
- `/new` pour creer un premier composant

## Regle d'execution

Execute le script. Ne te limite pas a expliquer.
