### Arriver sur l'écran Synthèse avec un dossier en URL n'enferme plus le sélecteur (2026-09-19)

Ouvrir `/dashboard/synthese?idPatient=…` — ce que font les trois portes d'entrée,
dont les cartes du Fil du jour — verrouillait le sélecteur de patient : choisir un
autre dossier ramenait aussitôt à celui de l'URL. Déterministe, à chaque fois.

**Ce n'était pas un défaut d'affichage.** La sélection d'un patient déclenche la
lecture de ses synthèses ; le verrou faisait donc **relire le dossier de l'URL
par-dessus celui qu'on venait de choisir**. Les actions de l'écran prennent leur
identifiant dans cette sélection.

La cause : `selectedPatient` était à la fois dans la garde et dans les
dépendances de l'effet qui applique le paramètre d'URL. Changer de patient
relançait l'effet, dont la garde ne renvoyait plus tôt puisque la sélection
différait de l'URL — et l'effet réappliquait l'URL. Le dossier de l'URL s'applique
désormais **une fois**, suivi par son identifiant et non par un simple booléen :
un booléen aurait rendu l'écran sourd à un changement d'URL sans démontage, en
passant d'une carte du Fil à une autre.

**Premier banc de `SynthesePanel`**, qui n'en avait aucun sur 786 lignes. Trois
assertions, trois mutations : le bug d'origine restauré rougit les deux
assertions de sélection ; un correctif qui répare l'affichage **sans** réparer la
relecture ne rougit que celle qui porte sur la dernière requête ; et casser
l'application à l'arrivée les rougit toutes. C'est un acompte sur la couverture
de ce composant, pas son acquittement.
