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

**Portée réelle, mesurée : un seul cas vivant.** `sumItems` compte une réponse
manquante comme `0` et le moteur `subscore` émet toujours ses sous-scores. Le
seul moteur rendant `null` est l'agenda du sommeil sous son seuil de 5 nuits. Un
patient avec PSQI (grade A) et un agenda ouvert à moins de 5 nuits (grade B), sans
`Q_MOD_01`, voyait le besoin 5 en **B** ; il passe en **A**. Le B était fabriqué :
il reposait sur une source dont `score.ts` ignorait déjà la couverture.

**Pas de bump de `VERSION_SCORE_EQUILIBRE`, et un bump serait nuisible.** Le
niveau de preuve n'entre dans aucun calcul de `calculerEquilibre` et n'est jamais
persisté — il est recalculé à la lecture. Bumper rendrait tous les épisodes
existants incomparables pour signaler un changement de **badge**.

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

- **« Répondu mais vide » compte toujours comme une preuve.** Un `rawAnswers`
  vide est truthy et score `total: 0` : couverture `0`, pas `null`. Avant comme
  après — un test le dit, pour que ce lot ne soit pas lu comme l'ayant corrigé.
- Ce lot **n'allume pas** `WN_ALI_01_SIIN57`. Aucune migration, aucune écriture
  en base, aucun barème, seuil ou bande touché.
