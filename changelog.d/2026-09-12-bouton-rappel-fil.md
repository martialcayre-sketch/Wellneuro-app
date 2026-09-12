### Le rappel patient a enfin un bouton (2026-09-12)

La route de rappel existait depuis ce matin — avec ses refus, sa cadence et ses
bancs — et **rien ne l'appelait**. Un mécanisme sans déclencheur ne rappelle
personne.

**Le geste vit sur la carte qui constate le retard**, et nulle part ailleurs :
« Échéance dépassée depuis N jours » est le seul endroit du produit où le retard
est établi, et la route refuse de toute façon tout rappel avant l'échéance.
Poser le bouton sur une liste d'assignations en montrerait un là où le serveur
dira non.

**Le message du serveur s'affiche tel quel**, succès comme refus. « Un rappel
est déjà parti il y a moins de 3 jours », « l'échéance n'est pas encore
passée » : ces phrases sont écrites pour être lues par un praticien, et les
remplacer par un « rappel impossible » générique retirerait la seule chose
qu'elles apportent — la raison. Annoncé en `role="status"` et non en `alert` :
un refus de cadence n'est pas une erreur, c'est une réponse.

**Le bouton ne disparaît pas après l'envoi, et la carte ne bouge pas.** Le
rappel n'écrit rien dans le dossier : le questionnaire est toujours en retard,
et c'est le patient qui a la main.

La carte porte désormais l'identifiant de son assignation. Le déduire de sa clé
de refus aurait marché — elle le contient — mais aurait fait dépendre un appel
d'écriture du format d'une clé dont ce n'est pas le rôle.
