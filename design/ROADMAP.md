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

- [ ] Verrouiller le contrat canvas ↔ cerveau pour le MVP
- [ ] Brancher un vrai bridge runtime local pour un premier provider réel
- [ ] Rendre le contexte système suffisamment fiable pour empêcher la dérive
- [ ] Valider la boucle complète intent → preview → apply dans la scène
- [ ] Renforcer ensuite l'action designer-first dans le canvas
- [ ] Seulement après, rapprocher le résultat du repo et de git

---

## Règles produit non négociables

- [ ] le cerveau réutilise l'existant avant toute invention
- [ ] le cerveau préfère includes/composants/pages réels aux blocs approximatifs
- [ ] le cerveau signale explicitement quand le système existant ne suffit pas
- [ ] le canvas reste simple et designer-facing
- [ ] le JSON et les contrats structurés restent des outils internes
- [ ] le panneau agent actuel reste un outil de dev interne et non une UX finale
- [ ] on ne dérive pas vers un clone Figma complet
- [ ] on ne dérive pas vers un chat technique exposé au designer

---

## Jalons de dev

### Étape 1 — verrouiller le contrat du cerveau

Objectif : figer le contrat MVP déjà largement défini pour pouvoir implémenter sans refaire la spec à chaque itération.

- [x] définir le contexte scène minimal envoyé
- [x] définir les contraintes système envoyées
- [x] définir la sortie structurée attendue
- [x] définir les cas de refus / dépassement du système
- [x] geler la shape MVP d'entrée côté frontend
- [x] geler la shape MVP de sortie côté runtime
- [ ] lister explicitement les actions supportées par le canvas
- [ ] lister explicitement les actions refusées / hors scope
- [x] aligner `design/README.md`, `design/ROADMAP.md` et `design/specs/`

### Étape 2 — construire le bridge runtime local

Objectif : faire passer toute exécution réelle par un bridge local au lieu d'appeler un CLI depuis le browser.

- [x] poser le principe bridge local dédié
- [x] valider le protocole d'appel frontend → bridge
- [x] définir le contrat de réponse uniforme du bridge
- [x] créer le endpoint local `POST /__design_api/agent/run`
- [x] isoler une abstraction `provider` / `runtime`
- [x] exposer l'état `available / connected / authRequired / reason`
- [x] brancher le provider `manual-json` sur ce bridge réel
- [x] afficher correctement l'état du moteur dans l'UI

### Étape 3 — brancher un premier moteur réel

Objectif : prouver la promesse produit avec un seul provider réel avant de généraliser.

- [x] choisir une cible initiale unique (`codex-cli`)
- [x] définir le mode d'invocation local du provider choisi
- [x] envoyer un contexte scène minimal au provider
- [x] récupérer `summary`, `actions`, `warnings`, `requiresNewComponent`
- [x] normaliser les sorties du provider choisi
- [ ] tester le flux sur de vrais composants du projet
- [x] documenter les limites du premier provider réel

### Étape 4 — durcir les contraintes système et la réutilisation

Objectif : empêcher le cerveau de produire des propositions impressionnantes mais hors système.

- [x] envoyer la registry composants/pages réellement disponibles
- [x] envoyer les métadonnées JSON exposées par les blocs
- [x] envoyer les tokens ou catégories de tokens disponibles
- [x] envoyer les identifiants logiques d'includes/templates quand disponibles
- [x] encoder la règle "reuse before invention" dans le contexte envoyé
- [x] interdire les sorties silencieusement hors système
- [x] exploiter `requiresNewComponent` comme signal produit explicite
- [x] rendre les warnings et limitations lisibles dans le preview
- [ ] tester plusieurs intents designers et mesurer les dérives

### Étape 5 — valider la boucle produit dans la scène

Objectif : obtenir un flux crédible de bout en bout avant de toucher au repo réel.

- [ ] générer un prompt final stable à partir de l'intent + contexte
- [ ] valider les actions renvoyées avant preview
- [ ] produire un preview lisible des changements proposés
- [ ] permettre `apply`
- [ ] permettre `reject`
- [ ] préserver undo / redo / history
- [ ] confirmer que l'apply modifie correctement le modèle de scène
- [ ] tester plusieurs scénarios réels de transformation

### Étape 6 — renforcer le pouvoir d'action du designer

Objectif : augmenter la valeur du canvas une fois le cerveau réel branché.

- [x] garder move
- [x] garder resize
- [x] garder duplicate
- [x] garder delete — bouton × dans la toolbar de chaque item
- [x] garder notes — remplacées par des pins compacts liés aux composants
- [x] rendre les notes clairement distinctes des composants de prod
- [x] badge contexte IA sur l'item sélectionné
- [ ] ajouter un réagencement simple
- [ ] ajouter un panneau de tokens designer-friendly
- [ ] ajouter des variations de scène plus claires
- [ ] rendre le mapping intention → preview → résultat plus lisible

### Étape 7 — améliorer l'UX canvas essentielle

Objectif : rendre l'exploration plus naturelle sans dériver vers un éditeur vectoriel généraliste.

- [x] pan : `Espace` + drag
- [x] zoom : `Ctrl+scroll`, `Ctrl+=`/`-`/`0`, boutons topbar
- [x] canvas auto-peuplé au démarrage (bento layout par niveau atomique)
- [x] sélection → premier plan automatique
- [x] alertes agent fermables
- [ ] aimantage live pendant le drag (reflow des voisins)
- [ ] clarifier boards / frames / structure de scène
- [ ] rendre le drag des notes évident et fiable
- [ ] ajouter multi-select
- [ ] ajouter align / snap / guides
- [ ] polish save / load / duplicate / import

### Étape 8 — rapprocher la scène du repo réel

Objectif : préparer la projection vers l'implémentation sans brûler les étapes trop tôt.

- [ ] définir un mapping scène → composants/pages/includes/fichiers
- [ ] enrichir le diff sémantique
- [ ] distinguer ce qui est applicable en scène de ce qui demande du code neuf
- [ ] produire un plan d'implémentation quand l'apply direct ne suffit pas
- [ ] préparer une projection vers des changements versionnables
- [ ] préparer la compatibilité future avec review / branchement / git

---

## Outil de dev interne

Ces éléments restent utiles pour construire le moteur, mais ne doivent pas dicter la surface produit côté designer.

- [ ] schéma d'actions
- [ ] validation
- [ ] apply engine
- [ ] preview / reject
- [ ] diff sémantique
- [ ] mode manuel JSON si utile aux devs
- [ ] panneau agent technique masqué, simplifié ou remplacé dans la future UX designer

---

## Rappel stratégique

Ne pas dériver vers :

- un clone Figma complet
- un chat technique exposé au designer
- un générateur libre déconnecté du repo
- des composants fake qui ressemblent vaguement au système

Toujours revenir à cette phrase :

**un canvas Figma-like branché sur de vrais composants de prod**
