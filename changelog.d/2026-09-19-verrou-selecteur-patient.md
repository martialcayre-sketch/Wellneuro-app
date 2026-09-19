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

**Une course était masquée derrière ce verrou, et elle est fermée aussi.** Deux
lectures de synthèses peuvent être en vol — celle du dossier qu'on quitte et
celle du dossier choisi. Si la première se résolvait après la seconde, le
sélecteur affichait un dossier et la liste montrait les synthèses d'un autre.
Chaque lecture prend désormais un numéro et seule la dernière écrit, sur le
patron déjà employé par la fiche patient.

**Premier banc de `SynthesePanel`**, qui n'en avait aucun sur 786 lignes. Cinq
assertions, cinq mutations, et chacune tue précisément ce qu'elle vise : le bug
d'origine restauré rougit les deux assertions de sélection et celle de la course ;
un correctif qui répare l'affichage sans réparer la relecture ne rougit que les
deux dernières ; un booléen à la place de l'identifiant ne rougit que le cas du
changement d'URL ; la garde de génération retirée ne rougit que celui de la
réponse tardive. C'est un acompte sur la couverture de ce composant, pas son
acquittement.
