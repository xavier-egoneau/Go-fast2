# Design Surface Roadmap

## Vision

Faire de Go-fast2 un studio visuel code-native pour la collaboration design + intégration + IA, sans casser l'existant.

## Priorités

1. Couche IA structurée
2. Bridge scène → implémentation
3. Token intelligence
4. Scene manager polish
5. Canvas UX avancée
6. Refactor / consolidation

## Chantiers

### 1. Couche IA structurée
- schéma d'actions
- validation
- apply engine
- preview / apply / reject
- diff sémantique exploitable

### 2. Agent Panel / CLI Bridge
Objectif : brancher un vrai agent CLI local du user au lieu de reconstruire un copilote maison.

#### Principe
- le user garde son abonnement / agent habituel
- le Design Surface prépare un contexte de scène
- le bridge envoie ce contexte à un agent CLI compatible
- l'agent renvoie un résumé + des actions structurées
- l'UI permet preview / apply / reject

#### Cibles possibles
- Codex CLI
- Claude Code
- OpenCode
- autres agents capables de lire un prompt et renvoyer du JSON structuré

#### MVP
- panneau latéral Agent
- mode test manuel JSON
- contrat unique de sortie : `{ summary, actions }`
- pas d'intégration agent réelle au premier pas

### 3. Bridge scène → implémentation
- export de plan d'implémentation
- projection vers tâches / prompts agentiques
- mapping scène → fichiers source

### 4. Token intelligence
- meilleur mapping composant → tokens
- panel tokens plus fiable
- overrides locaux de scène

### 5. Scene manager
- rename scene
- create scene file propre
- polish save/load/delete/import

### 6. Canvas UX avancée
- snap / align / guides
- multi-select
- z-order
- lock
- navigation type Figma
- pan avec Espace + grab

## Notes
- Le projet est déjà IA-friendly côté fichiers.
- Le Design Surface ajoute une couche IA-friendly côté scène visuelle.
- Ne pas reconstruire un outil de chat/API maison si un agent CLI du user peut servir de moteur.
