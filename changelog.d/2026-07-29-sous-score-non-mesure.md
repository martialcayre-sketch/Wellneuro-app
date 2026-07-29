### Moteur de scoring — un axe non répondu vaut « non mesuré », plus jamais zéro

**Impact sur les passations existantes : nul, et c'est mesuré.** Les 23 passations
enregistrées sur les instruments à sous-scores qui portent des données ont **tous leurs
axes intégralement répondus** — aucune valeur vide, aucun axe déjà nul. La valeur de ce
lot est **prospective**. Attention toutefois : « Mon équilibre », la trajectoire et le
panneau « Mode de vie » **rejouent** `calculateScore` sur les `rawAnswers` à chaque
affichage ; « impact nul » vaut donc parce qu'aucune passation stockée n'est partielle,
pas parce que ces vues seraient figées.

- **Mesuré avant d'écrire une ligne** : une passation ne renseignant que le PREMIER
  sous-score de chaque instrument produisait, sur les 14 instruments concernés,
  **38 sous-scores à zéro, 16 bandes d'interprétation fabriquées et 2 `atRisk`**. Un
  axe auquel personne n'a répondu valait zéro, et zéro est une valeur : il décrochait
  une bande, déclenchait les seuils « faible si < X », et entrait dans le total global.
- **Dans les deux directions.** Vers l'alarmant : « Iso-Strain — risque burnout élevé »
  (Karasek) et « Risque élevé de chute » (Tinetti). Vers le rassurant : `Q_GAS_01`
  rendait un verdict de troubles fonctionnels sur **une section de cinq**.
- **`total: null` par axe** dès qu'aucun de ses items n'est renseigné. C'est le contrat
  que `Q_SOM_09` porte déjà et que la consigne `synthese-v10` décrit.
- **Le total global tombe dès qu'un axe contributeur manque.** Sommer les axes mesurés
  produirait un nombre juste sur un dénominateur faux : `maxTotal` compte tous les axes.
  Les axes mesurés, eux, restent servis avec leur propre bande. Un axe `horsTotal` ne
  fait pas tomber le total : il n'y contribuait pas.
- **`Q_NEU_11` (HAD) était le pire cas, et il a failli être manqué.** Il porte ses axes
  sous `subscalesA`/`subscalesD`, pas sous `scoring.subScores` : le premier jet du
  correctif ne le couvrait pas, et le balayage censé le vérifier — bâti sur la
  **déclaration** plutôt que sur ce que le moteur **émet** — était aveugle au même
  endroit. Or `Q_NEU_11/D` est la source **unique** du besoin 8 de « Mon équilibre », en
  `inverser: true` : zéro item de dépression rendait **1,000 de couverture** et un grade
  de preuve **A**. Relevé en revue adversariale ; le balayage sélectionne désormais sur
  ce qui est émis.
- **Karasek, deux défauts de plus.** Un seuil ne se lit que sur un axe **complet** :
  `karasekValue` rend 0 sur une absence et la latitude pondère jusqu'à 4, si bien que
  deux items sautés retiraient 16 points sur 96 pour un seuil à 72 — un patient
  déclarant une autonomie **maximale** sur 7 items de 9 ressortait « Job Strain ». Et
  « Situation professionnelle équilibrée » exige désormais les deux axes qui la
  fondent : la renseigner seule sur « reconnaissance », le seul axe sans seuil, la
  faisait sortir en vert.
- **Régression créée par ce lot, et corrigée avant le merge** : le panneau « Mode de
  vie » calcule `(total / max) * 100`, qui vaut **0** sur un `null`. Les domaines non
  mesurés se dessinaient donc au point 0 de leur piste — c'est-à-dire dans leur segment
  `danger`, toutes les grilles SIIN ayant le rouge en bas — avec « /28 » pour valeur.
  L'en-tête du composant promettait l'inverse depuis A8-2. Le type `total` de
  `modeVie.ts` mentait (`number` au lieu de `number | null`), ce que le `as` du moteur
  empêchait `tsc` de voir.

**Ce que ce lot ne couvre PAS**, mesuré et nommé plutôt que passé sous silence. La garde
porte sur les **six moteurs qui déclarent `scoring.subScores`**, plus HAD. **Huit
instruments** rendent encore un axe à zéro sur une passation partielle, via **sept
autres moteurs** : `idtas_ae` (`Q_NEU_12`, `parts`), `psqi` (`Q_SOM_01`, `components`),
`qif` (`Q_FIB_02`), `francis` (`Q_GAS_02`), `sigh_sad_sa` (`Q_NEU_03`, dont un
`subScores` hors des six), `sum_two_phases` (`Q_GEO_06`, `phases`) et les `dimensions`
de `sum` (`Q_CAR_01`, `Q_GEO_04`). `Q_MOD_03` porte déjà `total: null` par axe mais son
total global compte encore les manquants pour zéro.

**Réserve nommée** : la consigne `synthese-v10` décrit deux régimes de total global —
« il exclut l'axe manquant, ou le compte pour zéro ». Il en existe désormais un
troisième, `null`, qu'elle ne nomme pas ; sa ligne sur les instruments sans score global
pourrait faire dire d'un `Q_GAS_01` partiel qu'il n'en produit pas, ce qui est faux. Un
bump `v11` est à faire, avec son empreinte.

**Deux gardes retirées plutôt que gardées sans preuve** : le filtre sur l'axe dominant de
`group_majority` et le double test de mesure du Job Strain, rendus redondants par les
gardes en amont. Aucune mutation ne pouvait les faire rougir. La relation dont ils
dépendaient est écrite en commentaire **et** épinglée par un test sur définition forgée.

Quatorze tests neufs, et **douze preuves par mutation** — dont celle qui élargit la garde
à « tout item manquant », celle qui rend HAD à `sumItems`, et celle qui replace le point
du panneau à zéro.
