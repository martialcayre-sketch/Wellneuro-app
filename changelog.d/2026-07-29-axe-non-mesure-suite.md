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
**intégralement répondues** — jeu d'identifiants exact, aucune valeur vide. La
dix-huitième est antérieure à l'enregistrement des `rawAnswers` et n'est
rejouable par aucun chemin. La valeur de ce lot est **prospective**.

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

**Consigne de synthèse `synthese-v11`** (empreinte `bc6945b09e3f1e4e`). v10
décrivait un régime de total global qui n'existe plus : « selon l'instrument, il
exclut l'axe manquant, ou le compte pour zéro », avec `Q_MOD_03` en exemple
vivant du second cas. Trois gestes : le total global **tombe avec son axe** —
sauf `horsTotal` et sauf la **renormalisation** de `Q_SOM_09`, dont le total est
une proportion sur les axes couverts ; un **booléen à `null`** n'est pas un
« non » ; et deux absences de total global se distinguent enfin, le champ
**absent** (un instrument qui n'en produit pas) et le champ à **`null`** (un total
qui n'a pas pu être établi) — la réserve nommée à la clôture du lot précédent.
Une première rédaction de v11 énonçait la chute **sans réserve** : elle était
fausse de l'agenda du sommeil, et c'est le banc de couplage qui l'a montré.

**Ce que ce lot ne couvre PAS**, mesuré et nommé plutôt que passé sous silence :

- **La passation partielle d'un instrument à axe unique.** `horne`, `sum_items`,
  `sum_decimal`, `bms_average`, `count_threshold` sous-estiment leur total dès
  qu'un item manque, et gardent leur bande. Refuser de scorer une passation
  incomplète est un autre contrat, et un autre arbitrage.
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
- **Le `max` déclaré des `dimensions` de `sum`**, recopié depuis la définition au
  lieu d'être recalculé sur les items : un littéral divergeant serait silencieux.
  Le moteur `seuils_points` le recalcule déjà ; les unifier changerait des valeurs
  servies.

Douze tests neufs et **dix-sept preuves par mutation**, dont celles qui rendent
`alertMA` à `false`, `suicidalIdeation` à `false`, `highRisk` conclusif sur
l'incomplet, et celles qui attaquent le banc lui-même — un instrument retiré de la
couverture, un identifiant de périmètre inexistant.
