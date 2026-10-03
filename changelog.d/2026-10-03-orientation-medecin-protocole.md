### Adressages sur signal d'alerte : l'orientation vers le médecin ouvre le protocole (`D-257` §8-9, LOT-05) (2026-10-03)

Dès que la carte de décision porte un constat **adressé**, le protocole doit
s'ouvrir sur l'action d'orientation `medical_referral` (« Consulter votre
médecin »), au texte signé le 2026-10-02 et recopié au caractère près depuis
`D-257` §9 (un banc relit la décision). Le moteur (`buildProtocolDraft`) l'exige
en tête, refuse tout texte modifié et tout usage de l'identifiant réservé hors
levée ; elle est **hors de la borne des trois actions** (moteur et contrat
patient) et le constructeur l'affiche en lecture seule, sans la compter ni la
laisser retirer. Le patient lit son titre et son plan minimal, comme pour toute
action. Sans constat adressé — donc tant que `WN_LEVEE_ADRESSAGE` est éteint —
rien ne change, empreintes comprises.
