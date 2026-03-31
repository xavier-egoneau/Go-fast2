# Design Surface Roadmap

## Vision

Faire de Go-fast2 un studio visuel code-native pour la collaboration design + intégration + IA, sans casser l'existant.

Le point central à ne jamais perdre de vue :

**un canvas Figma-like branché sur de vrais composants de prod**.

Le design system est la source de vérité conceptuelle, mais **le code versionné est la source de vérité effective**.

## Réorientation issue des échanges

Le chantier principal n'est plus de construire un panneau technique JSON dans l'interface designer.
Le besoin central est de brancher un **vrai cerveau** à l'app : un agent CLI réel, choisi par l'utilisateur, capable de transformer la scène en respectant les contraintes du système existant.

Le panneau agent manuel / JSON reste un outil de dev interne éventuel, mais **ne constitue pas la surface produit finale côté designer**.

Spec de référence : `design/specs/canvas-brain-contract.md`

## Priorités produit révisées

- [ ] Cerveau / CLI bridge réel
- [ ] Contraintes système et réutilisation du legacy
- [ ] Actions impactantes pour le designer (tokens, layout, agencement)
- [ ] Canvas UX essentielle pour exploration visuelle
- [ ] Bridge scène → implémentation / repo
- [ ] Tokens intelligence et projection système
- [ ] Polish scene manager / canvas avancé

---

## 1. Cerveau / CLI Bridge réel

### Objectif

Brancher un vrai agent CLI local du user au Design Surface au lieu de reconstruire un copilote maison.

### Cibles possibles

- Codex CLI
- Claude Code
- GitHub Copilot agent / CLI compatible
- OpenCode
- autre agent CLI compatible prompt in / structured out

### Principe

- le user garde son abonnement et son agent habituel
- l'app fournit un flow de connexion/auth propre (OAuth navigateur ou auth du CLI existant)
- le Design Surface prépare un contexte scène
- l'agent reçoit ce contexte + les règles système
- l'agent renvoie une proposition structurée exploitable
- l'app permet preview / apply / reject / branch

### Règles non négociables

L'agent doit :

1. réutiliser l'existant avant toute invention
2. préférer les includes/composants/pages existants
3. modifier ou recomposer l'existant avant de proposer du neuf
4. signaler explicitement quand le besoin dépasse le système existant
5. ne jamais recréer un bloc "presque pareil" si un bloc réel existe déjà

### Livrables MVP

- [ ] abstraction `provider` / `agent runtime`
- [ ] sélection du moteur dans l'UI
- [ ] état de connexion du moteur
- [ ] préparation d'un contexte scène sérialisé
- [ ] contrat de sortie structuré minimal
- [ ] preview / apply / reject branchés sur ce moteur réel

### Questions ouvertes

- [ ] quel protocole d'appel uniforme entre Design Surface et agents CLI ?
- [ ] comment gérer auth/OAuth proprement par provider ?
- [ ] faut-il appeler directement le CLI ou passer par un bridge local dédié ?

---

## 2. Contraintes système et réutilisation du legacy

### Objectif

Faire du cerveau un opérateur du système existant, pas un générateur libre.

### À rendre explicite dans le contexte envoyé

- registry composants/pages disponibles
- includes Twig existants et identifiants réels
- métadonnées JSON des blocs exposés
- tokens disponibles
- conventions du projet
- informations de mapping scène → source

### Livrables

- [ ] spec de priorisation de réutilisation
- [ ] contexte système compact et exploitable
- [ ] signal "new component required" quand l'agent ne peut pas rester dans le système
- [ ] traces de décision lisibles dans le summary / diff

---

## 3. Actions impactantes pour le designer

### Objectif

Permettre au designer d'avoir un effet réel sur l'interface, même sans édition vectorielle complète.

### Édition directe minimale à garder

- [ ] move
- [ ] resize
- [ ] duplicate
- [ ] delete
- [ ] notes
- [ ] réagencement simple

### Transformations à rendre possibles rapidement

- [ ] changement de tokens CSS perceptibles
- [ ] agencement des blocs
- [ ] variation de structure de section
- [ ] changement de hiérarchie visuelle
- [ ] duplication de variantes de scène

### Livrables

- [ ] panneau de tokens designer-friendly
- [ ] édition de layout simple
- [ ] duplication de scène / variation claire
- [ ] mapping clair entre intention, preview et résultat

---

## 4. Canvas UX essentielle

### Objectif

Donner au designer le feeling minimum nécessaire pour explorer visuellement comme dans un outil de composition.

### Manques prioritaires

- [ ] pan / zoom plus naturels
- [ ] boards / frames / structure de scène plus lisibles
- [ ] multi-select
- [ ] align / snap / guides
- [ ] z-order simple
- [ ] lock éventuellement

### Livrables

- [ ] navigation type Figma minimale
- [ ] structure boards / scenes plus claire
- [ ] outils de sélection multiples
- [ ] guides de composition de base

---

## 5. Bridge scène → implémentation / repo

### Objectif

Projeter le travail de scène vers le système réel et, à terme, vers git.

### Enjeu

Le repo est le socle réel du produit. Le Design Surface doit devenir une interface designer-friendly de cette vérité versionnée.

### Livrables

- [ ] mapping scène → composants/pages/includes/fichiers
- [ ] diff sémantique robuste
- [ ] projection de changements exploitables
- [ ] compatibilité future avec workflows git / review / branchement

### Questions ouvertes

- [ ] jusqu'où pousser l'apply direct vs production d'un plan d'implémentation ?
- [ ] comment représenter proprement les changements qui demandent du code neuf ?

---

## 6. Token intelligence

### Objectif

Rendre les tokens compréhensibles et manipulables pour un designer sans exposer brutalement la technique.

### Livrables

- [ ] meilleur mapping composant → tokens
- [ ] panel tokens plus fiable
- [ ] catégories design-first (spacing, color role, radius, type…)
- [ ] overrides locaux de scène
- [ ] preview clair de l'impact d'un changement de tokens

---

## 7. Scene manager / polish

### Objectif

Rendre les scènes plus faciles à gérer et à explorer.

### Livrables

- [ ] rename scene
- [ ] create scene file propre
- [ ] save/load/delete/import polish
- [ ] duplication / branching plus clairs
- [ ] meilleure lecture des variantes de scène

---

## Outil de dev interne (hors surface designer)

Le contrat structuré et les outils techniques restent utiles pour construire le moteur, mais doivent rester derrière la surface principale.

Peuvent rester en interne/dev :

- [ ] schéma d'actions
- [ ] validation
- [ ] apply engine
- [ ] preview / reject
- [ ] diff sémantique
- [ ] mode manuel JSON si utile aux devs

Mais ces éléments ne doivent pas dicter la surface produit côté designer.

---

## Prochaines étapes détaillées

### Étape 1 — formaliser le contrat du cerveau
- [x] définir le contexte scène minimal envoyé
- [x] définir les contraintes système envoyées
- [x] définir la sortie structurée attendue
- [x] définir les cas de refus / dépassement du système

### Étape 2 — choisir l'architecture du bridge CLI
- [ ] appel direct CLI vs bridge local
- [ ] abstraction provider/runtime
- [ ] auth et lifecycle de connexion
- [ ] retour d'état dans l'app

### Étape 3 — brancher un premier moteur réel
- [ ] choisir une cible initiale (Codex ou Claude Code)
- [ ] envoyer un contexte simple
- [ ] récupérer summary + actions
- [ ] tester preview/apply sur vrais composants

### Étape 4 — durcir la règle de réutilisation
- [ ] enrichir le contexte avec les composants/includes existants
- [ ] interdire les sorties hors-système silencieuses
- [ ] tester plusieurs demandes designers et mesurer les dérives

### Étape 5 — rendre le designer à nouveau capable d'agir fortement
- [ ] tokens designer-friendly
- [ ] agencement simple
- [ ] variantes de scène
- [ ] navigation canvas plus naturelle

### Étape 6 — rapprocher le résultat du repo
- [ ] mapping scène → implémentation
- [ ] diff plus utile
- [ ] projection vers changements versionnables

---

## Rappel stratégique

Ne pas dériver vers :

- un clone Figma complet
- un chat technique exposé au designer
- un générateur libre déconnecté du repo
- des composants fake qui ressemblent vaguement au système

Toujours revenir à cette phrase :

**un canvas Figma-like branché sur de vrais composants de prod**
