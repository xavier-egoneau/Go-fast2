# Go-fast v2

Go-fast v2 n'est pas un simple starter kit front. C'est une tentative radicale de remettre la vérité du produit à l'endroit: dans le code versionne, dans les composants reels, dans les tokens reels, dans Git.

Le constat de depart est simple: dans la creation d'applications web, le design system, le design et l'integration divergent presque toujours. On pretend que la verite est dans la maquette ou dans une documentation de systeme, mais en pratique la seule verite qui resiste au temps, aux arbitrages et a la prod, c'est le code. C'est lui qui vit, c'est lui qui casse, c'est lui qui est merge, c'est lui qui est livre.

Go-fast v2 part donc de cette realite et construit tout autour d'elle.

Le projet commence comme un starter kit de developpement rationnel et agent-ready. Son architecture separe clairement le framework de showcase (`app/`), l'espace produit (`dev/`) et la surface de design (`design/`). On y retrouve une base Atomic Design, des composants Twig structures par metadonnees JSON, un systeme SCSS a tokens, un showcase interactif, une generation d'icones, des validations, et un outillage pense pour etre lisible autant par un humain que par une IA.

Mais Go-fast v2 ne s'arrete pas a "mieux coder des composants". Son ambition est plus forte: faire naitre le design system dans le meme endroit que l'application, puis abolir la fracture historique entre design, integration et systeme. Ici, le design system n'est pas un miroir annexe du produit. Il emerge du meme socle que le produit lui-meme, avec les memes composants, les memes includes Twig, les memes contraintes, les memes tokens, les memes conventions.

De cette logique nait le `Design Surface`: un canvas de design branche non pas sur une abstraction ideale, mais sur les vrais composants du projet. Ce n'est pas un clone de Figma. C'est une interface visuelle connectee au depot, a la registry du showcase, aux scenes, aux metadonnees JSON et a des agents CLI reels. Son role n'est pas de dessiner du faux, mais d'explorer, recomposer et transformer le vrai.

Le pari cle du projet est la: l'IA ne doit pas inventer un systeme parallele. Elle doit assister a l'interieur du systeme existant. Go-fast v2 prepare donc un terrain ou Claude, Codex, Copilot ou d'autres agents peuvent intervenir avec un contexte propre, des commandes explicites, des contraintes de reutilisation et une priorite absolue: reutiliser l'existant avant d'inventer. L'agent n'est pas la pour halluciner une UI "presque compatible". Il est la pour operer dans les limites du produit reel.

En ce sens, Go-fast v2 n'est ni un framework de plus, ni un outil de design de plus. C'est une tentative d'unification. Une maniere de faire en sorte que le design cesse d'etre une projection du produit, et redevienne une transformation directe du produit. La source de verite n'est plus dispersee entre Figma, une doc et l'application: elle est reunie dans le repo.

Si beaucoup de design systems divergent des applications qu'ils sont censes servir, Go-fast v2 attaque le probleme a la racine. La racine, ce n'est pas le style guide. Ce n'est pas la maquette. Ce n'est meme pas le design system. La racine, c'est le code. La racine, c'est Git. Et c'est precisement la que ce projet choisit de commencer.
