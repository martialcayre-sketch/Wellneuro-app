# Handoff — 2026-09-21 — Le repli d'assiette devient une relation orientée (D-241)

## 1. Branche et état Git

- Branche : `wn-lot03-substitution-orientee-2026-09-21`, partie d'`origin/main`
  à `79f726b6`.
- Worktree : `.claude/worktrees/phases-hash-2026-09-16`.
- Aucune migration, aucun `schema.prisma`, aucun drapeau, **aucun
  `contentHash` touché**.

## 2. Objectif de la session

« Go lot 03 et lot 04 full auto pour cette nuit ». LOT-03 du cadrage
Boussole/Assiette — exécuté **dans la portée que la surface de relecture du
2026-09-16 autorise** : les trois points MÉCANIQUES du programme de `D-216` §4,
jamais le quatrième, qui est une affirmation clinique.

## 3. Ce que le lot livre

1. **La relation est orientée** et vit HORS du catalogue —
   `web/src/lib/clinical/replisAssietteV1.ts`. Trois qualités deviennent des
   champs : la DIRECTION (`depuis` → `vers`, l'inverse demande une seconde ligne
   attestée), la CONDITION (`indication` nomme l'`id` d'une ligne
   d'`INDICATIONS_ASSIETTES_V1`, **vérifié**), le DEGRÉ.
2. **La garde d'axe est posée aux deux bouts** — le trou que `D-240` §10
   nommait. Un repère de moment de repas ne se prescrit pas : il ne se replie ni
   ne sert de repli.
3. **Le chemin est ouvert.** `alternatives` n'est plus un tuple vide littéral
   mais les replis attestés des assiettes **prescrites du protocole actif**.

**La table est VIDE et NON SIGNÉE**, et c'est l'état nominal.

## 4. LE FAIT QUI COMMANDE LA FORME

**`substitutionFamily` est l'un des QUATRE champs du `contentHash` d'une
entrée.** Toute référence consignée porte ce hachage, et
`assertCurrentRecommendedPlateRef` refuse celle dont il a bougé. Poser la
relation DANS le catalogue aurait donc périmé des références déjà posées — et
depuis `D-240`, des protocoles en portent. D'où la table externe. Le champ
supplanté **reste** dans l'empreinte, `null`, avec la raison écrite : le retirer
coûterait exactement le même prix que le remplir.

## 5. Décisions prises

- **Une table, pas un champ** — contrainte d'empreinte avant choix de design.
- **Le vocabulaire descend dans `food-compass/types.ts`**, qui n'importe rien :
  `replisAssietteV1` importe `plates.ts`, l'inverse ferait un cycle.
- **La table arrive en paramètre SANS valeur par défaut** : un appelant ne peut
  pas oublier de dire quelle table fait foi, et le verrou reste à un seul
  endroit.
- **On ne signe pas une absence** : le verrou refuse la table vide même sous une
  signature valide, sinon la première ligne entrerait sous une attestation
  acquise.
- **La table n'entre PAS à la matrice de consommation** : la convention y fait
  entrer une source « le jour où elle atteint un ÉCRAN », et celle-ci n'atteint
  qu'une réponse d'API qu'aucun composant ne rend.

## 6. Fichiers — quatorze : neuf modifiés, cinq créés

**Domaine (4)**
- `web/src/lib/clinical/replisAssietteV1.ts` — **créé** : la table, sa
  métadonnée, ses anomalies, son verrou, ses deux points de service.
- `web/src/lib/food-compass/types.ts` — `DegreDeRepli`, `RepliAssietteDeclare`.
- `web/src/lib/food-compass/plates.ts` — `decidePlateSubstitution` réécrite ;
  `substitutionFamily` marqué supplanté, gardé pour l'empreinte.
- `web/src/app/api/praticien/boussole/route.ts` — `alternatives` typé et calculé.

**Bancs (2)**
- `web/src/lib/clinical/replisAssietteV1.guard.test.ts` — **créé**, 18 cas.
- `web/src/lib/food-compass/plates.test.ts` — 7 cas (les 5 de substitution
  réécrits, l'ancien cas butait sur l'absence de famille, il bute désormais plus
  tôt et pour une meilleure raison : l'axe).

**Documents (8)** — `docs/DECISIONS.md` (D-241 **et** les deux corrections
posées DANS D-240), `changelog.d/2026-09-21-repli-assiette-oriente.md` (créé),
le cadrage, la surface de relecture des familles,
`docs/claude/MATRICE_CONSOMMATION.md` (régénérée), `docs/FEATURE_FLAGS.md`
(le tableau des verrous — voir §8 bis), `docs/claude/SESSION_LOG.md`, ce handoff
(créé).

Liste énumérée AVANT le total, et le total pris dessus : 4 + 2 + 8 = 14.
Décompte relu à `git status`, jamais de mémoire.

## 7. Validations exécutées

- **T1** `cd web && npm run check` — `T1-EXIT=0`, lu dans le fichier redirigé.
  **T1 ne joue que les fichiers liés au diff** (la règle le dit) : 45 fichiers,
  705 cas ici, plus 1623 du second projet. Le compte varie avec le diff — ce
  n'est pas une suite qui rétrécit.
- **T2** `npm run test:worktree -- --fast` — à jouer avant la PR (voir §10).
- **Sept mutations, sept rouges, et chacune ne rougit QU'UN seul cas** :
  direction rendue bidirectionnelle, axe retiré à la source, axe retiré à la
  cible, table vide rendue signable, anomalie tolérée, périmètre rétréci aux
  seuls identifiants, brouillon rendu servable. Sauvegarde par `cp`, mutation
  **vérifiée appliquée** avant de jouer le banc, restauration par `cp` — jamais
  `git checkout --`.

## 8. Ce que le lot a trouvé au passage

**DEUX AFFIRMATIONS DE `D-240` ÉTAIENT FAUSSES — les miennes, relevées en
contre-lecture et vérifiées sur pièce. Corrigées à leur place dans D-240, pas
seulement signalées dans D-241.**

1. **Le coût d'une famille déclarée n'est pas un écran patient qui s'éteint.**
   `assertProtocolDraftPlateStructure` ne confronte jamais la référence au
   catalogue — délibérément, et c'est `D-240` elle-même qui l'a voulu. La
   lecture est immunisée ; ce qui casse est l'**écriture**, donc toute révision
   resoumettant la référence. La conséquence réelle : **un protocole qu'on ne
   peut plus réviser**. Plus étroit, pas moins sérieux, et non chiffré (aucune
   lecture de production dans ce lot).
2. **Ce n'est pas `resolvePatientFoodCompassView` qui exige V2.** Elle ne teste
   aucune version. Le refus vit dans `buildPatientFoodCompassView`
   (`contextual.ts:160`), et son `TypeError` est **avalé** par le
   `catch { return null; }` de `patientReference.ts` : un protocole hors V2 rend
   une Boussole **absente en silence**, pas une erreur.

**L'exclusivité V2/V4 est UNILATÉRALE** : V2 exige au moins une référence C5,
V4 n'exige aucune assiette. Utile pour LOT-04.

## 8 bis. UNE TABLE SIGNÉE NEUVE DOIT SE DÉCLARER, ET SEUL T2 LE VOIT

`verrousSignatureDocumentes.guard.test.ts` ([[D-064]]) compare le tableau
`ETAT_VERROUS_SIGNATURE` de `docs/FEATURE_FLAGS.md` aux métadonnées RÉELLEMENT
portées par le code, sous `lib/clinical/` et `lib/biology-library/`. Il balaie
les répertoires : une table signée neuve non déclarée le fait rougir sur trois
cas — couverture exacte, `validationExterne`, `dateValidation`.

**T1 NE POUVAIT PAS L'ATTRAPER** : il ne joue que les fichiers liés au diff, et
ce garde ne cite aucun des miens — il les DÉCOUVRE en balayant. C'est T2 qui l'a
rendu, et c'est exactement ce que la table des paliers annonce : « T1 ne joue pas
de suite complète ; la première passe entière est T2 ». Ligne ajoutée :
`| clinical/replisAssietteV1.ts | false | null |`.

Le document qu'on lit avant de poser un drapeau dit donc l'état réel, y compris
pour une table qui n'atteste rien.

## 8 ter. La revue — trois constats, trois retenus, et c'est le même oubli

**`indication` ÉTAIT OBLIGATOIRE DANS LA LIGNE ET TOMBAIT PARTOUT EN AVAL.**
`decidePlateSubstitution` cherchait sur le seul couple `depuis`/`vers` — deux
lignes de même direction et d'indications différentes rendaient `.find()`
arbitraire ; la projection de la route la supprimait, rendant ces mêmes lignes
indiscernables pour le client. **C'est la classe de défaut que ce lot ferme,
reproduite d'un cran plus loin** : corrigée sur la direction, rejouée sur la
condition. `indication` descend dans le type PARTAGÉ, la décision l'exige à
l'appel, et la projection la transporte.

**ET UNE GARDE QUE LES DEUX TABLES SŒURS PORTAIENT.** Le verrou n'exigeait de
`dateValidation` que `!== null` ; `indicationsAssiettesV1` et `tableRepliV1`
vérifient l'ISO canonique. Une date illisible sous un bon sha ouvrait la table.
Posée à l'identique, et elle FERME au lieu de jeter.

**Trois mutations de plus, trois rouges** : condition ignorée dans la recherche,
condition absente de la décision rendue, date non vérifiée.

## 8 quater. Le second tour de revue — deux constats, deux retenus

**UN CONTOURNEMENT QUE J'AVAIS CRÉÉ POUR ÉVITER UN CYCLE.**
`decidePlateSubstitution` recevait les replis en paramètre, faute de pouvoir
importer la table depuis `plates.ts`. Un appelant pouvait donc passer la table
NUE, un brouillon, ou un tableau fabriqué — **le point de service unique se
contournait**, ce que `D-225` interdit. La décision a déménagé CHEZ la table,
où elle appelle `replisServables()` par défaut. Ses cas de banc l'ont suivie.

**UN CHEMIN DÉCRIT SANS ÊTRE ÉPROUVÉ.** La projection vivait dans la route, où
aucun banc ne l'atteignait — protocole de fixture sans assiette, table réelle
vide. Extraite en `replisPourProtocole`, elle porte cinq cas.

**ET UNE MUTATION RESTÉE VERTE, à retenir** : remplacer `replisServables()` par
la table nue dans le défaut ne rougit AUCUN cas de comportement, la table étant
vide. Une garde de SOURCE tient la forme, et dit pourquoi elle n'est pas un banc
de comportement. Sans cette vérification par mutation, j'aurais annoncé une
couverture que je n'avais pas.

## 8 quinquies. Troisième passe — le relecteur a persisté, et il avait raison

Le déménagement laissait un paramètre optionnel `replis`, réservé aux bancs
**par commentaire**. Un commentaire n'est pas une garde. La fonction reçoit
désormais la TABLE et sa SIGNATURE, qu'elle remet elle-même au verrou : tout ce
qu'on lui donne est filtré, et les bancs éprouvent la décision comme la
production la vit. Deux mutations le tiennent.

Le câblage de la route a reçu son cas : un espion vérifie qu'elle passe les
ACTIONS du protocole actif et rend le résultat, condition comprise. La
projection, elle, reste éprouvée chez elle.

**TROIS PASSES SUR LE MÊME POINT, et c'est la leçon à garder** : j'ai fermé le
contournement en deux temps parce que la première correction déplaçait le
problème au lieu de le supprimer. Un paramètre « réservé aux bancs » est un
paramètre public.

## 8 sexies. Quatrième passe — la leçon n'est plus le défaut, c'est ma correction

`replisDepuis` et `replisPourProtocole` offraient INTACT le contournement que je
venais de fermer sur `decidePlateSubstitution`. **Corriger une instance sans
balayer ses voisines laisse la classe vivante**, et je l'ai refait trois fois
dans ce seul lot.

`replisDepuis` n'est plus exportée ; `replisPourProtocole` reçoit la table et sa
signature. Et **une garde balaie le module** : aucune fonction exportée
n'accepte une liste déjà filtrée. Réexporter la fonction interne la fait rougir.

**À retenir pour la prochaine correction de ce type** : chercher les SŒURS de la
fonction corrigée avant de conclure, et préférer une garde qui balaie à une
garde qui nomme. Un défaut trouvé une fois dans un module y existe souvent
plusieurs fois.

## 8 septies. Cinquième passe — retenu sur le fait, la forme inchangée, le motif écrit

Le constat vise cette fois les paramètres qui ont REMPLACÉ la liste filtrée :
`signature`, `lignes`, `lignesIndication`. **Il est exact.** Le verrou vérifie la
COHÉRENCE de ce qu'on lui donne, jamais sa PROVENANCE — une métadonnée fabriquée
dont on a recalculé le sha lui passe.

**Et pourtant la forme ne change pas.** Vérifié sur pièce : les quatre tables
signées qui précèdent (`indicationsAssiettesV1`, `catalogueConduitesV1`,
`baremeChargeV1`, `tableRepliV1`) exposent toutes `(signature = METADATA,
lignes = TABLE)`. Dévier celle-ci seule ne ferme rien et casse l'uniformité ;
les aligner toutes est un refactoring de la famille des tables signées, hors
portée. Surtout, **aucune signature de fonction ne peut tenir une provenance
ici** : il n'y a pas de secret, le `shaPerimetre` est un littéral lisible — qui
sait fabriquer une signature sait éditer la métadonnée. La provenance est tenue
par le littéral committé, son enrôlement à `shaPerimetreLitteral.guard.test.ts`
le jour de la PREMIÈRE signature, et la relecture qui l'y fait entrer.

**Ce que le code peut tenir est posé** : une garde balaie les fichiers de
PRODUCTION — aucun n'appelle `replisPourProtocole` avec plus d'un argument ni
`decidePlateSubstitution` en nommant une clé d'injection. Trois mutations, dont
un témoin d'anti-vacuité : supprimer le seul appel de production fait rougir la
garde au lieu de la rendre silencieuse.

**À retenir** : un constat de revue peut être VRAI et ne pas appeler le
changement qu'il propose. Ce qui n'est alors pas négociable, c'est d'écrire le
motif à l'endroit où le prochain lecteur le cherchera — ici dans le verrou
lui-même — et de fermer par une garde la part que le code PEUT tenir.

## 8 octies. Sixième passe — le meilleur constat n'était pas dans un commentaire

Il tenait dans la **phrase d'entête** de la relecture : « la validation doit
refuser les doublons de clé `(depuis, vers, indication)` ». Aucun fil ne le
portait — ni `pulls/<N>/comments`, ni « Suppressed comments ». Il était juste.

Le verrou refusait l'identifiant en double, jamais le **recouvrement**. Deux
lignes partageant les trois termes ne se distinguent plus que par leur degré :
le `.find()` de la décision en retient une arbitrairement. **C'est le constat de
la première passe, revenu un cran plus loin** — je l'avais fermé en ajoutant
l'indication à la clé de RECHERCHE, ce qui le rouvre dès que deux lignes
partagent aussi l'indication. Le verrou refuse désormais le recouvrement, même
signé, comme `baremeChargeV1` et `tableRepliV1` ; la clé est le TRIPLET.

**À retenir** : lire la phrase d'entête de la revue, pas seulement ses fils. Et
quand un défaut a déjà été corrigé une fois, se demander ce qui le ferait
revenir — ici, l'égalité sur le terme même qu'on venait d'ajouter.

## 8 nonies. Septième passe — conduite ici, et elle retrouve la même classe

Le relecteur n'a pas repris la main sur la tête suivante. La contre-revue a donc
été conduite en interne : quatre angles indépendants, chaque constat soumis à
deux sceptiques chargés de le RÉFUTER. **Vingt et un constats, sept retenus,
quatorze écartés.**

**Le premier est le mien, prouvé par mutation exécutée.** La garde d'appelants
ÉNUMÉRAIT deux noms alors que le module en exporte quatre qui acceptent une
signature. Un fichier de production appelant `replisServables(signature, table)`
laissait le banc **vert** — et ma docstring affirmait déjà la propriété entière.
La liste se **dérive** désormais du texte du module, avec un témoin qui atteste
la dérivation sans en tenir lieu.

**Trois autres défauts de la même garde** : l'étalement `{ ...objet }` portait
les clés sans les écrire ; commentaires et chaînes étaient lus comme du code ; et
l'énumération « ce que le verrou atteste » n'avait pas suivi le second commit.

**À retenir, et c'est la leçon du lot entier** : j'ai corrigé SEPT FOIS des
instances de la même classe. Le signal qui aurait dû m'arrêter dès la troisième
est une garde qui **énumère des noms**. Une garde qui nomme est une instance
déguisée en classe.

## 9. Problèmes ouverts

**LE QUATRIÈME POINT DU PROGRAMME, ET IL EST ENTIÈREMENT CLINIQUE.** Affirmer
que telle assiette est un repli acceptable de telle autre, pour une indication
nommée, en écrivant ce que la ligne ajoute au-delà des claims. **Aucun claim ne
fonde une substitution** — le corpus décrit l'inclusion (la sérotoninergique
associe l'anti-inflammatoire), l'association et la parenté de modèle, et les
trois sont l'inverse logique de l'échange. Le mécanisme sait désormais porter
cette affirmation sans la déformer ; il ne peut pas la produire. `DC-19`,
`DC-20`.

**Ce que remplir la table coûtera, et il faut le savoir AVANT** : une ligne
rend la table signable, mais toute révision d'un protocole portant l'assiette
source continue de re-dériver sa référence — la famille, elle, ne touche plus
au `contentHash` depuis ce lot. **Le prix nommé par `D-240` §10 est donc levé**,
et c'est l'effet principal du choix de sortir la relation du catalogue.

**RELEVÉ PAR LA CONTRE-REVUE, ÉCARTÉ PAR SES SCEPTIQUES, ET LAISSÉ OUVERT ICI
PLUTÔT QUE TRANCHÉ SEUL** : `anomaliesDeLaLigneRepli` vérifie que l'indication
d'un repli EXISTE au dépôt, jamais qu'elle est **publiée**. Un repli conditionné
par une ligne d'indication en brouillon passerait donc le verrou — pour une
condition que rien ne sert. Aucune ligne de repli n'existant, le point est
entièrement prospectif ; il n'a pas été fermé ici parce qu'exiger le statut
publié change ce que le verrou ACCEPTE, ce qui relève du lot qui écrira la
première ligne, avec le praticien. **À regarder ce jour-là, pas après.**

**Hérité, non traité** : `alternatives` n'est rendu par aucun composant — la
table n'entrera à la matrice qu'avec l'écran ; la sélection Boussole du cockpit
porte le même défaut d'asynchronie que `D-240` a corrigé sur l'assiette (nommé
là-bas, hors périmètre) ; `catalogueConduitesV1` n'a toujours aucun consommateur.

## 10. Prochaine action exacte

T2 (`npm run test:worktree -- --fast`) depuis la racine, sortie redirigée puis
relue ; PR `--base main` avec `--body-file` ;
`node scripts/wn-attendre-ci.mjs <N>` **depuis la racine** en un seul appel
bloquant — lancé depuis `web/`, il échoue en `MODULE_NOT_FOUND` et rend `1`, ce
qui n'est pas un verdict ; **lire la revue aux TROIS emplacements** ; puis
`gh pr merge --squash --subject` avec le sujet qui nomme D-241.

**Le numéro D-241 se prend au MERGE.**

## 11. Interdits encore actifs

- **Aucune famille de substitution déclarée** — c'est le sujet même du lot.
- Aucune signature clinique posée par l'outil.
- Aucune composition d'assiette inventée ; aucun contenu clinique du corpus au
  dépôt — une ligne DÉSIGNE, elle ne recopie pas.
- Aucun `contentHash`, aucun `refHash`, aucun `C5B_PLATE_CATALOG_HASH` touché.
