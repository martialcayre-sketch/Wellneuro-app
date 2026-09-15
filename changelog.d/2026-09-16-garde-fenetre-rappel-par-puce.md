### La consigne « fenêtre de rappel » se garde par sa puce, pas par son vocabulaire (2026-09-16)

La passe Codex rétroactive sur la PR #1098 — mergée sans la passe P0 que la
politique impose — a montré que son garde vérifiait des **fragments
indépendants**, jamais une clause cohérente. Trois mutations restaient vertes sur
55 cas, ré-ancrage des empreintes de prompt compris : une exception insérée dans
l'opérateur, la même posée en phrase suivante, et l'opérateur seul déplacé sous
une section topique sans qu'un caractère de son texte ne bouge.

Le garde extrait désormais la **puce markdown** qui porte la clause, exige que
ses cinq composants — constat, interdit, non-déduction, exception, borne — y
vivent tous, et épingle la puce entière par empreinte. Une empreinte de prompt
bouge à chaque édition et se ré-ancre par routine ; celle-ci ne bouge que si cet
interdit-là est touché.

La réponse est structurelle et non lexicale à dessein : blacklister « sauf si »
aurait reproduit le défaut que ce dépôt a payé quatre fois en deux jours — une
garde qui nomme ce qu'elle interdit sans pouvoir le voir.

**La consigne servie au modèle n'a pas bougé** : aucun bump de version. Reste
ouvert, et c'est plus grave, le finding P0 de la même passe — la clause est
l'unique contrôle du contenu produit, `analyserSortieSynthese` ne lisant que la
structure.
