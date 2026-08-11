### La validité d'une passation devient une donnée (LOT-00, chaîne T0)

Une passation questionnaire porte désormais un **statut de validité** en base :
`VALID` (défaut) · `AMBIGUOUS` · `INVALID` · `SUPERSEDED` · `HISTORICAL_ONLY`,
fermé par une contrainte `CHECK`, avec la trace d'une invalidation praticien
(date, auteur, motif) ou d'un remplacement (`supersedes_reponse_id`, porté par
la passation de remplacement et pointant vers la remplacée).

`VALID` et `AMBIGUOUS` alimentent le raisonnement clinique — `AMBIGUOUS` est
signalé au praticien, **jamais exclu en silence** ; `INVALID`, `SUPERSEDED` et
`HISTORICAL_ONLY` en sortent, pour les quatre consommateurs à la fois :
synthèse IA, orientation, Mon Équilibre/momentum, cockpit. La ligne reste
lisible partout ailleurs (inbox, audit, « déjà répondu ») : **on marque, on
n'efface jamais**.

**Rien n'est allumé.** Tout le filtre vit derrière
`WN_ENABLE_VALIDITE_PASSATIONS`, éteint : à ce jour le comportement est
strictement celui d'avant, et un banc le vérifie explicitement. L'allumage est
un geste distinct, postérieur à l'application de la migration.

**`SUPERSEDED` n'est pas une re-passation.** Une re-mesure à J21 ne périme pas
la mesure de T0 — `construireHistoriqueEquilibre` reconstruit chaque jalon
depuis les passations connues à cette date-là, et périmer l'ancienne
supprimerait le point de départ, donc tout le momentum. `SUPERSEDED` désigne le
remplacement d'une passation **fautive**, par un geste praticien explicite.
Deux bancs de `depuisPrisma` verrouillent cette frontière dans les deux sens.

**Le registre des passations non interprétables reste en place, et distinct.**
Il dit autre chose : la passation a eu lieu, les réponses brutes restent vraies,
seul le résultat calculé n'est pas une mesure — d'où sa transmission
*nommée-mais-vidée*, qui laisse au praticien le signal « mesure à replanifier ».
La convertir en `INVALID` effacerait ce signal. Les deux mécanismes se
complètent ; aucun n'absorbe l'autre.
