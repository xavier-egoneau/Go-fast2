# Go-fast v2

Starter kit d'intégration HTML — Atomic Design + Showcase interactif + Multi-AI

![alt text](image.png)
![alt text](image-1.png)
---

## Démarrage rapide

```bash
npm install
npm run dev
```

Le showcase s'ouvre sur **http://localhost:3000**

---

## Commandes

```bash
npm run dev      # Serveur de développement avec HMR
npm run build    # Build de production (→ public/)
npm run preview  # Prévisualiser le build
npm run reset    # Remettre dev/ à zéro pour un nouveau projet
```

---

## Commandes IA

### Claude Code
```
/new    → Créer un composant (atom / molecule / organism / template / page)
/plan   → Planifier les tâches du projet
/dev    → Implémenter les tâches
```

### GitHub Copilot
Les mêmes commandes sont disponibles dans `.github/prompts/`.

---

## Structure

```
go-fast/
├── app/                    # Framework showcase — ne pas modifier
│   ├── config/             # Design tokens de référence
│   ├── scripts/            # showcase.js, quality.js, welcome.js
│   ├── styles/             # showcase.scss (isolation totale)
│   └── templates/          # index.twig, page-showcase.twig
│
├── dev/                    # Votre projet — travaillez ici
│   ├── components/         # Atoms, molecules, organisms, templates
│   │   └── [nom]/
│   │       ├── [nom].json  # Source de vérité : level, variants, content
│   │       └── [nom].twig  # Template Twig
│   ├── pages/              # Pages complètes
│   ├── layouts/            # Layouts Twig réutilisables
│   └── assets/
│       └── scss/
│           ├── base/       # Variables, reset, mixins, typographie
│           ├── components/ # Un fichier SCSS par composant
│           └── style.scss  # Point d'entrée (imports manuels)
│
├── scripts/
│   ├── generate-showcase.js  # Génère dev/data/showcase.json
│   └── reset-project.js      # Remet dev/ à zéro
│
├── GUIDELINES_AI.md        # Conventions complètes — lire avant de coder
├── gofast.config.json      # Config projet
└── vite.config.js
```

---

## Créer un composant

### Avec l'IA

Utilisez `/new` dans Claude Code ou GitHub Copilot.

### Manuellement

1. Créer `dev/components/[nom]/[nom].json`
2. Créer `dev/components/[nom]/[nom].twig`
3. Créer `dev/assets/scss/components/_[nom].scss`
4. Ajouter `@use 'components/[nom]';` dans `style.scss`

Voir `GUIDELINES_AI.md` pour les règles complètes.

---

## Configuration

`gofast.config.json` :

```json
{
  "tailwind": false,
  "projectName": "Mon Projet"
}
```

Mettre `"tailwind": true` pour activer Tailwind CSS v4.

---

## Atomic Design

| Niveau | Emplacement | Description |
|--------|-------------|-------------|
| Atom | `dev/components/` | Élément indivisible — bouton, input, badge |
| Molecule | `dev/components/` | Composition d'atoms — champ de formulaire, carte |
| Organism | `dev/components/` | Composition de molecules — header, formulaire |
| Template | `dev/components/` | Structure de page sans contenu réel |
| Page | `dev/pages/` | Instance d'un template avec contenu réel |

---

## Accessibilité

Le showcase intègre **axe-core** pour tester l'accessibilité WCAG/RGAA directement dans le navigateur. Cliquez sur ♿ dans la vue composant pour lancer l'analyse.
