# Design Surface

Prototype de mode design pour Go-fast2.

## Positionnement

Le Design Surface n'est pas un clone de Figma et ne cherche pas à devenir un éditeur graphique généraliste.

Son but est plus spécifique et plus fort :

**un canvas Figma-like branché sur de vrais composants de prod.**

Le design system reste la source de vérité conceptuelle, mais **le code versionné est la source de vérité effective**.
Le repo git, les includes Twig réellement utilisés, les tokens réellement disponibles, et les composants réellement versionnés sont la base du produit.

Le rôle du Design Surface est de donner au designer une interface visuelle pour explorer, recomposer et transformer cette vérité réelle sans sortir du système.

## Ce que ce mode design est

- un espace visuel pour designers
- un canvas relié aux composants réels du projet
- un lieu d'exploration visuelle connecté au legacy
- un pont entre design, intégration et agent CLI

## Ce que ce mode design n'est pas

- un éditeur vectoriel généraliste
- un remplaçant complet de Figma
- un outil pour dessiner un logo from scratch
- un générateur libre de faux composants qui ressemblent vaguement au système

Exemple : pour le moment, si le designer veut créer un logo, il le fait ailleurs (ex: Figma) puis importe le SVG ici.

## Démarrage

```bash
npm run design
```

Puis ouvrir :

- `http://localhost:3000/design/`

## État actuel

### Disponible

- library alimentée par `dev/data/showcase.json`
- canvas simple
- rendu réel via iframes Twig
- inspector auto-généré depuis les métadonnées JSON
- persistance locale via `localStorage`
- scènes JSON locales
- drag / resize basiques
- notes sur canvas

### Encore incomplet

- navigation canvas type Figma (pan/zoom) encore limitée
- multi-select / align / snap / guides absents
- édition designer-first encore trop faible
- cerveau agentique réel pas encore branché
- tokens panel encore rudimentaire

## Thèse produit

Le problème central du design web en production est le décalage entre :

- la maquette
- le design system
- le code réel
- la prod réellement livrée

Le Design Surface réduit ce décalage en faisant travailler le designer dans un espace qui utilise directement le système réel :

- composants existants
- includes Twig existants
- tokens existants
- conventions existantes
- repo git comme socle

## Le cerveau manquant

À ce stade, l'interface peut servir de base. L'élément central qui manque encore est le **cerveau** :

- un agent CLI réel choisi par l'utilisateur
- connecté via auth / OAuth navigateur
- piloté depuis l'application
- capable de lire le contexte de scène
- capable de transformer la scène en respectant les contraintes du système réel

### Vision du cerveau

L'utilisateur choisit son moteur habituel :

- Codex CLI
- Claude Code
- Copilot / agent compatible
- autre agent CLI compatible

Le Design Surface prépare le contexte, appelle cet agent, et récupère une proposition structurée.

### Règle absolue

L'agent **ne doit jamais** recréer un bloc "presque pareil" si un include, composant ou pattern existe déjà.

Ordre de priorité attendu :

1. réutiliser un include / composant / pattern existant
2. réagencer / reparamétrer l'existant
3. composer plusieurs briques existantes
4. seulement en dernier recours signaler qu'un nouveau bloc est nécessaire

## Pourquoi ce produit est différent

Le pari n'est pas seulement de faire du design avec de l'IA.
Le pari est de faire du design avec une IA qui travaille **dans les limites du système réel**.

Donc :

- pas de design jetable hors-sol
- pas de faux miroir du design system
- pas de divergence silencieuse entre maquette et repo

Le canvas devient une surface d'exploration du vrai produit.

## Contrat cible entre canvas et cerveau

### Entrées côté cerveau

Le cerveau doit recevoir au minimum :

- la scène courante
- la sélection courante
- la liste des composants/pages disponibles
- les métadonnées utiles du showcase
- les tokens / catégories de style disponibles
- les règles de priorité système
- éventuellement les fichiers source liés ou leurs chemins logiques

### Contraintes

Le cerveau doit être explicitement instruit pour :

- préférer la réutilisation à l'invention
- rester compatible legacy
- ne pas inventer de nouveaux patterns sans le dire
- signaler quand un besoin dépasse les briques existantes
- proposer des transformations traçables et relisibles

### Sortie attendue

À terme, la sortie ne doit pas être exposée comme une feature designer-facing brute, mais le contrat interne peut ressembler à :

```json
{
  "summary": "...",
  "actions": []
}
```

Ce contrat sert au moteur interne pour :

- preview
- apply
- reject
- diff sémantique
- projection vers implémentation

## UX cible côté designer

L'UX designer-first ne doit pas exposer la tuyauterie technique brute.

L'IA peut devenir l'interface primaire, mais sous une forme orientée intention :

- "rends cette hero plus premium"
- "ajoute une variante mobile"
- "réorganise cette section pour mieux mettre en avant le CTA"
- "teste une version plus éditoriale"

Le designer ne devrait pas avoir à manipuler du JSON pour travailler.
Le JSON et les contrats structurés sont des outils internes de développement, pas la surface produit finale.

## Arbitrage produit actuel

### Ce qui doit être éditable directement

- déplacer des blocs
- redimensionner
- dupliquer
- supprimer
- ajouter des notes
- ajuster quelques paramètres designer-friendly
- modifier les tokens ou l'agencement de manière perceptible

### Ce qui peut être piloté par l'IA

- recomposition de sections
- déclinaison de variantes
- harmonisation des espacements
- changements systémiques de layout
- réorganisation plus ambitieuse de la hiérarchie visuelle
- bridge scène → implémentation

## Scope volontairement hors de l'outil pour le moment

- édition vectorielle complète
- création de logo from scratch
- remplacement total de Figma
- outil de chat purement technique exposé au designer

## Résumé

Le Design Surface vise à devenir l'interface designer-friendly d'une vérité produit qui vit dans le code versionné.

La promesse n'est pas :

"dessiner librement n'importe quoi"

mais plutôt :

**explorer visuellement, transformer intelligemment, et rester branché sur les vrais composants de prod.**
