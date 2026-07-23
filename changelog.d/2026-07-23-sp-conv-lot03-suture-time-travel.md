### SP-CONV LOT-03 — suture time-travel : l'index Spirale recharge la fiche datée (2026-07-23)

La promesse fondatrice de la Spirale (« cliquer un tour recharge la fiche
telle qu'elle était à cette date ») est tenue par raccordement, pas par
construction : sélectionner un repère dans l'onglet Trajectoire pilote
désormais le panneau de lecture datée de SP-TT — même mécanique `asOf`,
même recalcul par troncature, même lecture seule stricte, même note de
relecture horodatée au présent. `LectureEtatPassePanel` gagne un pilotage
externe (`repereInitial`, sélecteur masquable, rappel de retour) et un
bouton « Retour au présent » toujours visible en vue datée, y compris sur
le copilote. Une seule navigation temporelle vit dans le code. La Spirale
emblème du bandeau reste décorative (choix de la maquette LOT-00) :
l'interaction porte sur l'index listé, accessible au clavier. Deux tests
prouvent la suture (asOf émis, retour au présent) et l'absence de lecture
datée sans patient.
