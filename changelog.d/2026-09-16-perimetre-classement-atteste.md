### Le périmètre du classement est attesté, et l'écran le dit sans sur-promettre (2026-09-16)

Le responsable a relu et attesté `PERIMETRE_CLASSEMENT_V1` sur l'empreinte
`9792c12e72db93d8`. Ce qui est attesté est la **fidélité descriptive** — ces
données disent ce que le moteur applique réellement. Ce qui ne l'est **pas** est
inscrit dans la donnée hachée : la légitimité clinique du classement, et
notamment qu'une règle de priorité 1 passe derrière une priorité 2 dès que le
patient cote l'autre plus haut. Cet arbitrage reste à rendre.

Une première signature avait été posée la veille, puis **périmée par le verrou
lui-même** : borner sa portée l'a fait entrer dans le périmètre haché, ce qui a
déplacé l'empreinte. On n'élargit pas après coup ce qui a été relu, même pour le
restreindre.

L'écran présente désormais les quatre `LIMITATION_*` sous « Textes descriptifs du
classement, relus » — intitulé borné exprès, et servi depuis la donnée hachée.
Le groupement se fait sur une provenance **déclarée par le producteur**, jamais
sur une égalité de libellé, et la validité se demande à `attestationValide` :
`relu`, date et sha valent ensemble, ou l'attestation ne vaut pas.

Vérifié par mutation : réécrire un texte du périmètre puis réancrer l'empreinte
— le contournement de routine — laisse l'attestation rouge.
