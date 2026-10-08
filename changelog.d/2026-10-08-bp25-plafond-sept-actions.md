### Le plafond d'actions d'un protocole 21 jours passe à sept — BP-25 (2026-10-08)

`MAX_ACTIONS_PROTOCOLE_21J` passe de 3 à 7 (`D-273`, arbitrage du responsable
du 2026-09-29 ; amende `D-105`). Le trois venait de
`docs/RELATION_PRATICIEN_PATIENT_SOURCE.md` ; le sept n'a pour source que cet
arbitrage daté. Les messages qui écrivaient « trois » (refus du moteur, aperçu
patient, constructeur) disent désormais « sept ».

Le barème de charge est réécrit sur 0 à 7, la table du repli en proportion, et
les deux sont re-signés
après déclaration de conformité du responsable sur une surface produite avant
la demande (`D-195`) : `CHARGE-02` couvre 2 et 3, `CHARGE-03` couvre 4 à 7 —
**à trois actions engagées, la suggestion passe de « Chargé » à « Modéré »**,
seul changement de niveau de la table sur l'ancienne plage (le correctif du
comptage ci-dessous relève en outre la suggestion des brouillons qui portent
une action non typée). La table du repli lit désormais la part des actions
engagées qui répètent leur plan idéal en plan minimal (`etendueSansRepli` :
aucune, une partie, chacune) : `REPLI-01` inchangée, `REPLI-04` et `REPLI-05`
nouvelles ; `REPLI-02` et `REPLI-03` sont retirées, leurs identifiants ne sont
pas réutilisés. La table n'est toujours lue par aucun écran. Les périmètres remplacés restent rangés dans les modules.

Le constructeur compte désormais toutes les actions non suspendues du
brouillon, typées ou non : à trois actions dont une encore sans type, il
affirmait « Deux actions engagées ». Il se tait tant qu'aucune action n'est
typée (suspendues comprises), et un type vide n'entre pas dans
`typesDistincts`.

Aucune source clinique, aucun seuil sourcé, aucune migration.
