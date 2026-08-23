### Doctrine — la constitution clinique dit l'état atteint (`D-095`, LOT-01)

- Les **58 règles `DC-nn`** ont été re-confrontées au dépôt à `f9290b37`, une
  par une, contre le code et jamais contre la documentation qui le décrit.
  Aucune modification de code, de banc, de table de règles ni de seuil.
- **Deux bascules seulement, chacune sur ses trois preuves.** `DC-29` : la
  condition écrite par `D-041` (« elles ne basculent à acté qu'à ce moment »)
  est remplie — le garde refuse **à la compilation** tout champ de certitude ;
  la réserve de `D-043` est levée pour cette règle seule, et la bascule porte
  sur l'interdit, pas sur l'obligation (la forme `CONVERGENCE` n'a aucun
  producteur). `DC-33` : basculée **par régularisation**, `D-048` l'ayant
  renvoyée au LOT-04 et `D-054` ne l'ayant jamais reprise — deux réserves
  nommées (rang d'au plus 2, classement hors périmètre haché).
- **Sept réserves « Banc dû » sur neuf sont retirées**, pour deux raisons
  distinctes : le banc a été **trouvé** — `DC-17` (le hook place huit fichiers
  cliniques au niveau « demande » depuis `D-083`), `DC-27` (le prompt interdit
  désormais la causalité), `DC-30` (moteur de contradictions, quatre bancs),
  `DC-34`, `DC-35` — ou la réserve était **mal nommée** : `DC-12` et `DC-23`
  avaient déjà leur banc, ce qui manque est un **producteur**, et elles
  reçoivent le marqueur **Producteur dû** (la règle est inerte en production,
  `chaineC1.ts:315` pose `safetyFindings: 0` en dur). Deux réserves demeurent
  (`DC-14`, `DC-20`). Aucun banc n'est créé, modifié ni supprimé.
- **Portée de `DC-14` écrite, texte inchangé** : la règle gouverne
  l'extrapolation d'un claim, pas le défaut d'une colonne — une population
  générale **déclarée** n'est pas un silence (précédent signé
  `BiologyFunctionalRange`, `D-068`/`D-069`). La population appartient à
  l'intervention (`DC-11`), pas au claim.
- **Deux marqueurs neufs, cherchables au grep** : **Décision due** — le code
  tient la règle et un banc la garde, mais aucune entrée du registre ne la
  prononce (`DC-04`, `DC-21`, `DC-44`, `DC-56`, maintenues actées plutôt que
  déclassées) ; **écrite, non armée** — la règle n'a pas de sujet, son
  déclencheur est nommé (`DC-05`, `DC-08`, `DC-52`, `DC-53`).
- **Le vrai produit du lot : onze promesses de lot évaporées.** La clôture de
  la chaîne T0 (10/10 lots, 2026-08-18) périme les dix-neuf lignes du tableau
  qui citaient un de ses lots — 13 « porté » et 6 « partiel ». Quatre règles
  ont été **refermées** par leur lot (`DC-27`, `DC-30`, `DC-33`, `DC-34`),
  quatre ont **changé de porteur**, et **onze sont orphelines** : `DC-03`,
  `DC-09`, `DC-36`, `DC-38`, `DC-39`, `DC-40`, `DC-41`, `DC-44`, `DC-45`,
  `DC-47`, `DC-48`, plus la part de `DC-11` hors exclusions. Chacune porte le
  marqueur **orpheline** — la liste se vérifie au grep. Ce ne sont pas des
  régressions de code. Deux règles n'ont ni preuve, ni banc, ni véhicule :
  `DC-09`, que l'audit désignait comme le garde-fou le plus exposé de la
  chaîne, et `DC-36`.
- **Trois faits que l'audit avait manqués le jour même** : l'axe `tolerance`
  du check-in existe depuis le 2026-07-18 (`DC-41`), la capture d'effet
  indésirable depuis le 2026-07-16 (`DC-42`), la lecture contextuelle
  alimentaire depuis le 2026-07-18 (`DC-51`).
- **Audit amendé, jamais réécrit** : le constat du 2026-08-11 reste lisible ;
  une section datée recense ce qu'il dit de faux — §D clos par le Socle, §E
  outillé (40 claims épinglés contrôlés en CI), §A tranché, véhicules V1 et V4
  requalifiés.
- **Limite nommée** : la grille à quatre colonnes de l'audit (acquis /
  partiel / porté / absent) **n'a pas été recomputée** règle par règle — elle
  mesure l'état du code, quand la constitution mesure l'acte d'intégration, et
  `DC-33` montre que les deux divergent. Un total non reconstituable depuis
  les listes vaudrait moins que pas de total ; les comptes retenus sont ceux
  qui se vérifient au grep.
