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
- contrat canvas ↔ brain déjà cadré dans `design/specs/canvas-brain-contract.md`
- abstraction frontend de providers déjà en place
- génération de prompt et normalisation de sortie déjà amorcées
- premier provider réel branché : `codex-cli`
- contexte brain enrichi avec registry, contrôles, tokens, règles et actions supportées

### Encore incomplet

- bridge runtime local posé mais encore incomplet
- endpoint local `POST /__design_api/agent/run` en place pour le flux MVP
- registry providers exposée localement
- un seul provider CLI réel branché pour l'instant : `codex-cli`
- test sur scènes et composants réels encore à pousser
- contexte système renforcé mais encore à durcir sur les refus et dérives réelles
- audit métier ajouté pour détecter certaines sorties silencieusement hors système
- feedback de preview remonté plus visiblement au niveau du canvas
- boucle produit complète `intent -> preview -> apply` encore à fiabiliser
- navigation canvas type Figma encore limitée
- multi-select / align / snap / guides absents
- édition designer-first encore trop faible
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
- piloté depuis l'application via un bridge runtime local
- capable de lire le contexte de scène
- capable de transformer la scène en respectant les contraintes du système réel

Règle d'architecture déjà actée : le browser ne doit pas appeler directement un CLI externe.
Toute exécution réelle doit passer par un bridge local dédié.

### Vision du cerveau

L'utilisateur choisit son moteur habituel :

- Codex CLI
- Claude Code
- Copilot / agent compatible
- autre agent CLI compatible

Le Design Surface prépare le contexte, appelle cet agent, et récupère une proposition structurée.

Dans le MVP, l'objectif n'est pas de supporter tous les moteurs d'un coup.
Il faut d'abord réussir la boucle complète avec **un seul provider réel**, puis généraliser.

État actuel :

- `codex-cli` est branché via `codex exec`
- `manual-json` reste utile comme provider de dev
- `claude-code` reste à implémenter

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
  "actions": [],
  "warnings": [],
  "requiresNewComponent": false,
  "unresolved": []
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

## Ordre de construction actuel

L'ordre de construction visé est le suivant :

1. verrouiller le contrat canvas ↔ cerveau pour le MVP
2. construire le bridge runtime local
3. brancher un premier provider réel
4. durcir les contraintes système et la réutilisation
5. valider la boucle complète `intent -> preview -> apply`
6. renforcer ensuite le pouvoir d'action du designer dans le canvas
7. rapprocher seulement après la scène du repo réel

Autrement dit : la priorité n'est pas d'ajouter tout de suite plus de polish canvas.
La priorité est de prouver qu'un vrai cerveau peut transformer une scène sans sortir du système réel.

## Limites actuelles du provider réel

- le premier provider réel est `codex-cli`
- le bridge utilise une exécution non interactive locale via `codex exec`
- le flux est validé de bout en bout sur le bridge MVP
- la validation métier finale reste côté Design Surface via la normalisation et `validateActionSet`
- le contexte système envoyé doit encore être enrichi avant de faire confiance à des transformations plus ambitieuses

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
- appel direct d'un CLI externe depuis le browser

## Résumé

Le Design Surface vise à devenir l'interface designer-friendly d'une vérité produit qui vit dans le code versionné.

La promesse n'est pas :

"dessiner librement n'importe quoi"

mais plutôt :

**explorer visuellement, transformer intelligemment, et rester branché sur les vrais composants de prod.**
