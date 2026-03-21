# /move — Changer le niveau atomique d'un composant Go-fast

Tu vas changer le niveau atomique d'un composant existant dans ce projet Go-fast v2.

## Étape 1 — Lis GUIDELINES_AI.md

Lis `GUIDELINES_AI.md` pour comprendre les règles de composition par niveau (atom, molecule, organism, template).

## Étape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas précisé, demande :
1. **Nom** du composant (en kebab-case)
2. **Niveau actuel** : atom / molecule / organism / template
3. **Nouveau niveau** : atom / molecule / organism / template

## Étape 3 — Vérifie la cohérence de composition

Avant de procéder, vérifie :
- Si le composant **descend** (ex: molecule → atom) : vérifie qu'il n'inclut pas de composants du niveau cible ou supérieur. Si oui, avertis l'utilisateur.
- Si le composant **monte** (ex: atom → molecule) : pas de contrainte de composition à vérifier.
- Vérifie si d'autres composants incluent celui-ci et si leur niveau reste cohérent après le déplacement.

## Étape 4 — Applique le changement de niveau

1. Dans `dev/components/[nom]/[nom].json` : met à jour le champ `"level"` avec le nouveau niveau
2. Pas de déplacement de dossier — la structure `dev/components/[nom]/` reste la même
3. Met à jour `[nom].md` si présent : corrige le niveau mentionné dans la documentation

## Étape 5 — Confirme

Liste :
- Le fichier JSON mis à jour (ancien niveau → nouveau niveau)
- Les fichiers de documentation mis à jour
- Les éventuels avertissements de composition
