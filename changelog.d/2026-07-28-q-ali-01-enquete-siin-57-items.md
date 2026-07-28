### Clinique

- **`Q_ALI_01` retrouve sa forme source : l'Enquête alimentaire SIIN, 57 items,
  total /90.** L'instrument servi depuis l'origine en comptait **14**, cotés /42.
  Ce n'était pas une troncature : le banc de certification a comparé les libellés
  position par position et trouve des similarités de 0,00 à 0,33 — une
  **réécriture indépendante** portant le nom de la source. Décision praticien du
  2026-07-27, réalisée ici **derrière un drapeau éteint** : rien ne change en
  production tant qu'il n'est pas allumé.
- **Le barème n'était pas indéterminé, il était seulement non lu.** Les documents
  `WN-SRC-0470` (volet patient) et `WN-SRC-0471` (volet pro) donnent, pour chaque
  item, un **seuil** et une **valeur de 1 ou 2 points**, acquise si le seuil est
  atteint. La somme des 57 valeurs fait **exactement 90** — le `/90` que le guide
  clinique et la boussole citaient sans que le code sache d'où il venait.
  L'énigme « 57 × 2 = 114 » est close, et les quatre bandes publiées (`<25`,
  `26-50`, `51-70`, `>71`) s'appliquent telles quelles. Un test vérifie la somme,
  plutôt qu'un commentaire l'affirme.
- **Saisie : la quantité réelle là où la source demande « combien ».** 33 items en
  saisie chiffrée, 24 en Oui/Non — la règle vient de la source elle-même.
  Reformuler un « combien » en affirmation-seuil (« Je bois plus de 12 verres
  d'eau par jour ») en ferait une **question suggestive**, qui attire
  l'acquiescement. Les quantités sont conservées dans `rawAnswers` : un barème
  révisé se rejouera sur les réponses déjà recueillies, sans redemander une
  passation.
- **Un moteur dédié, `seuils_points`, et non `sum`.** `sum` additionne la valeur
  de l'option choisie ; il aurait fallu encoder le score dans l'option, et deux
  quantités valant toutes deux 0 point seraient devenues indiscernables une fois
  enregistrées. La quantité aurait été perdue à la saisie.

### Deux dangers silencieux, désamorcés

- **Le rescorage à zéro.** Les 8 passations de la forme courte, rescorées contre
  les nouveaux items, rendaient `total: 0` — et `equilibre/score.ts` accepte 0
  comme une valeur. Besoin 1 à 0, sous le seuil d'effondrement, donc **« Mon
  équilibre » plafonné à 50 pour 6 patients**, sans une erreur. Le moteur rend
  désormais « non scoré ». Même doctrine que l'agenda du sommeil sous son seuil
  de nuits : jamais un 0 par défaut.
- **Les brouillons en cours.** Réutiliser les identifiants `AL1`–`AL14` aurait
  transplanté les brouillons `localStorage` des **4 assignations ouvertes** sur
  d'autres questions, en silence. Espace de noms neuf (`SIIN01`–`SIIN57`), et un
  test l'impose. Effet de bord utile : une passation dont les clés commencent par
  `AL` reste reconnaissable à vie comme relevant de la forme courte.

### Trois gardes existants ont trouvé de vrais défauts

Aucun n'a été affaibli ; deux ont été renforcés.

- **`scoring-check` ne voyait pas la forme gatée.** Vert en position éteinte, il
  aurait laissé merger et cassé à la bascule. Il tourne désormais dans **les deux
  positions**, en local **et en CI** — le workflow appelait le script en direct,
  pas le script npm, donc la correction seule côté `package.json` n'aurait
  protégé que les machines de développement.
- **Il a refusé la couverture partielle des catégories.** 22 items
  n'appartenaient à aucune : le profil affiché ne s'additionnait pas au total,
  soit un profil faux sous un score juste. Les 57 items sont désormais couverts
  par **12 catégories**, chacun dans exactement une, et le `max` déclaré de
  chaque catégorie est vérifié contre le barème. Le cadrage prévoyait 5 à 6
  catégories : c'est le garde qui a corrigé le plan.
- **La liste figée des instruments servant une conduite** passait de 13 à 12, la
  forme SIIN n'en portant aucune (doctrine #389). Son entrée `Q_ALI_01` suit
  maintenant la forme servie : figée sur un littéral, elle aurait été forcément
  fausse dans l'une des deux positions — et un garde toujours rouge finit
  désactivé.
- **`questionnaires-source-unique`** interdit qu'un module exporte un
  questionnaire qui n'est pas la valeur servie. La paire commutée par drapeau
  tombait dessus. L'exception est **nominative**, et trois assertions neuves
  l'accompagnent : la forme déclarée doit exister, exactement une doit être
  servie, et les deux doivent porter le même identifiant. Tout NOUVEL export non
  servi échoue toujours.

### Saisie en grille

- Renderer `guided_sections` : une ligne par item, réponses en regard, repliées
  sur écran étroit. Les options restent de **vrais `input[type=radio]`** — le
  parcours patient E2E remplit en cochant `form input[type="radio"]`, et
  `Q_ALI_01` est dans le pack de base : des boutons stylés auraient cassé tout le
  parcours, en plus de perdre la navigation clavier et l'annonce par lecteur
  d'écran.
- **Le renderer est décidé par le serveur et transmis.** `Q_ALI_01` a deux formes
  et le drapeau qui les départage n'existe que côté serveur : laisser le client
  trancher lui ferait lire `undefined`, donc servir la disposition de l'autre
  forme.

### Version du score : v5 → v6, et pourquoi pas v5

- `main` avait bumpé à **v5** trois commits plus tôt, pour la règle de nouveauté
  des jalons, en écrivant que le changement `Q_ALI_01` « appelle son propre bump,
  pas un partage de cette étiquette ». Partager v5 aurait fait recouvrir deux
  définitions du score par une même étiquette, et le comparateur n'aurait plus su
  laquelle il compare. D'où **v6**.
- **`max` du besoin 1 et étiquette de version sont DÉRIVÉS du barème servi**,
  jamais recopiés. Un littéral aurait été faux dans une des deux positions du
  drapeau, sans qu'aucun test tournant en position éteinte ne le voie. Cela ferme
  au passage un piège connu : aucun garde ne comparait `BESOIN_SOURCES[n].max` au
  `maxTotal` réel.

### Corrections de vérité

- `submit/route.ts` et son test affirmaient que `Q_ALI_01` est un « questionnaire
  fonctionnel » hors catalogue, persisté sans score. C'est faux : il est au
  catalogue et scoré comme les autres — ses 8 passations portent un
  `scorePrincipal`. Seul `Q_PLAINTES` est réellement hors catalogue, et c'est le
  seul que le test exerce.
- Registre instruments : `formePubliee` renseignée (57 items, seuils, /90, quatre
  bandes), `sourceIds` rattachés aux deux documents, propriétaire des droits
  nommé. `versionServie` reste `a_auditer` — le garde interdit d'y écrire une
  description sous ce statut, et la forme servie dépend encore du drapeau.

### Réserves connues

- **Le banc golden `tests/wellneuro/golden/scoring-golden.test.mjs` est mort ET
  cassé.** Aucun script npm ni étape de CI ne l'exécute, et il échoue déjà sur
  `origin/main` (`SyntaxError: Unexpected token 'export'`) — vérifié dans un
  worktree détaché sur `main`, sans ce lot. Le cadrage le tenait pour un gate ;
  il n'en est pas un. La forme SIIN est couverte par un banc dédié qui, lui,
  tourne dans les deux positions du drapeau. Réparer le golden est un lot à part.
- **La grille n'est pas exercée par les E2E** : drapeau éteint, c'est la forme à
  14 items qui est servie. Elle est couverte par tests de composant, contrôle
  négatif compris (sans le renderer serveur, la même définition retombe en liste
  déroulante).
- **Les 4 assignations ouvertes doivent être tranchées avant l'allumage** :
  laisser expirer, annuler et réassigner, ou laisser basculer. Ces patients ont
  reçu une invitation annonçant 15 minutes.
- **Aucune migration, aucune écriture en base**, aucun rescorage des 8 passations
  existantes — les 43 items manquants n'ont jamais été posés. Retour arrière par
  `git revert` ou extinction du drapeau.
- Le **branchement des sous-catégories aux besoins** (besoin 2 en exposition,
  besoin 3 en rythme) reste au lot suivant, après passation test : l'ordre est
  gravé dans l'arbitrage du 2026-07-27. Le **pont vers la boussole** est une
  finalité distincte, traitée séparément.
