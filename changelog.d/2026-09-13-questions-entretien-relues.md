### Synthèse — ce que le praticien écrit pour préparer son entretien lui revient enfin (2026-09-13)

`axe.points_a_confirmer` et `questions_entretien` étaient saisissables depuis
toujours dans l'éditeur — « Points à confirmer, un par ligne » sur chaque axe,
« Questions pour la consultation » plus bas — et **rendus nulle part** en
lecture. Une fois l'édition fermée, ce que le praticien avait écrit pour
préparer son entretien disparaissait de son écran. Le brouillon les conservait,
la vue ne les montrait pas : un champ en écriture seule.

Les deux blocs reparaissent donc dans `SynthesePanel`, en lecture, à la place
que leur donne leur nature — les points à confirmer sous les arguments de leur
axe, les questions d'entretien en section propre.

**Aucune fuite n'est ouverte, et la garde qui l'empêche est ailleurs.** Le
field-filter classe `points_a_confirmer` « praticien (détaillé) + médecin » et
`questions_entretien` « praticien uniquement » — et le praticien EST le
destinataire de `/dashboard/synthese`. Ce qui protège le patient n'est pas
l'absence d'affichage ici : c'est que la projection patient ne porte pas ces
blocs dans son TYPE (`BilanPatient`), et que `bilanPatient.test.ts` échoue si
l'un d'eux y reparaît. Le booklet les exclut par le même chemin. Rien de tout
cela ne bouge.

Ce lot ne donne à ces champs **ni statut, ni réponse, ni cycle de vie** — une
question reste une ligne de texte parmi d'autres. Le leur donner suppose une
identité stable par ligne, que le JSONB actuel ne porte pas : les deux champs
sont re-découpés d'un `textarea` à chaque frappe, si bien qu'ajouter un mot à
une question en fait, pour toute clé externe, une autre question. C'est un
arbitrage de forme, pas un affichage.
