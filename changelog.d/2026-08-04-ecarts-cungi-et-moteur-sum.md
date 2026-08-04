### Recueil partiel des moteurs `sum`/`bms_average` et trois écarts du LOT-07 tranchés (2026-08-04)

- **Changement de logique clinique.** Les moteurs `sum` et `bms_average`
  (`web/src/lib/questions.ts`) ne rendent plus de bande d'interprétation sur un
  recueil partiel. Un item non répondu était jusque-là ignoré : le total
  sortait plus bas et décrochait une bande calibrée sur la forme complète —
  l'erreur était à sens unique, vers le sous-classement, c'est-à-dire le faux
  négatif. `bms_average` rend en plus `average: null`, sa moyenne divisant par
  des items jamais posés.
- **Même défaut dans « Mon équilibre », et là il mordait vraiment.**
  `web/src/lib/equilibre/score.ts` recalcule le score sur les `rawAnswers`
  stockés puis divise le total par le `max` de la forme **complète** : un item
  ignoré (jamais compté 0) faisait un total trop bas, donc un ratio faux. Sur
  une source `inverser: true` — `Q_STR_03`, besoin 9, `max: 55` — la couverture
  **montait** quand la mesure manquait : « besoin bien couvert » sur un
  instrument tronqué. Ici le total n'est pas servi à côté d'une bande, il **est**
  la lecture. Une source dont le résultat porte `missing > 0` ne compte donc
  plus (`null`, jamais 0) ; un besoin dont toutes les sources sont partielles
  ressort **non mesuré**, et non effondré. La branche à sous-score n'est pas
  touchée : le `missing` de la racine décrit l'instrument entier, et les
  porteurs de sous-scores tiennent déjà leur propre complétude.
- **Portée mesurée, pas supposée — et le trou côté serveur est réel.** `sum`
  sert **26 instruments drapeau `WN_ALI_01_SIIN57` éteint, 25 allumé** (allumé
  en production : `Q_ALI_01` bascule alors sur `seuils_points`) ; les trois
  `type:'sum'` de `questionnaires/neuropsychologie.ts` sont des `parts` d'un
  `composite_multi_parties` et n'en font pas partie. Aucun n'a d'item
  conditionnel, mais la seule barrière de complétude est celle du **navigateur**
  — `api/patient/submit` ne l'exige que pour `def.cabinet`, et **aucun**
  instrument servi par `sum` n'est de cabinet : un POST partiel authentifié est
  accepté aujourd'hui et produisait une bande fausse. Ce qui est nul, c'est le
  déjà-écrit : les **21 réponses `sum` en production portent toutes exactement
  le nombre d'items attendu** (lecture `execute_sql` du 2026-08-04). Aucun
  résultat existant ne change ; ce que la garde ferme est l'écriture suivante.
- **Cinq gardes existants** épinglaient l'ancien comportement et ont été mis
  à jour, chacun avec sa raison écrite sur place ; ils sont désormais plus
  stricts (`interpretation` attendue à `null` là où ils l'attendaient non
  nulle). Le cinquième est `equilibre/evidence.test.ts` : il attendait une
  preuve de niveau 'B' sur **trois items sur quatorze** de la forme courte
  `Q_ALI_01` — soit ~14 % de couverture sur une **fondation critique**, donc
  « Mon équilibre » plafonné à 50 pour un questionnaire presque pas administré.
  Le cas `AL*`/SIIN était rassurant à tort, celui-là alarmant à tort.
- **Classe NON fermée — trois instruments servis portent le même défaut**, hors
  périmètre de ce lot et nommés ici pour que personne ne la croie close :
  - `sum_decimal` (`Q_GEO_05`, QDRS, gradation de démence) — un recueil partiel
    décroche la bande « Normal » (0-1) : **faux négatif sur un dépistage de
    démence**, le plus grave des trois ;
  - `count_threshold` (`Q_INF_05`) — il **calcule** `missing` et l'ignore pour
    la bande ;
  - `ecab` (`Q_NEU_08`, dépendance aux benzodiazépines).
- **Trois écarts du LOT-07 tranchés** dans
  `docs/claude/corpus/instrument_registry.json` :
  - **`Q_STR_03`** — la cotation 0-55 contre 11-66 n'est pas un défaut, c'est
    un ré-encodage à translation constante (servi = source − 11) : le
    classement des patients est inchangé. Ce sont les cinq **bandes**
    d'interprétation qui n'ont aucune source ; une réserve est posée sur
    `verdictScoring` (plafond `scoring_verifie`, n'abaisse pas le barreau
    courant), arbitrage praticien de ne pas échanger un jeu de seuils non
    sourcé contre un autre.
  - **`Q_NEU_03`** — `anneePublication` passe de 1992 à **2008** : les deux
    dates qui circulaient (1992 au registre, 1998 sur la notice de l'éditeur)
    datent l'entretien structuré d'origine, un autre objet ; le PDF de la
    version auto-évaluée réellement servie porte « © 2008 ».
  - **`Q_FIB_03`** — piste ACR 1990 fermée : le dépôt ne sert pas l'examen des
    18 points sensibles, mais 9 zones cotées 0-3 et 3 symptômes associés, en
    moteur « journal », sans score total.
- `statutCertification`, `cosmin`, les seuils, les bandes d'interprétation et
  les items restent inchangés : aucun statut de certification n'est promu par
  ce lot.
