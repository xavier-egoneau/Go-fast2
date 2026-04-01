- [x] impossible d'écrire une annotation a cause d'un rechargement a chaque frappe dans l'input
- [x] impossible de supprimer la note
- [x] impossible d'ouvrir  la note
- [x] la fonctionnalité ajouter une note devrait plutot être placée sur les élément dans le canvas et non présenter comme un élément de la librairie( ce qu'elle n'est pas)

- [ ] je ne vois pas a quoi servent les élément dans le menu scène, ni workspace ( si inutile on supprime tout ça et les fonctions inutiles > refacto propre) . rappel la scène contient tous les éléments(atomes,molécules,organismes et pages. supprimer un élément de la scène c'est le supprimer du projet - mettre une alerte pour sensibiliser l'utilisateur a ce principe si il clic sur supprimer)
- [x] je ne vois pas a quoi servent les éléments dans le menu canvas a part réorganiser(bento). garder juste le bouton réorganiser(bento) et faire un gros menage des fonctions inutiles.
- [x] le sidebar menu de gauche n'est pas utile tout le temps  - permettre de l'ouvrir et de le fermer.

- [x] panel inspector a droite ne va pas - je voudrais qu'il s'ouvre a gauche a la place de la librairie de composants plutot
- [x] defaut scène et le mode desktop/tablet/mobile dans la nav top je n'en vois pas l'interet. on a deja la possibilité de changer le mode desktop/tablet/mobile sur les composants dans le canvas et c'est plus logique car la scène ne change pas c le composant qu'on resize pour voir comment il se comporte en responsive.
- [ ] desktop/tablet/mobile : les tailles associées a ce changement de taille de la fenêtre n'ont pas a être renseignées a chaque fois dans l'inspector c'est une variable commune a tout le projet. (mettre des variables dans les token pour les points de ruptures globale et se fixer dessus )
- [x] agent : il répond trop souvant non — ajout du support params sur duplicate-item, renforcement du prompt avec instructions de création de variantes, hint de contexte quand 1 seul item dans la scène
