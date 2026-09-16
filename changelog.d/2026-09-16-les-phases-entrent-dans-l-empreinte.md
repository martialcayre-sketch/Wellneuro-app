### Les phases entrent dans l'empreinte clinique, et les deux autres « défauts vivants » se requalifient (2026-09-16)

`clinicalContentHash` haché `actions`, `therapeuticLoad`, `limitations` et six
autres champs — **pas les phases**. Une édition qui ne touchait qu'elles rendait
donc `unchanged: true` : la route n'écrivait aucune ligne, et la saisie était
perdue en silence. C'est corrigé, et quatre bancs le tiennent.

**Le banc qui comptait vraiment est celui d'épinglage.** Ajouter un champ à une
empreinte fait basculer en « changement clinique » **tous les fils déjà
persistés**, et fabrique une version en double sur la prochaine soumission de
chacun. `canonicalize` écarte les clés `undefined`, donc l'empreinte d'un
protocole sans phase ne bouge pas — et la valeur épinglée le prouve au lieu de
l'espérer.

**La vérification a aussi corrigé le constat de la veille au soir.** Les trois
défauts avaient été gravés comme « vivants », le premier « rangé en tête ».
Aucun des trois n'est atteignable aujourd'hui. `ProtocolPhase` **n'a ni
producteur ni lecteur** — la route unique n'a jamais passé `phases`, et aucun
écran ne les lit. Le `null` ambigu du barème **ne peut pas survenir** : l'échelle
signée couvre son domaine sans trou ni recouvrement, et l'écran distingue
lui-même les deux autres causes avant d'appeler. `patientLimitations` est inerte
par construction.

Ce sont donc des **pièges armés**, pas des défauts vivants — et un piège armé
est plus dangereux, parce qu'il se déclenchera au moment où quelqu'un ajoutera
la surface qui le déclenche, sous un `tsc` vert. Le dépôt a déjà payé ce prix
avec `followUpCriterion`. Ce qui change est le classement, pas la valeur : on
ferme celui-ci parce qu'il coûte une ligne, pas parce qu'il saigne.
