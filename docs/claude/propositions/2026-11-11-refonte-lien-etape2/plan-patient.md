# Refonte Lien / Empreinte — plan de réalisation, portail patient

Plan de progression du Jardin (`/portail`), mené par **une session**, en
parallèle de la session du portail praticien (`plan-praticien.md`). Les deux
plans n'ont aucun fichier en commun après le socle (`socle-commun.md`).

**Suivi** : artefact « Refonte Lien — patient » (lien au `README.md` §6).
Chaque lot y passe par : à faire → en cours → prête @<sha> → mergé.

**Références** : cadrage révisé, catalogue révisé (§3.2, colonne « Lot »),
registre des textes (§2), amendements AM-1, AM-2, AM-6 ; artefact
« Wellneuro Lien — Empreinte », version 4.

## 1. Préalables

| Préalable | Lots concernés |
|---|---|
| DOC-0 mergé, avec AM-1 et AM-2 acceptés | PAT-1 |
| COM-0 mergé | tous |
| Textes acceptés et inscrits (DOC-0 ou DOC-n) : T-21 à T-23, T-32 | PAT-1 |
| Texte accepté et inscrit (DOC-0 ou DOC-n) : T-31 | PAT-2 (sinon PAT-2 livre sans lui) |
| Textes acceptés et inscrits (DOC-0 ou DOC-n) : T-30 (les neuf lignes ensemble) | PAT-3 (idem) |
| Q-E2-5 tranchée (« Réessayer » sur un suivi non reconnu) | PAT-3 (sinon l'existant reste) |
| Texte accepté et inscrit : T-33 ([[D-488]]) ; T-34 refusé | PAT-5 |
| Prototype de la famille validé à l'étape 3 (si Q-E2-4 (a)) | PAT-2 à PAT-6 |
| Décor inscrit (DOC-2, [[D-481]] §1 bis) et primitive `LienDecor` mergée (COM-1) | tout lot qui pose un décor, ornement d'état vide compris : PAT-2, PAT-3b, PAT-5, et tout autre lot qui orne un état vide réel ; sans eux, le lot livre sans décor (PAT-3b attend) |
| Prototype PAT-3 révisé avec la signature du hub, revalidé ([[D-481]] §4) | PAT-3b |

Sans AM-1, le rail patient reste toujours déplié ([[D-460]] §4) et PAT-1 se
réduit à l'habillage ; sans AM-2, les onglets et « Autres espaces » restent
dès 1 024 px.

## 2. Fichiers

**Propriété du plan** (sous `web/src/`) :

- `app/portail/**` ;
- `components/patient/**`, `components/patient-companion/**` ;
- `components/ui/CerclesConcentriques.tsx` ;
- dans deux dossiers partagés, les seuls fichiers patient :
  `components/food-observation/PatientFoodObservationPanel.tsx`,
  `components/physio-traitements/DeclarationsPatient.tsx` et
  `LienFicheRenseignements.tsx` ;
- `lib/portail/**` (textes et activation, jamais les sondes ni les gardes) ;
- `app/api/portail/**` : textes d'erreur seulement (T-30i) ;
- `lib/patient/cycleDeVie.ts` : la seule constante
  `MESSAGE_DOSSIER_CLOS_PATIENT_CHECKIN` (T-30h) ;
- `web/e2e/` : les specs portail seulement.

**Interdits** : tout fichier du socle (gelé), `app/dashboard/**`,
`components/NavBar.tsx`, les autres fichiers de `components/ui/`, et tout
dossier listé au plan praticien. Jamais `lib/portail/stockageAppareil.ts`
pour y écrire un état de rail (Q56). Aucune question, option, cotation,
condition d'apparition ni règle d'enregistrement de questionnaire.

## 3. Lots

| Lot | Objet | Fiches | Dépend de | Taille |
|---|---|---|---|---|
| PAT-1 | Shell et navigation | X02 (patient), U42, U10 pour « Autres espaces » | socle, §1 | moyenne |
| PAT-2 | Entrée dans le parcours | U01–U09 | PAT-1 | moyenne |
| PAT-3 | Mon parcours, accompagnement, suivi | U10, U18–U21, U41 | PAT-1 | grande |
| PAT-3b | Signature graphique du hub | U10 (en-tête) | PAT-3, COM-1, prototype revalidé | petite |
| PAT-4 | Questionnaires et agendas | U11–U14, U16, U17, U22 | PAT-1 | grande |
| PAT-5 | Lectures et espaces reçus | U15, U23–U32, U37, U38 | PAT-1 | grande |
| PAT-6 | Transmissions et droits | U33–U36, U39, U40 | PAT-1 | moyenne |
| PAT-7 | Vérification et stabilisation | toutes | PAT-1 à PAT-6, PAT-3b | moyenne |

Ordre recommandé après PAT-1 : PAT-3 (le hub et le suivi sont les écrans les
plus vus), PAT-2, PAT-4, PAT-5, PAT-6.

### PAT-1 — Shell et navigation

- Rail « Mon espace » en trois états : déplié, réduit (13 rem, libellés
  gardés, passés à la ligne, jamais tronqués), escamoté ; état tenu par le
  layout, perdu au rechargement, rien écrit sur l'appareil ; au chargement,
  déplié (AM-1).
- Commandes en pied de rail (T-21 à T-23) ; rail escamoté, le bouton « Menu »
  de l'en-tête reparaît et rouvre le rail déplié ; focus rendu à ce bouton.
- Dès 1 024 px : plus de `VuesRapidesPortail` (`app/portail/layout.tsx:111`),
  plus d'onglets ; sur le hub, « Autres espaces » non rendu quand le rail est
  servi, la frise reste (AM-2).
- Fond sauge du rail (jeton du socle), toujours clair ; T-32.
- **Réception** : une seule navigation « Mon espace » visible et un seul
  déclencheur à chaque largeur ([[D-444]] §2) ; rail escamoté absent du
  clavier et de l'arbre d'accessibilité ; cibles de 44 px et libellés
  entiers en confort 112,5 % et à 200 % ; aucune navigation sur un dossier
  mineur refusé, ni pendant un questionnaire ; sondes toujours fermées par
  défaut ; aucun badge ni chiffre ; constat à l'écran des trois états et du
  passage sous 1 024 px. Cadrage v3 l.528.

### PAT-2 — Entrée dans le parcours

Connexion, lien indisponible, avant de commencer, date de naissance,
circuit mineur (aucune navigation adulte, [[D-283]] §5), consentements,
fiche de renseignements, « Parler de votre situation » (T-31), fin d'entrée.
Aucun rail ni menu avant le franchissement ([[D-447]] §1). Les textes de
consentement et de droits ne changent pas. Décor par `LienDecor`
([[D-481]] §1 bis) : fond léger périphérique `backgrounds/screen-desktop.svg`
ou `screen-mobile.svg` selon la largeur, sur les neuf écrans ; carte opaque,
jamais derrière un champ, absent à l'impression. Les anneaux d'alliance ne
sont pas retenus (Q4 (a), 2026-11-12). **Réception** : parcours d'entrée
complet avec un patient fictif, mineur compris ; aucune question modifiée.

**Arbitrages PAT-2 du 2026-11-12** : `Q1a — Q2a — Q3b — Q4a`,
inscrits par DOC-3 dans [[D-481]] et [[D-333]] ; détails et suite du suivi :
[`pat2-arbitrages.md`](pat2-arbitrages.md). Les repères d'étapes et sections
d'entrée sont gardés ; U02 conserve sa destination et son libellé actuels.
T-35 « Revenir à la connexion » reste proposé, non accepté. La date de
version en lettres relève de PAT-6. Q5, Q6 et Q7 restent ouvertes,
à soumettre séparément ; aucune validation de ces trois points n'est
déduite de l'inscription des quatre choix.

**Q5–Q7 du 2026-11-12** : `Q5a — Q6b — Q7a`, inscrits par DOC-4 dans
[[D-481]] ; détails : [`pat2-arbitrages.md`](pat2-arbitrages.md). Le lot
PAT-2 reçoit, une fois T-36 à T-39 acceptés mot pour mot puis inscrits :
le lien « Me reconnecter » sous « Session expirée. Reconnectez-vous. », dans
le même onglet ; le correctif du brouillon de l'entrée (mention de
conservation après une écriture réussie seulement, heure de la dernière
écriture réussie, formulations « dans cet onglet ») ; le message de
sécurité gardé sous la liste des signaux ([[D-277]] §1). **Réception
complémentaire** : retour au bon dossier et restauration du brouillon après
reconnexion par Google dans le même onglet ; aucune confirmation ni heure
antérieure après une écriture échouée ; questionnaires inchangés (« sur cet
appareil ») ; message de sécurité visible sur téléphone réel, au zoom 200 %
et en confort 112,5 %.

### PAT-3 — Mon parcours, accompagnement, suivi

Hub (frise, « Mon accompagnement »), Jour difficile, point de suivi (T-30,
Q-E2-5), protocole imprimable (sans rail à l'impression), invitation à une
réévaluation. Les états livrés (#1973, #1978, #1979) sont gardés tels quels.
**Réception** : les quatre lignes de suivi du cadrage v3 (l.546-548) :
protocole lisible quand le suivi échoue, erreur explicite à la première
lecture, saisie conservée sur échec de transmission, aucune confirmation
sans succès réel ; session expirée renvoyée à l'entrée ; aucun chiffre.

### PAT-3b — Signature graphique du hub

Lot distinct, après le merge de PAT-3 (#2008) et de COM-1 : en tête du hub
« Mon parcours », un en-tête compact avec un ornement léger, par
`LienDecor` ; jamais une grande illustration qui repousse l'action
principale ([[D-481]] §1 bis). Le prototype PAT-3 est révisé puis revalidé
avant le lot ([[D-481]] §4). **Réception** : la première action reste
visible sans défilement au téléphone ; l'ornement est absent de
l'accessibilité et de l'impression ; aucun texte neuf.

### PAT-4 — Questionnaires et agendas

Saisie par parties, plaintes, vérifier puis transmettre, réponses
transmises, agendas du sommeil et alimentaire, observation alimentaire.
Habillage seulement : `QuestionField` garde sa garde de saisie, les
questions et les règles restent celles du catalogue actif. Pendant un
questionnaire : ni rail, ni barre, ni onglets ; le bouton « Menu » selon les
gardes. **Réception** : brouillons conservés ; reprise après coupure ;
encart d'urgence et messages de sécurité intacts, mot pour mot.

### PAT-5 — Lectures et espaces reçus

Mon équilibre (sans score, `showValue={false}`), Ce qui compte pour moi,
compréhension (T-33), dossier à deux voix, bilan, bibliothèque, fiches
remises, courriers et document pour le médecin, informations, conditions
(retour « ← Mon espace » gardé, T-34 refusé, [[D-488]] §6). Lecteur et impression sans rail (X06). Le dossier à deux voix reçoit le séparateur
`divider-two-voices` ; les intitulés des deux voix restent en texte et à
l'impression ([[D-481]] §1 bis). **Réception** : « Bibliothèque »
et « Fiches » gardent leurs périmètres, jamais fusionnés (cadrage v3 l.399) ;
lecture, téléchargement et remise restent des gestes distincts.

### PAT-6 — Transmissions et droits

Dépôt de documents, comptes rendus biologiques, renseignements et
déclarations, échanges, choix et droits, signaler un problème. **Réception** :
confirmation de transmission sans promesse de délai ; échec qui garde la
saisie ; textes de droits inchangés.

Q3 (b) de PAT-2 (2026-11-12, [[D-481]], complément DOC-3) : le composant
partagé `components/patient/trust/DocumentTrust.tsx` affiche la date de
version en lettres à la place de AAAA-MM-JJ. Conditions v5 et consentement
v3 gardent chacun leur version et leur date ; leur mise en forme reste
indépendante. Aucune date canonique ni aucun texte de document ne change ;
PAT-2 ne réalise pas cette modification.

### PAT-7 — Vérification et stabilisation

Les vérifications du cadrage v3 l.540-553 côté patient : quatre largeurs,
zoom 200 % et confort 112,5 %, clavier et lecteur d'écran, mouvement réduit
(système et patient), états dégradés, Chromium et WebKit (non vus à
l'étape 1). Relecture `ui-ux-pro-max`. Comparaison aux prototypes. Les
écarts restants deviennent des lots nommés.

## 4. Coordination avec le plan praticien

- Aucune dépendance entre PAT-n et PRA-n.
- Un besoin commun passe par un `COM-n` (`socle-commun.md`), annoncé dans
  les deux artefacts.
- Merge : un « prête » à la fois par session ; rebase sur `origin/main`
  avant chaque lot.
