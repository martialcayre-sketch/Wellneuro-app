### Le gate d'affichage est levé, plus contourné

`Q_ALI_01` portait `activation: 'blocked'` pendant qu'une **exception nominative
en dur** dans le résolveur rendait tout de même la grille dès que 57 items
étaient servis. Le registre annonçait donc une chose et le code en faisait une
autre — un gate contourné, pas levé.

- La condition est désormais **déclarée là où le gate l'est**, par un champ
  `leveeConditionnelle`, et le résolveur `resoudreRenderer` la lit **sans
  connaître aucun identifiant d'instrument**.
- **`activation` reste `blocked`, délibérément.** L'identifiant sert deux formes,
  et le dépistage court à 14 items ne satisfait toujours pas le gate. Le passer à
  `enabled` aurait ouvert la grille à la forme non certifiée — et aurait élargi
  une union que trois sites lisent, pour un cas unique. `getEnabledRenderer`
  reste ainsi correct **par construction**, pas par coïncidence.
- Le `gate` nomme maintenant **les deux formes** : ce qui est levé, pour quelle
  raison, et ce qui reste bloqué.
- **Le discriminant est `scoring.maxTotal`, pas un compte d'items.** Un compte
  serait un proxy isolé : ajouter un item ferait retomber le rendu en `standard`
  **en silence**. `maxTotal` porte déjà tout le lot — étiquette de version du
  score, `max` du besoin 1, banc de la forme servie — donc une dérive y devient
  un test rouge **existant**.

`statutCertification: "repere"` n'a jamais été le référent de ce gate : **60 des
64 instruments le portent**. Les deux conditions écrites du gate — certification
documentaire et fixture de scoring — sont satisfaites par la forme SIIN
(`WN-SRC-0470`, `WN-SRC-0471`, banc dédié tournant dans les deux positions du
drapeau) et ne le sont pas par la forme courte.

**Le chemin legacy recevait la grille en listes déroulantes.**
`/patient/[idAssignation]` rendait `GenericQuestionnaire` **sans la prop
`renderer`** ; le repli client retombait sur l'identifiant seul, donc sur le rendu
standard. Le gate aurait été levé côté portail et contourné côté lien e-mail. La
page transmet désormais le renderer décidé par le serveur, comme le fait déjà la
page portail.

### Une source à couverture nulle comptait comme une preuve

`evidence.ts` filtrait par `Boolean(reponses[idQuestionnaire])` : le prédicat
ignorait `sousScore` **et** ignorait l'échec de scoring. Un besoin pouvait donc
afficher un grade de preuve alors que `score.ts` le tenait déjà pour **non
couvert** — un badge fabriqué, exposé au praticien par `api/praticien/besoins`.

Le prédicat est désormais `calculerCouvertureSource(...) !== null`, **le même que
celui de `score.ts`**. Il n'est pas extrait dans un troisième module : ce serait
dédoubler la définition de « source exploitable », le défaut même qu'on corrige.

**Portée réelle, mesurée — et la première rédaction la disait fausse.** Elle
annonçait « un seul cas vivant, l'agenda du sommeil ». La revue adversariale a
sondé les treize sources de `BESOIN_SOURCES` : **cinq** rendent `null`, pas une.
Les quatre autres sont des moteurs `sum` (`Q_ALI_01`, `Q_INF_01`, `Q_STR_02`,
`Q_STR_03`), qui portent depuis #430 la garde anti-zéro — aucune réponse
correspondante ⟹ `total: null`, jamais `0`. Les moteurs `psqi`, `had`, `tfd`,
`subscore` et `group_majority` ne rendent jamais `null` : le besoin 10 et ses
trois sous-scores `Q_INF_03` sont bien épargnés.

**Chiffré en production** (`execute_sql`, 2026-07-28) :

- **0 agenda `Q_SOM_09`** — le cas présenté comme « le seul vivant » n'existe pas
  encore en base ;
- **8 passations `Q_ALI_01` portant des clés `AL*`** — le cas réellement vivant,
  et c'est celui de la campagne. Relues sous la forme SIIN, elles ne
  correspondent à aucun item : le besoin **1, fondation critique**, passe de
  « preuve B » à `NON_MESURE`. Le B était fabriqué — `score.ts` tenait déjà ce
  besoin pour non couvert. Un test le fixe **dans les deux positions du drapeau** ;
- 3 lignes sans `rawAnswers`, toutes sur des patients fictifs de seed, et déjà
  écartées en amont par `depuisPrisma`.

**Pas de bump de `VERSION_SCORE_EQUILIBRE`, et un bump serait nuisible.** Le
niveau de preuve n'entre dans aucun calcul de `calculerEquilibre`. Bumper
rendrait tous les épisodes existants incomparables (`versions_differentes`,
comparaison momentum désactivée sans reprise) pour signaler un changement de
**badge** — le mauvais levier.

**Mais il n'est pas « jamais persisté », comme l'affirmait la première
rédaction.** Il entre dans `ClinicalSnapshot.inputHash`, donc dans la chaîne de
provenance réellement écrite en base — `snapshot_input_hash`,
`decision_card_input_hash`, `input_hash` du brouillon de protocole. Conséquence
bornée mais réelle : pour un dossier dont un grade change, la prochaine
régénération produit un hash différent **sans qu'aucune réponse patient ait
bougé**, donc une nouvelle version de brouillon et une approbation de diffusion
marquée obsolète. La chaîne praticien est dormante à ce jour (0 épisode,
0 protocole), mais le fait devait être écrit.

### Ce que les gardes vérifient

- **Comportemental d'abord** : `resoudreRenderer` est exercée sur des policies
  **fabriquées à la main**, sans aucun instrument nommé. Un garde de style
  (`resoudreRenderer.toString()` ne contient aucun `Q_XXX_NN`) le double — il
  interdit une orthographe, pas un comportement, et n'a de valeur qu'avec l'autre.
  Sa portée est le **corps de la fonction**, jamais le fichier : le registre du
  même fichier n'est que des littéraux `Q_*`.
- **Contrôle négatif manquant, ajouté** : un identifiant absent du registre reste
  au rendu standard. L'ancien n'exerçait que des identifiants **présents**, il ne
  prouvait pas que la policy par défaut refuse.
- **Anti-sur-filtrage sur la preuve** : un agenda **exploitable** doit toujours
  dégrader le besoin 5 en B. Sans lui, un prédicat qui écarterait *tout* agenda
  ferait passer le test principal au vert en supprimant la source au lieu de la
  qualifier.
- **Invariant inter-modules** : `NON_MESURE` **si et seulement si**
  `calculerCouvertureBesoin` rend `null`, sur une matrice de jeux de réponses ×
  douze besoins. Le membre droit est l'agrégat **public** de `score.ts` — surtout
  pas `calculerCouvertureSource`, qui serait l'appel qu'on vient de tester.
- **Preuves par mutation** : remettre `Boolean(reponses[...])` fait rougir trois
  gardes ; neutraliser la levée conditionnelle en fait rougir deux.

### Réserves

- **Le prédicat fautif subsiste dans `clinicalSnapshot.ts`**, où il décide
  d'`evaluability` — le seul champ que lit `clinicalReview` pour émettre le
  finding `missing_data`. Un besoin peut donc désormais se contredire dans un
  même objet : aucune mesure, `evidence: NON_MESURE`, et `evaluability: 'partial'`
  qui garde le moteur clinique muet. L'aligner change `inputHash` et fait
  apparaître des findings neufs — c'est un changement de signal clinique servi,
  qui a son go séparé. **Réserve explicite, pas un oubli** : ce lot ne l'aligne
  pas et le dit.
- **« Répondu mais vide » ne se résume pas à une règle.** Un `rawAnswers` vide est
  truthy, mais ce qu'il devient dépend du moteur : `psqi` score `0` et la source
  compte toujours ; les moteurs `sum` rendent `null` et elle cesse de compter. Un
  test fixe les deux, pour qu'aucune des deux moitiés ne soit lue comme la règle.
- Ce lot **n'allume pas** `WN_ALI_01_SIIN57`. Aucune migration, aucune écriture
  en base, aucun barème, seuil ou bande touché.
