---
agent: agent
description: Changer le niveau atomique d'un composant Go-fast (ex: atom → molecule)
---

# Changer le niveau atomique d'un composant Go-fast

Tu vas changer le niveau atomique d'un composant existant dans ce projet Go-fast v2.

## Étape 1 — Lis GUIDELINES_AI.md

Lis `GUIDELINES_AI.md` pour comprendre les règles de composition par niveau.

## Étape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Nom** du composant (en kebab-case)
2. **Niveau actuel** : atom / molecule / organism / template
3. **Nouveau niveau** : atom / molecule / organism / template

## Étape 3 — Vérifie la cohérence de composition

- Si le composant **descend** : vérifie qu'il n'inclut pas de composants du niveau cible ou supérieur. Avertis si nécessaire.
- Vérifie si d'autres composants incluent celui-ci et si leur niveau reste cohérent.

## Étape 4 — Applique le changement de niveau

1. Dans `dev/components/[nom]/[nom].json` : met à jour le champ `"level"`
2. Met à jour `[nom].md` si présent : corrige le niveau mentionné

## Étape 5 — Confirme

Liste les fichiers mis à jour et les éventuels avertissements de composition.
