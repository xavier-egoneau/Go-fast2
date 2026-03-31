## Sprint 1 — UX canvas de base

- [x] quand je clic sur un composant je veux qu'il passe au premier plan
- [x] tout composant doit pourvoir etre supprimé de la scène ( et pas du projet)
- [x] incohérence sur ce que sont les éléments dans la scène par rapport a ceux dans la nav gauche. on devrait afficher tous les éléments présents dans la nav gauche sur le canvas. la nav gauche n'est qu'un raccourci vers les composants existants pour quand on créé une nouvelle page ou une molécule et qu'on voudrait les drag and drop dans une nouvelle page
- [x] proposer un alignement auto par defaut type bento dans un ordre atomique ( les tokens, les atomes, les molécules,les organismes, les pages)
- [x] les notes prennent trop de place. elles doivent être de simples points toujours au dessus d'un élément et lié a lui. Elles s'ouvrent quand on les clique.
- [x] quand je clic sur un élément il faut que ça soit automatiquement en contexte que je fais reference a cet élément pour les demandes IA a l'agent.
- [x] quand je modifie actuellement la position d'un élément tout est reload
- [x] gérer les alertes post traitement agent pour qu'on puisse les fermer

## Sprint 2 — Inspector et variables

- [x] clic sur un item du canvas ne sélectionnait pas (iframes bloquaient les events pointer) → pointer-events:none sur les iframes par défaut
- [x] nav gauche nettoyée : suppression des boutons "Ajouter au canvas" et "Tout afficher", ajout placeholder "Créer un composant/page"
- [x] message empty state du canvas — texte mis à jour
- [x] bouton "Réorganiser" dans la topbar — re-déclenche le bento layout sur demande
- [x] type "component-params" dans l'inspector — expose les params d'un sous-composant (ex: header, footer) depuis la fiche d'une page
- [x] listing.json — header et footer déclarés comme component-params
- [x] listing.twig — header/footer consomment les params reçus via `with variable`
- [x] form.json — header et footer déclarés comme component-params
- [x] form.twig — header/footer consomment les params reçus via `with variable`
- [x] GUIDELINES_AI.md — type "component-params" documenté
