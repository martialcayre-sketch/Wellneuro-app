### Portail : la photo du repas s'efface dès l'envoi de la journée (D-437, 2026-11-04)

File C, place 11 (H83), correctif avant activation, toujours sous `WN_PORTAIL_CAPTURE_REPAS`
éteint. La photo prise à l'écran de saisie d'une journée d'agenda s'effaçait au rechargement
qui suit un enregistrement réussi. Si la réponse se perdait alors que la journée avait été
écrite, elle restait affichée jusqu'au nouvel essai. Elle s'efface désormais dès l'envoi,
quelle qu'en soit l'issue : réponse perdue, réponse qui n'arrive jamais, relecture en
échec. Aucun nouvel envoi automatique ; le formulaire saisi reste en place. Trois bancs
neufs. Le banc de balayage de la capture est inscrit à `BANCS_BALAYAGE`
(`scripts/wn-controle-fusion.mjs`), dont le banc de parité rougissait T1 depuis #1857.
