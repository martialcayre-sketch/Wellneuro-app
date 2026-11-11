# Refonte Lien / Empreinte — plan de réalisation, portail praticien

Plan de progression de l'Observatoire (`/dashboard`), mené par **une
session**, en parallèle de la session du portail patient
(`plan-patient.md`). Les deux plans n'ont aucun fichier en commun après le
socle (`socle-commun.md`).

**Suivi** : artefact « Refonte Lien — praticien » (lien au `README.md` §6).
Chaque lot y passe par : à faire → en cours → prête @<sha> → mergé.

**Références** : cadrage révisé, catalogue révisé (§3.1, colonne « Lot »),
registre des textes (§1), amendements AM-3, AM-4, AM-5, AM-6 ; artefact
« Wellneuro Lien — Empreinte », version 4.

## 1. Préalables

| Préalable | Lots concernés |
|---|---|
| DOC-0 mergé, avec AM-3, AM-4, AM-5 acceptés ; AM-7 si Q-E2-1 (a), AM-8 si Q-E2-2 (b) | tous |
| COM-0 mergé | tous |
| Q-E2-1 (groupes) et Q-E2-2 (menu du téléphone) tranchées | PRA-1 |
| Textes acceptés et inscrits (DOC-0 ou DOC-n) : T-01 à T-05, T-07, T-10, T-12, T-13 | PRA-1 |
| Textes acceptés et inscrits (DOC-0 ou DOC-n) : T-14, T-15 | PRA-3 |
| Prototype de la famille validé à l'étape 3 (si Q-E2-4 (a)) | PRA-2 à PRA-5 |

Un amendement refusé retire ce qui en dépend : sans AM-3, les vues rapides
restent ; sans AM-4, pas de déclaration unique (PRA-1 se réduit aux trois
états) ; sans AM-5, pas d'escamotage praticien.

## 2. Fichiers

**Propriété du plan** (sous `web/src/`) :

- `app/dashboard/**`, `app/login/**`, `app/api/praticien/**` (textes
  seulement, si un texte accepté l'exige) ;
- `components/NavBar.tsx` ; dans `components/ui/` : `SidebarRail`,
  `MobileBottomNav`, `VuesRapides`, `ModeConsultation`, `Button`, `Input`,
  `Select`, `Chip`, `Pagination`, `MenuActions`, `PatientRow`, `MetricCard`,
  `TwoLevelReading`, `ScoreRadar`, `ScoreZones`, `SpiraleEpisodes`,
  `SpiraleTrajectoire`, `BanniereDiffere`, les trois dialogues de
  confirmation, et leurs tests ;
- `components/FichePatientPanel.tsx`, `components/patient-cockpit/**`,
  `components/fil/**`, `components/dossier/**`, `components/copilote/**`,
  `components/agenda/**`, `components/cabinet/**`, `components/bibliotheque/**`,
  `components/biologie/**`, `components/complements/**`,
  `components/corpus/**`, `components/regles/**`,
  `components/positions-expert/**`, `components/trajectoires/**`,
  `components/fiches-usage/**`, `components/fiches-assiette/**`,
  `components/agenda-sommeil/**`, `components/agenda-alimentaire/**` (ceux
  de la racine ; ceux du patient sont sous `components/patient/`),
  `components/correspondance/**`, `components/meteo/**`,
  `components/besoins/**`, `components/decisions-parcours/**`, les panneaux
  praticien de la racine de `components/` (`BibliothequePanel`,
  `SynthesePanel`, `TrustPanel`, `EnvoiConditionsPanel`…) ;
- dans deux dossiers partagés, les seuls fichiers praticien :
  `components/food-observation/PractitionerFoodObservationPanel.tsx`,
  `components/physio-traitements/PhysioTraitementsPanel.tsx` ;
- neuf : `lib/navigation/destinationsPraticien.ts` (AM-4) et son banc ;
- `web/e2e/` : les specs praticien seulement.

**Interdits** : tout fichier du socle (gelé), `components/patient/**`,
`components/patient-companion/**`, les autres fichiers de
`components/physio-traitements/` et de `components/food-observation/`,
`app/portail/**`, `lib/portail/**`, `components/ui/CerclesConcentriques.tsx`. Un dossier « praticien » peut
contenir un fichier que le portail patient importe : vérifier avant d'y
toucher (`socle-commun.md`, dernière règle).

## 3. Lots

| Lot | Objet | Fiches | Dépend de | Taille |
|---|---|---|---|---|
| PRA-1 | Shell et navigation | X02 (praticien), P01, P02, P35 pour l'activation | socle, §1 | moyenne |
| PRA-2 | Écrans de travail transverses | P01–P03, P33, P35, P36, P53–P57, X01 | PRA-1 | grande |
| PRA-3 | Fiche-trajectoire | P04–P32, P58–P60 | PRA-1 | très grande, en 3a puis 3b |
| PRA-4 | Bibliothèque et ateliers | P37–P50 | PRA-1 | grande |
| PRA-5 | Copilote, synthèses, documents, impression | P34, P51, P52, X06 | PRA-3a | moyenne |
| PRA-6 | Vérification et stabilisation | toutes | PRA-1 à PRA-5 | moyenne |

PRA-2, PRA-3 et PRA-4 ne dépendent que de PRA-1 : l'ordre recommandé est
PRA-3a d'abord (c'est le cœur du travail praticien), puis PRA-2, PRA-4,
PRA-3b, PRA-5.

### PRA-1 — Shell et navigation

- Une déclaration des destinations (libellé, route, groupe, icône,
  `prefixesActifs`) ; le rail, le tiroir de 768 à 1 023 px, la barre basse
  et la feuille « Plus » en dérivent (AM-4).
- Groupes selon Q-E2-1 (T-01 à T-04) ; la feuille « Plus » reçoit les
  intertitres ; forme du téléphone selon Q-E2-2.
- Rail en trois états : déplié, réduit en icônes, escamoté ; `wn-rail-expanded`
  inchangée, l'escamotage mémorisé par rôle sans donnée patient ; « Masquer
  la navigation » en pied de rail, « Afficher la navigation » dans l'en-tête
  (T-12, T-13) ; libellé au toucher, Échap le masque (AM-5).
- `VuesRapides` retirées, montage compris (`NavBar.tsx:70`) (AM-3).
- Nom accessible du rail (T-10) ; libellés T-05, T-07.
- **Réception** : bancs par couche — destinations servies, ordre, entrée
  active sur chaque route (une fiche allume « Fiche-trajectoire » ou
  « Fiches »), absence de Documents, Règles, Positions d'expert ; rail
  escamoté absent du clavier et de l'arbre d'accessibilité, focus rendu à
  « Afficher la navigation » ; réouverture atteignable à 200 % ; parité des
  destinations entre bureau, tablette et téléphone ; mode consultation
  intact. Cadrage v3 l.528.

### PRA-2 — Écrans de travail transverses

Le Fil du jour, Patients et la création de dossier, Agenda, liste des
fiches-trajectoires, Comptes du cabinet, Correspondance, Confiance & droits
(effet indésirable jamais sous un accordéon), Paramètres, connexion.
Habillage Lien par les jetons du socle ; aucune palette codée en dur ;
icônes Lucide à 1,75 px. Lien d'évitement « Aller au contenu » sur chaque
page du portail (T-35, amendement DOC-1 de [[D-488]]). **Réception** : une
action principale lisible par zone ; le lien d'évitement est le premier arrêt
de tabulation et vise `<main id="contenu">` ; états de lecture explicites
(X03), jamais un échec maquillé en liste vide ; ouverture depuis une carte du Fil sur le bon contenu (cadrage v3
l.551).

### PRA-3 — Fiche-trajectoire

- **3a, structure** : en-tête de fiche libéré des vues rapides, qui porte
  l'identité du dossier telle que la fiche l'affiche et ses actions utiles
  (AM-3) ; rail des sept phases repliable (T-14) ; panneau de contexte
  escamotable (T-15) ; information critique toujours visible dans la zone
  de travail quand le contexte est fermé ; replier ne démonte aucun
  brouillon.
- **3b, contenus** : les panneaux des phases, une PR par groupe de phases
  (Patient ; Données et Compréhension ; Décision ; Actions et protocole ;
  Suivi et réévaluation ; Biologie ; Correspondance et documents ;
  agendas et journal).
- **Réception** : passage d'un dossier à un autre sans contenu précédent ;
  aucun focus perdu dans une zone fermée ; aperçu de diffusion qui ne
  diffuse rien ; approbations conservées ; P15 garde son brouillon quand le
  rail des phases se replie. Cadrage v3 l.534, l.549-552.

### PRA-4 — Bibliothèque et ateliers

Rayons questionnaires, analyses biologiques, compléments, fiches conseils,
connaissances ; atelier corpus ; règles et positions d'expert sans entrée
tant que leur garde est fermée. Signature NABM sans « tout valider ».
Titre de « Fiches conseils » ramené au niveau des autres rayons (h2).
**Réception** : groupes et entrées conformes à PRA-1 ; aucun geste de lot
implicite.

### PRA-5 — Copilote, synthèses, documents, impression

Consultation copilote et son panneau contextuel escamotable ; synthèses
(raccourci du téléphone gardé, [[D-324]] §5) ; documents sans entrée de
menu ; impression sans rail ni menu (X06). **Réception** : partage d'écran
protégé en mode consultation ; aucun score ni export ajouté pour remplir
une colonne libérée (cadrage v3 l.295).

### PRA-6 — Vérification et stabilisation

Les douze vérifications du cadrage v3 l.540-553 côté praticien : quatre
largeurs, zoom 200 %, clavier et lecteur d'écran, mouvement réduit, états
dégradés, Chromium et WebKit. Relecture `ui-ux-pro-max` de l'ensemble.
Comparaison aux prototypes de l'étape 3. Les écarts restants deviennent des
lots nommés, pas des corrections silencieuses.

## 4. Coordination avec le plan patient

- Aucune dépendance entre PRA-n et PAT-n. Les deux sessions avancent à leur
  rythme.
- Un besoin commun (jeton, primitive) passe par un `COM-n`
  (`socle-commun.md`), annoncé dans les deux artefacts.
- Merge : un « prête » à la fois par session ; l'intégrateur merge dans
  l'ordre d'arrivée ; la session rebase son lot suivant sur `origin/main`
  après chaque merge, le sien ou celui de l'autre plan.
