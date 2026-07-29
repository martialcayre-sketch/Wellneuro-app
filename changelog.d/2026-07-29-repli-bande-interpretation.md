### Moteur de scoring — plus de bande d'interprétation rendue par défaut

**Ce lot change des valeurs cliniques affichées.** Aucune passation n'est rescorée en
base : les colonnes `interpretation` et `scoresJson` déjà écrites ne bougent pas, et
l'indice numérique de « Mon équilibre » non plus — il ne lit que `total` et
`subScores[].total`, jamais l'interprétation. En revanche, deux écrans **rejouent le
moteur sur les `rawAnswers` stockées** — « Mon équilibre » et le panneau « Mode de vie »
de la trajectoire praticien : ce qu'ils affichent d'une passation ancienne change.

- **`interpretRanges` ne replie plus sur la dernière bande.** Quand aucune plage ne
  correspondait, il rendait `ranges[ranges.length - 1]` — la bande écrite en dernier,
  qui n'a aucune raison d'être la bonne. Mesuré sur le catalogue entier, ce repli tombe
  sur la plus sévère ici et sur la plus rassurante là : il n'est pas prudent, il est
  arbitraire. Il rend désormais `null`.
- **Ce que cela corrigeait, sur des scores atteignables** :
  - `Q_SOM_02` (Epworth) ne couvre ni **6** ni **15**, deux totaux parfaitement
    atteignables sur 8 items cotés 0 à 3. Un patient à 6, donc sans somnolence,
    recevait « Somnolence diurne excessive ; syndrome d'apnées du sommeil possible ».
  - `Q_MOD_03` sert une **moyenne au dixième** à des bandes bornées sur des entiers
    ([1-3], [4-6], [7-8], [9-10]) : **28 % des totaux atteignables** tombent entre deux
    bandes, et recevaient tous « Intensité très élevée » (danger).
  - `Q_MOD_01` ne couvre pas **9** sur quatre de ses sous-échelles, et sa dernière
    bande y est la rassurante : un score entre « non réparateur » (0-8) et
    « insuffisant » (10-14) ressortait « satisfaisant ».
  - Cinq jeux de bandes ne couvrent pas **0** (`Q_STR_02` 10-50, `Q_STR_08` 25-100,
    `Q_STR_05` et `Q_GAS_03` 1-7, `Q_MOD_03` 1-10) : un instrument non répondu y
    tombait et recevait « Addiction élevée au travail » ou « Intensité très élevée ».
- **Mais un score AU-DESSUS de toute la grille relève de la bande de tête**, et non de
  rien. Là, le repli rendait la bonne réponse : deux grilles ont un plafond écrit sous
  leur maximum atteignable — `Q_TAB_04` (plafond 32, atteignable 36 : c'est le résultat
  le plus sévère du questionnaire cannabis, avec son orientation en addictologie) et
  `Q_MOD_01/ADAPTATION_STRESS` (plafond 24, atteignable 28 : le patient le mieux
  adapté). Le premier jet de ce lot leur rendait un blanc ; la revue adversariale l'a
  relevé. La bande retenue est celle au `max` le plus haut, pas la dernière écrite.
  **Rien de symétrique par le bas** : sous le plancher d'une grille on ne trouve pas un
  score extrême mais une absence de mesure.
- **Deux autres replis, ailleurs dans le moteur.** `composite_multi_parties` en portait
  un sur des bornes à deux dimensions (`gss_min`/`gss_max`) — retiré ; ce moteur n'est
  utilisé par aucun instrument aujourd'hui. Le moteur `bristol` comparait une valeur
  absente (`null <= 2` vaut `true` en JavaScript) et rendait « Constipation », en rouge,
  sur une question non répondue — comportement porté en commentaire comme « conservé à
  l'identique », c'est-à-dire connu et non corrigé.
- **`group_majority` ne greffe plus son protocole sur une bande absente** : étaler
  `{...null}` fabriquait un objet portant un protocole et aucun libellé, qui se lisait
  comme une interprétation là où il n'y en a pas.
- **`buildMiniSynthese` n'affirme plus « Tous les axes explorés sont peu perturbés »
  quand aucun axe ne porte de bande.** Sans cela, le lot aurait échangé une fausse
  alarme contre une fausse réassurance — et cette phrase part dans la fiche praticien
  comme dans le prompt de synthèse.

**Ce que ce lot ne fait pas** : il ne redéfinit aucune grille. Rendre les bandes de
`Q_MOD_03` contiguës au dixième — comme le sont déjà celles de `Q_STR_05` — supprimerait
la cause plutôt que le symptôme, de même que combler les trous de `Q_SOM_02` (6, 15) et
de `Q_MOD_01` (9). Ce sont des décisions de seuil clinique. En attendant, ces scores
sortent sans bande plutôt qu'avec une fausse. `Q_NEU_02` (MADRS) porte deux trous
apparents, à 7 et 19 : ils sont **inatteignables**, ses items ne cotant que 0, 2, 4 ou 6.

**Reste ouvert, mesuré et non traité ici** : `calculateScore(id, {})` rend encore un
verdict clinique — 40 verdicts sur 22 instruments, trente en direction rassurante
(« Pas de trouble du sommeil », « Absence de symptomatologie »), dix en direction
alarmante (les sept sous-échelles de `Q_MOD_01`, « Risque élevé de chute », et
`Q_GEO_06` annonçant « Trouble de la mémoire épisodique — consultation neurologique »).
Deux moteurs sur dix-neuf portent la garde de non-scoré ; les autres non. C'est le lot
suivant, séparé parce qu'il touche aussi les niveaux de preuve de « Mon équilibre » :
la mesure a montré au passage que `calculerNiveauPreuveBesoin(5, {Q_SOM_01: {P1: '1'}})`
rend « preuve de niveau A » alors que `P1` n'est pas un identifiant de question du PSQI.

Onze tests neufs (`web/src/lib/bandesInterpretation.guard.test.ts`,
`miniSynthese.test.ts`), huit preuves par mutation, chacune rouge sur les tests
exactement visés.
