# /move — Changer le niveau atomique d'un composant Go-fast

Tu vas changer le niveau atomique d'un composant existant dans ce projet Go-fast v2.

## Etape 1 — Lis les references

Lis `AGENTS.md` et `GUIDELINES_AI.md` pour comprendre les regles de composition par niveau.

## Etape 2 — Demande les informations manquantes

Si l'utilisateur n'a pas precise, demande :
1. **Nom** du composant (en kebab-case)
2. **Niveau actuel** : atom / molecule / organism / template
3. **Nouveau niveau** : atom / molecule / organism / template

## Etape 3 — Verifie la coherence de composition

- Si le composant **descend** : verifie qu'il n'inclut pas de composants du niveau cible ou superieur.
- Verifie si d'autres composants incluent celui-ci et si leur niveau reste coherent.

## Etape 4 — Applique le changement de niveau

1. Dans `dev/components/[nom]/[nom].json` : met a jour le champ `"level"`
2. Met a jour `[nom].md` si present

## Etape 5 — Confirme

Liste les fichiers mis a jour et les avertissements de composition eventuels.

## Regle d'execution

Ne te limite pas a expliquer : effectue reellement les modifications dans le projet.
