### Ajouté — Accès portail serveur de l'agenda alimentaire, et son contrat SQL (lot L4a)

L3 avait livré la table et la persistance sans qu'aucun appelant n'existe. Ce lot
ouvre la première surface serveur : une route portail `GET`/`POST` sur
`/api/portail/agenda-alimentaire`, avec son `authorize` dédié. Toujours pas d'écran —
la saisie patient reste à L4b, et `WN_AGENDA_ALI` reste **éteint**.

#### Quatre gardes que le jumeau du sommeil n'a pas

- **La saisie exige un consentement enregistré.** `Assignation.consentement` vaut
  `'non_donne'` par défaut, et une assignation créée depuis la bibliothèque praticien
  naît ainsi. Sa seule garde était un **écran** de portail, qu'un appel direct à l'API
  contourne entièrement ; `api/patient/submit` ne lit ce champ nulle part. On pouvait
  donc ouvrir 21 jours de recueil de donnée de santé sans consentement enregistré.
  C'est fermé sur l'agenda alimentaire, en `403`.
- **La clôture de suivi ferme la saisie.** `Patient.suiviClotureLe`, écrit par
  `api/praticien/patients/cycle-de-vie`, n'était lu par aucun chemin d'écriture
  serveur : un dossier clôturé recevait des saisies. **Aucune vue praticien de
  l'agenda _alimentaire_ n'existe encore** — L4a n'ouvre qu'une route portail ;
  ce qu'on peut affirmer, c'est que la vue de suivi de l'agenda du **sommeil**
  (`api/praticien/agenda-sommeil/suivi/route.ts`) filtre déjà `suiviClotureLe: null`,
  et que la vue alimentaire à venir suivra la même règle. Les saisies recueillies
  après clôture seraient donc collectées sans destinataire.
  Une troisième barrière est posée sur `Assignation.consentementRetraitDate`, mais
  c'est une **pré-position** : aucun chemin du dépôt n'écrit ce champ, donc aucun
  patient ne peut aujourd'hui retirer son consentement au niveau assignation. Elle
  attend le mécanisme qui n'existe pas encore. Les gardes sont posées sur
  l'alimentaire **seul** : voir la décision **D-015**, qui nomme l'asymétrie et laisse
  la dette ouverte sur `api/patient/submit` et sur l'agenda du sommeil.
- **Un second envoi sur une date déjà notée est refusé en `409`**, sauf s'il porte un
  `supersedesJourId` désignant la journée **active** de cette date — et l'écriture est
  refusée **sur la seule date** dont une ligne est illisible, une ligne en quarantaine
  faisant passer sa date pour non notée. Le refus ne s'étend pas à l'agenda entier :
  `date_jour` est une colonne, `listJours` remonte donc `datesIllisibles` à côté du
  compte, et fermer les vingt autres journées coûterait au patient un recueil complet
  pour éviter un faux +1 sur une métrique interne — sans qu'aucun geste de sortie
  n'existe, le seul `deleteMany` sur cette table étant l'effacement RGPD du dossier.
  Dans tous les cas, `illisibles > 0` ouvre une ligne de journal d'intégrité — sur la
  **lecture comme sur l'écriture**, faute de quoi un agenda encore consulté mais plus
  alimenté n'ouvrirait jamais d'incident, alors que la quarantaine naît précisément
  d'une fenêtre (rollback, conteneur v1 relisant du v2) où les lectures dépassent de
  loin les écritures. Aucune date n'entre dans ses métadonnées.
  Il n'existe volontairement aucune contrainte
  unique sur `(id_assignation, date_jour)` : `lignes − dates distinctes` est le taux de
  correction, seule métrique de friction du lot. Sans ce refus, un double-clic serait
  indiscernable d'une correction réelle et la métrique mentirait — la base ne peut pas
  faire cette distinction, le chemin d'écriture le peut. Ce `409` rend le double-clic
  **improbable, pas impossible** : la lecture et l'écriture ne sont pas dans une
  transaction, et deux envois concurrents passent tous deux (réserve consignée en
  D-015).
- **`modification_demandee` est refusé au même titre que `verrouille`**, aligné sur
  `api/patient/submit/route.ts`. Deux chemins d'écriture qui divergent sur le même
  statut d'assignation finissent par se contredire au dossier.

L'ordre des barrières place les **états terminaux avant les gestes à poser** : une
assignation annulée ou un suivi clôturé rendent `410` **avant** que le consentement ne
soit réclamé. L'ordre inverse envoyait le patient vers un geste impossible —
`api/patient/consentement` refuse en `410` sur une annulée — ou, pire, vers un geste
qu'elle aurait **exécuté** : cette route ne lit pas `suiviClotureLe` et aurait écrit le
consentement sur un dossier clôturé, juste avant qu'on le referme.

La route est journalisée (`PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.*`). Son jumeau du
sommeil ne trace rien : une énumération d'`idAssignation` y est invisible, alors que
`patient/submit` la trace depuis toujours. Les refus de **forme** rendus avant toute
barrière portent un code d'événement distinct de celui des refus post-authentification :
ils ne décrivent pas la même population, et les compter ensemble n'aurait pas de sens.
Les deux `400` de forme (JSON illisible, corps qui n'est pas un objet) descendent en
`DEBUG` — bruyants et sans information que le statut ne donne déjà. Le `413` reste en
`WARN` : c'est le seul signal d'abus du chemin d'écriture, et le descendre ne fermerait
rien, la branche `unauthenticated` écrivant déjà un `logger.security` par requête à un
coût bien inférieur aux 32 Kio qu'exige le `413`.

Sur le **chemin d'écriture**, seules la **classe** de l'erreur et son `code` sont
tracés, jamais son message : `sanitizeError` tronque et masque, il ne retire pas la
charge d'un `PrismaClientValidationError` — qui recopie l'invocation fautive,
`data.reponses` comprise, c'est-à-dire les horaires de prises du patient. La classe
passe par le champ `error`, sous la forme d'une `Error` neutralisée (nom recopié,
message fixe, pile retirée), et **non** par `metadata` : `sanitizeMetadata` réduit tout
mot de 24 caractères ou plus à `[id]`, et les quatre classes d'erreur Prisma — de 26 à
31 caractères — y disparaissaient toutes ; seul `TypeError` survivait, c'est-à-dire la
trace des erreurs de domaine et pas celle des pannes. `sanitizeError`, lui, recopie
`type` verbatim.

#### La réserve de L3 est levée : `prisma/checks/agenda_alimentaire_v1.sql`

L3 déclarait que **aucune ligne n'avait jamais été écrite ni relue contre une vraie
base**. Le nouveau contrat, joué par le CI et repris automatiquement par `T3` (la liste
des contrats y est extraite de `ci.yml`, jamais recopiée), éprouve sept invariants que
`prisma migrate diff` ne voit pas :

- la **RLS** est active et sans policy — Prisma ne l'introspecte pas ;
- les **deux clés étrangères sont en `ON DELETE RESTRICT`**. C'est ce RESTRICT qui rend
  porteur l'ordre de suppression de `patient/effacement.ts` ; passées en CASCADE, la
  suppression nommée deviendrait du **code mort** et le test d'ordre resterait vert ;
- **aucun index unique sur `(id_assignation, date_jour)`** — assertion **inversée**,
  délibérée. En poser un ressemblerait à un durcissement et casserait le modèle
  append-only. Deux assertions plutôt qu'une : l'index de lecture doit exister **et**
  ne pas être unique, sinon « l'index a disparu » satisferait le contrat ;
- **aucune colonne** nommée `gramme`, `kcal`, `score`, `indice` ou `quantite` : la
  frontière « journal alimentaire, pas carnet de pesée ni de score » cesse d'être un
  commentaire de migration pour devenir exécutable ;
- **aucune clé de premier niveau du JSONB `reponses`** portant les mêmes motifs. Un
  verrou qui ne regarderait que les colonnes couvrirait le seul chemin que ce lot
  n'emprunte pas : toute la donnée du recueil vit dans le JSONB, où poser un
  `totalKcal` ne coûte aucune migration. Portée limitée au **premier niveau** —
  `jsonb_object_keys` ne descend pas dans `prises[]`, et c'est une limite connue,
  vérifiée comme telle ;
- **aucune version de contrat inconnue** en base, et **aucun chaînage `supersedes_jour_id`**
  pendant ou franchissant patient, assignation ou date — l'invariant que `saveJour` tient
  côté applicatif, et que rien ne tient contre un `INSERT` manuel.

Les **trois derniers** renvoient **0 ligne par vacuité sur la base CI, qui est vide** :
leur valeur est d'être rejouables à la main, en lecture seule, sur la production. Le
verrou JSONB en fait partie — une base sans journée n'a aucune clé à parcourir.

**Chaque assertion a été éprouvée par mutation** contre un PostgreSQL jetable — RLS
désactivée, policy ajoutée, chacune des deux FK passée en CASCADE puis en SET NULL,
index unique créé, index de lecture supprimé, colonne `totalKcal` puis `quantite_g`
ajoutées, clés JSONB `totalKcal`, `quantite_g` et `scoreEquilibre` posées dans
`reponses`, version de contrat inconnue, chaînage vers une autre date, vers un autre
dossier, et pointeur pendant. Toutes mordent, et chacune pour le bon motif. **Aucun
compte n'est annoncé** : ces mutations ont été jouées à la main sur une base jetable et
**aucun artefact du dépôt ne permet de les rejouer** — un chiffre invérifiable
ressemblerait à une preuve. Les **contrôles négatifs**, joués de la même façon, passent
eux aussi : une ligne sans version (ou à version `null`) reste tolérée, une correction
légitime — deux lignes sur la même `date_jour`, chaînées — n'est pas refusée, une
journée légitime ne déclenche pas le verrou JSONB, un `reponses` qui n'est pas un objet
ne le fait pas lever non plus, et une clé suspecte **imbriquée** dans `prises[]` passe —
limite connue, mesurée, écrite dans le fichier plutôt que découverte plus tard. Un garde
vert qui n'a pas mordu ne prouve rien.
