### Moteur de scoring — l'axe non mesuré, sur les neuf moteurs qui restaient

Suite du lot du même jour, qui ne couvrait que les six moteurs déclarant
`scoring.subScores`, plus HAD. Neuf autres portaient le même défaut sous quatre
autres porteurs — `parts`, `components`, `phases`, `categories` — et sous les
`dimensions` de `sum`. Ils ne passent pas par `sumItems` : leur découpage est
**codé en dur**, et ils lisaient leurs items en `getVal(x) || 0`. L'absence
entrait donc dans le calcul sous la valeur la plus basse, indiscernable d'un vrai
zéro.

**Impact sur les passations enregistrées : nul, et c'est mesuré.** Dix-huit
passations existent sur les instruments concernés (`Q_MOD_03` 9, `Q_SOM_01` 4,
`Q_SOM_03` 3, `Q_FIB_02` 2) ; les dix-sept qui portent des `rawAnswers` sont
**intégralement répondues** — jeu d'identifiants exact et complet, aucune valeur
vide ni nulle. La dix-huitième est antérieure à l'enregistrement des
`rawAnswers` et n'est rejouable par aucun chemin. La valeur de ce lot est
**prospective**. Précision qui compte, puisque cinq chemins **rejouent**
`calculateScore` sur les `rawAnswers` à chaque affichage — `equilibre/score.ts`,
`equilibre/evidence.ts`, `equilibre/depuisPrisma.ts`, `protocol/trajectoire.ts`
et `agenda-sommeil/cloture.ts` : « impact nul » vaut parce qu'aucune passation
stockée n'est partielle, pas parce que ces vues seraient figées.

- **Mesuré avant d'écrire une ligne**, par balayage de ce que le moteur **émet** :
  **43 valeurs fabriquées** sur dix instruments. Les plus coûteuses ne sont pas
  les plus nombreuses.
- **`Q_GEO_06` (5 mots de Dubois)** — le test se passe **en deux temps** séparés
  par un délai. Entre les deux, la phase de rappel différé valait 0/5, donc
  « ≤ 2 », et l'alerte se déclenchait : « Rappel différé ≤ 2/5 — évocateur de
  maladie d'Alzheimer ». Un test simplement inachevé rendait le résultat qu'il
  sert à chercher.
- **`Q_SOM_01` (PSQI)** — une seule réponse suffisait à passer la garde de
  passation vide, et les six autres composantes retombaient sur leurs valeurs par
  défaut (23 h, 30 min, 7 h). Un PSQI dont seule la qualité subjective est
  renseignée, **à sa pire valeur**, sortait « Troubles du sommeil légers » sur 21.
  L'efficacité de sommeil, elle, se calculait sur les défauts : 88 %, un chiffre
  d'allure clinique entièrement fabriqué, servi au modèle de synthèse.
- **`Q_FIB_02` (QIF)** — la bande de tête est `total === 0` : « Score peu
  compatible avec le diagnostic de fibromyalgie ». Un questionnaire vide écartait
  donc activement le diagnostic qu'il mesure. Q12 rendait le cas indiscernable :
  `(7 − n) × 1,43` vaut 0 pour sept bons jours **déclarés** comme pour une absence
  de réponse.
- **`Q_SOM_03` (Berlin)** — ce moteur n'appelle pas `interpretRanges` ; la garde
  du lot précédent ne le couvrait pas, exactement comme Bristol. Il rendait une
  bande dans **tous** les cas, et celle de l'absence était « Risque faible d'apnée
  du sommeil — surveillance clinique ». La règle de Berlin étant « au moins deux
  catégories positives », elle reste **concluante dans un sens** même incomplète :
  le risque élevé s'établit avec deux positives quelle que soit la troisième, le
  risque faible exige les trois.
- **`Q_NEU_12` (IDTAS-AE)** — trois drapeaux valaient `false` sur des questions
  jamais posées, dont `suicidalIdeation`, que la source Drive assortit d'une
  appréciation clinique immédiate. Un drapeau dont la prémisse n'est pas mesurée
  vaut désormais `null`.
- **`Q_GAS_02` (Francis), `Q_NEU_03` (SIGH-SAD-SA), `Q_CAR_01` / `Q_GEO_04`
  (`dimensions`), `Q_MOD_03`** ferment le même défaut. Une `dimension` fait
  exception sur un point : elle n'entre pas dans le total global, son absence ne
  peut donc pas le faire tomber.
- **`composite_multi_parties`** reçoit la même garde à titre **préventif** : aucun
  instrument du catalogue ne le sert aujourd'hui — mesuré, pas supposé — et elle
  est éprouvée sur définition forgée, faute de quoi la ligne serait modifiable
  sans qu'aucun test ne puisse rougir.

**Une fixture corrigée, de la classe déjà trouvée en revue.** `PSQI_REPONDU`
ne portait que huit des dix-huit items et omettait Q5a puis Q5b à Q5j — la
composante « perturbations » en entier. Elle décrochait pourtant un **grade A**
pour le besoin 5 de « Mon équilibre ». Elle mesure désormais ce qu'elle annonce,
et un test neuf tient la contrepartie : un PSQI amputé d'une composante ne vaut
plus preuve de premier rang.

**Consigne de synthèse `synthese-v11`** (empreinte `34031e3de3ab2389`). v10
décrivait un régime de total global qui n'existe plus sur les axes
CONTRIBUTEURS : « selon l'instrument, il exclut l'axe manquant, ou le compte pour
zéro », avec `Q_MOD_03` en exemple vivant du second cas. Elle énumère désormais
**trois** régimes, chacun reconnaissable dans la charge : le total **tombe avec
son axe** ; il est **renormalisé** sur les axes couverts, et le dit par un
dénominateur indépendant du nombre d'axes et un compte d'axes couverts
(`Q_SOM_09`) ; ou il est servi **non nul sans ce compte**, et il est alors
**incomplet** — l'axe à `null` ne contribue pas au total, mais ses items y
comptent pour zéro. Deux ajouts : un **booléen à `null`** n'est pas un « non » ;
et le champ `total` **absent** (un instrument qui n'en produit pas) se dit
autrement que le champ à **`null`** (un total qui n'a pas pu être établi) —
réserve nommée à la clôture du lot précédent.

**Deux rédactions de v11 ont été refusées en revue adversariale**, et c'est la
partie la plus utile de ce lot. La première énonçait la chute du total **sans
réserve** : fausse de l'agenda du sommeil, qui renormalise. La seconde, en
retirant de v10 la phrase « présente le total global comme **incomplet** »
devenue fausse des neuf moteurs corrigés, n'a pas vu qu'elle restait vraie de
`sum` et de `seuils_points`, que ce lot ne touche pas — et dont le total est
justement servi non nul à côté d'une dimension vide. Mesuré : `Q_CAR_01` rend
« Risque faible » (vert, « Prévention primaire ») sur **2 items de 25 points** ;
`Q_GEO_04` (MMSE) rend « Démence modérée » sur la seule orientation ; `Q_ALI_01`,
servi en production, rend une bande d'équilibre alimentaire amputée de
l'hydratation. Le modèle aurait lu ces trois totaux sous la seule règle qui
décrivait encore un total non nul à côté d'un axe à `null` — celle de la
renormalisation, qui se conclut par « ce total-là est **utilisable** ».

**Ce que ce lot ne couvre PAS**, mesuré et nommé plutôt que passé sous silence :

- **La passation partielle d'un instrument à axe unique.** `sum`, `sum_items`,
  `sum_decimal`, `horne`, `bms_average`, `count_threshold`, `ecab`, `audit`
  sous-estiment leur total dès qu'un item manque, et gardent leur bande. Refuser
  de scorer une passation incomplète est un autre contrat, et un autre arbitrage.
  Le cas le plus visible reste `Q_GEO_04` (MMSE) : la seule orientation
  renseignée, à 10 sur 10, rend un total de 10 sur 30 et « Démence modérée ». La
  consigne `v11` le couvre côté lecture — le moteur, non.
- **L'axe partiellement répondu.** La frontière posée ici est « au moins un
  item », la même que celle du lot précédent : un axe à moitié rempli reste une
  mesure, sous-estimée mais réelle. Cas concret : le Berlin dont `BE1` (« ronflez-
  vous ? ») manque mais dont `BE2`–`BE4` répondent rend une catégorie **négative**,
  parce que sa règle exige `BE1 === 1`.
- **`Q_CAN_01` / `Q_CAN_02` (EORTC).** Leurs axes sont déjà à `null` par eux-mêmes,
  mais leur total global est une **moyenne des axes mesurés** : deux items répondus
  sur trente rendent un « 0/100 » de qualité de vie oncologique. La moyenne est
  mathématiquement honnête — son dénominateur est le nombre d'axes mesurés — mais
  sa **représentativité** ne l'est pas. Les deux instruments sont sous licence
  tierce et sans aucune passation ; le geste relève de l'arbitrage en cours.
- **Les drapeaux de Karasek** (`Q_STR_06`), moteur du lot précédent, non touché
  ici : `atRisk`, `jobStrain` et `isoStrain` valent `false` — jamais `null` — sur
  un axe non mesuré. Mesuré : une passation ne renseignant que la demande
  psychologique rend `LAT`, `SOU` et `REC` à `total: null` **et** `atRisk: false`,
  c'est-à-dire « pas à risque » sur trois axes jamais posés. Même classe que le
  `winterHits` corrigé ci-dessus, dans la direction rassurante. Relevé par la même
  revue, laissé hors de ce lot pour ne pas rouvrir le moteur d'hier : c'est un
  correctif d'une ligne, qui mérite sa propre PR et sa propre preuve.
- **Le `max` déclaré des `dimensions` de `sum`**, recopié depuis la définition au
  lieu d'être recalculé sur les items : un littéral divergeant serait silencieux.
  Le moteur `seuils_points` le recalcule déjà ; les unifier changerait des valeurs
  servies.

**Trois défauts créés par ce lot, trouvés en revue adversariale et corrigés
avant le merge** — la même série que les quatre du lot précédent, où chaque
correction fabriquait la suivante.

1. **La consigne** ci-dessus, refusée deux fois.
2. **`Q_SOM_01` — l'efficacité de sommeil est un RAPPORT**, et « au moins un
   item » n'est pas la bonne frontière pour un rapport : son numérateur (`Q4`,
   heures dormies) et son dénominateur (`Q1`/`Q3`, horaires) sont indépendants.
   Le premier correctif fermait le cas « aucun des trois » et laissait ouvert
   « un des trois » — c'est-à-dire exactement le 88 % que le changelog
   revendiquait avoir supprimé. L'heure du coucher renseignée seule rendait
   encore `efficiency: 88` et `C4: 0`, la MEILLEURE valeur de la composante. Les
   trois items sont désormais exigés.
3. **`Q_NEU_12` — `winterHits: 0` survivait à côté de `winterPatternLikely:
   null`.** Le même objet disait « non mesuré » et « zéro mois d'hiver au-dessus
   du seuil », sur un instrument de trouble affectif **saisonnier**. Le balayage
   ne l'a pas vu parce qu'il énumérait les champs par une **liste blanche de
   noms** — même faiblesse structurelle que la sélection par déclaration qui
   avait raté HAD. La polarité est inversée : tout champ numérique ou booléen
   d'un axe non mesuré est coupable par défaut, à charge de l'exempter
   nommément (dénominateurs, comptes de questions, `horsTotal`).

**Une conséquence d'affichage, corrigée dans le même lot.** Les quatre porteurs
`components`, `categories`, `parts` et `phases` n'étaient rendus **nulle part**
dans la fiche praticien. Tant que leur moteur fabriquait un total, la ligne
affichait au moins ce total ; depuis qu'il tombe, elle n'affichait plus rien —
un « — » que le composant lui-même décrit comme se lisant « comme un incident
technique et non comme une décision clinique », alors que les composantes
réellement mesurées sont dans `scores_json`. Les cinq porteurs partagent
désormais le même rendu descriptif, et un axe sans mesure y est écrit **« non
mesuré »**, pas « — ».

Seize tests neufs et **vingt preuves par mutation**, dont celles qui rendent
`alertMA` à `false`, `suicidalIdeation` à `false`, `highRisk` conclusif sur
l'incomplet, l'efficacité du PSQI à sa frontière lâche, et celles qui attaquent
le banc lui-même — un instrument retiré de la couverture, un identifiant de
périmètre inexistant.
