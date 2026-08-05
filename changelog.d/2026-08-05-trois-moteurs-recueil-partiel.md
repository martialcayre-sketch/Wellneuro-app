### Scoring — `count_threshold`, `ecab` et `sum_decimal` ne concluent plus sur un recueil incomplet (2026-08-05)

`D-014` — « une bande d'interprétation ne se lit que sur l'instrument complet » —
était fermée sur `sum`, `bms_average`, `psqi` et `tfd`. Trois moteurs la portaient
encore, et ce sont les trois derniers du catalogue : `count_threshold`
(`Q_INF_05`, auto-évaluation de l'anxiété SIIN, et les instruments de cabinet du
même type), `ecab` (`Q_NEU_08`) et `sum_decimal` (`Q_GEO_05`, QDRS). Ils publient
désormais `missing`/`repondus` et **retirent leur bande d'interprétation dès qu'un
item coté est sans réponse**, en servant une note qui dit pourquoi elle manque.

Le biais était le même sur les trois, et vers le bas : un item muet ne peut jamais
faire monter le score, donc la bande d'un recueil partiel est **rassurante par
construction** — trois « Extrêmement » sur onze items rendaient « Niveau d'anxiété
modéré » quand la bande critique s'ouvre à 6 ; quatre domaines QDRS au maximum
rendaient « Démence légère » quand les six domaines muets suffisaient à atteindre
« Démence modérée à sévère ».

Chacun avait sa raison propre de n'être pas vu :

- `count_threshold` comptait DÉJÀ ses items manquants — `missing` était simplement
  lu par personne ;
- `ecab` ne comptait rien, et son item inversé `EC10` (« Faux » vaut 1 point) rend
  une absence **indiscernable** d'un « Vrai » dans le total : le seul item dont le
  silence se confond avec une réponse était aussi le seul à n'être compté nulle
  part ;
- `sum_decimal` conditionnait déjà sa bande à l'existence d'une grille. Les deux
  conditions cohabitent désormais, sans se remplacer : « une grille est-elle
  déclarée ? » et « est-elle lisible sur ce recueil ? » ne sont pas la même
  question.

**Le score reste servi** — comptage, total, `maxTotal`, seuil — accompagné de
`missing`/`repondus` qui le rendent vérifiable : c'est la BANDE qui conclut, et
c'est elle seule qui tombe. **Aucun seuil clinique n'est touché**, aucune formule
de calcul n'est modifiée.

Trois bancs de garde nouveaux (`qInf05`, `ecab`, `qdrs`), avec pour chacun la
contre-épreuve d'une passation complète au même score — c'est ce qui prouve que la
garde porte sur la complétude et non sur la valeur —, et pour l'ECAB le cas où
seul `EC10` manque.

Ce que le lot ne fait **pas** : le mécanisme de plancher garanti
(`bandePlancher`), qui demande un arbitrage clinique par instrument, n'est étendu à
aucun des trois. **Portée nulle sur l'existant**, mesurée : une seule réponse en
base porte sur ces trois instruments (`Q_INF_05`), et elle est complète.
