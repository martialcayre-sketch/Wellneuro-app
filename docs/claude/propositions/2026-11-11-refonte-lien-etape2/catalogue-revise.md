# Refonte Lien / Empreinte — étape 2 : catalogue des écrans révisé

Révision du catalogue `Catalogue_ecrans_Wellneuro_Lien_v2` (110 fiches :
60 praticien P01–P60, 42 patient U01–U42, 8 communes X01–X08 ; v2 l.1673),
selon les réponses du responsable du 2026-11-11 et les amendements proposés
(`amendements.md`). Le catalogue v2 n'est pas versé au dépôt ; ses fiches
sont citées par identifiant et par ligne. Ce qui n'est pas repris ici reste
celui de la v2 : intention, contenu, états, interdits.

Colonne « Lot » : le lot du plan de réalisation qui livrera la fiche
(`plan-praticien.md`, `plan-patient.md`). `COM-0` est la fondation commune
(jetons, polices, primitives), seul lot partagé.

## 1. Révisions transversales

| Endroit de la v2 | v2 | Révisé | Source |
|---|---|---|---|
| §2.1, l.39 (étages concurrents) | « vues rapides supprimées du contexte de fiche si elles doublonnent les onglets » | Vues rapides praticien **retirées à toute largeur** | réponse 4 (b), AM-3 |
| §5.2, l.164 (groupes praticien) | Travail, Bibliothèque, Ateliers, Cabinet ; seul Travail est détaillé | Composition proposée au §2 ; à trancher (Q-E2-1) | AM-4, Q-E2-1 |
| §5.2, l.166 (téléphone praticien) | « quelques raccourcis plus un menu complet par groupes » ; pas de longue feuille « Plus » | Trois raccourcis gardés ([[D-324]] §5) ; le menu complet par groupes remplace la feuille à plat ; forme à trancher (Q-E2-2) | Q-E2-2 |
| §5.2, l.166 (menu escamoté) | « commande "Ouvrir le menu" » | Commande de réouverture dans l'en-tête ; texte au registre (T-13) | AM-5, `registre-textes.md` |
| §5.3, l.170 (patient ≥ 1 024 px) | « RailMonEspace et VuesRapidesPortail autorisées » | **Rail seul** ; pas d'onglets ; « Autres espaces » non rendu sur le hub quand le rail est servi | réponse 3 (a), AM-2 |
| §5.3, l.172 (rail patient) | « peut se masquer et se rouvrir », « variante compacte garde des libellés » | Trois états : déplié, réduit avec libellés, escamoté ; mémoire de page, rien sur l'appareil ; escamoté, le bouton « Menu » le rouvre | réponse 2 (a), AM-1 |
| §5.3, l.172 (hub) | « Le hub conserve ses étapes et ses autres espaces » | Sous 1 024 px, inchangé ; dès 1 024 px avec rail, la frise reste et « Autres espaces » n'est pas rendu | AM-2 |
| §5.3, l.174 (questionnaire en cours) | « pas de rail, barre basse ou vues rapides » | Inchangé : ni rail, ni barre ; le bouton « Menu » selon les gardes | [[D-447]] §1 |
| §3.3, l.89 (panneaux) | « développé, rail réduit, masqué » | Inchangé ; s'applique au rail global praticien, aux phases et au contexte de fiche (AM-5) et au rail patient (AM-1) | AM-1, AM-5 |
| Libellés (l.42, l.997, l.1143) | « Mon point de suivi » ; « Parler de votre situation » | Au registre (T-30, T-31) ; aucun écran ne change avant acceptation mot pour mot | réponse 6 (a) |
| Déclaration des destinations | trois listes praticien | une déclaration par rôle (patient : déjà `entreesAutresEspaces.ts`) ; bancs par couche gardés | réponse 5 (a), AM-4 |
| États de U18 et U20 | « échec du protocole », « échec du suivi seulement », « erreur de lecture » | **Livrés** : #1973 (lectures indépendantes, erreur avec reprise), #1979 (groupe ouvert sur échec), #1978 (session expirée renvoyée au gate) | lot de fiabilité |

## 2. Groupes praticien proposés (Q-E2-1, option a)

Toutes les destinations et leurs gardes restent ; seule leur place change.

| Groupe | Entrées, dans l'ordre | Depuis ([[D-324]]) |
|---|---|---|
| Travail | Le Fil du jour, Patients, Fiche-trajectoire, Consultation copilote, Agenda & consultations, Correspondance, Confiance & droits | La Spirale, moins « Comptes du cabinet » |
| Bibliothèque | Questionnaires, Fiches conseils, Compléments alimentaires, Analyses biologiques, Connaissances | Bibliothèque, moins l'atelier |
| Ateliers | Atelier corpus ; Atelier des règles et Positions d'expert seulement quand leur garde s'ouvre (aujourd'hui sans lien) | Bibliothèque (« en fin de groupe », §4) |
| Cabinet | Comptes du cabinet, Paramètres | La Spirale ([[D-385]]) et Réglages |

« Confiance & droits » reste dans Travail : [[D-324]] §3 en fait du travail du
jour, pas un réglage. Les noms de groupes sont des textes neufs (T-01 à T-04).

## 3. Fiches

Navigation : « v2 » quand la fiche v2 vaut telle quelle ; sinon la cible
révisée. Les gabarits G1–G8 sont ceux de la v2 (l.149-158), inchangés.

### 3.1 Praticien

| Fiche | Titre (v2) | Route | Gab. | Navigation cible | Lot |
|---|---|---|---|---|---|
| P01 | Le Fil du jour | `/dashboard` | G1 | v2 ; entrée active « Le Fil du jour » dans le rail ; sans vues rapides | PRA-2 |
| P02 | Patients | `/dashboard/patients` | G2 | v2 ; « Patients » actif en correspondance exacte | PRA-2 |
| P03 | Création de dossier et de consultation | depuis Patients | G6/G8 | v2 | PRA-2 |
| P04 | Fiche-trajectoire : structure | `/dashboard/patients/[id]` | G3 | « Fiches » / « Fiche-trajectoire » actif à toute largeur (C4, livré) ; en-tête de fiche libéré des vues rapides ; rail des phases et contexte repliables chacun (AM-5) ; hiérarchie espace → dossier → vue → phase dessinée à l'étape 3 | PRA-3 |
| P05 | Fiche administrative | fiche → Patient | G3/G6 | v2 | PRA-3 |
| P06 | Renseignements et anamnèse | fiche → Patient | G7 | v2 ; « anamnèse » reste côté praticien (cadrage §4) | PRA-3 |
| P07 | Déclarations, traitements, compléments | fiche → Patient | G3/G6 | v2 | PRA-3 |
| P08 | Données et questionnaires reçus | fiche → Données | G3 | v2 | PRA-3 |
| P09 | Lecture et correction d'une passation | depuis Données | G7 | v2 | PRA-3 |
| P10 | Comparaison de passations | depuis Données | G7 | v2 | PRA-3 |
| P11 | Compréhension et objectif négocié | fiche → Compréhension | G3/G6 | v2 | PRA-3 |
| P12 | Choix des priorités | fiche → Décision | G3 | v2 | PRA-3 |
| P13 | Lecture clinique, confirmation de l'épisode | fiche → Décision | G3/G8 | v2 | PRA-3 |
| P14 | Signaux, orientation, adressage | fiche → Décision | G3/G7 | v2 | PRA-3 |
| P15 | Construction du protocole | fiche → Actions → Protocole | G6 | v2 ; replier le rail des phases ne démonte pas le brouillon | PRA-3 |
| P16 | Plans idéal, minimal, de secours | dans P15 | G6/G7 | v2 | PRA-3 |
| P17 | Versions du protocole | fiche → Actions → Historique | G7 | v2 | PRA-3 |
| P18 | Relecture et diffusion | fiche → Actions → Diffusion | G7/G8 | v2 | PRA-3 |
| P19 | Arbitrage biologique | fiche → Actions → Biologie | G3/G6 | v2 | PRA-3 |
| P20 | Suivi de l'accompagnement | fiche → Suivi | G3 | v2 | PRA-3 |
| P21 | Réévaluation de l'épisode | fiche → Réévaluation | G3/G7 | v2 | PRA-3 |
| P22 | Les 12 besoins | fiche → Les 12 besoins | G3/G7 | v2 | PRA-3 |
| P23 | Observation alimentaire praticien | fiche → Alimentation | G3/G6 | v2 | PRA-3 |
| P24 | Trajectoire et parole du patient | fiche → Trajectoire | G7 | v2 | PRA-3 |
| P25 | Biologie : vue d'ensemble | fiche → Biologie | G3 | v2 | PRA-3 |
| P26 | Proposition de bilan biologique | fiche → Biologie → Proposition | G6/G7 | v2 | PRA-3 |
| P27 | Import d'un compte rendu | fiche → Biologie → Import | G6 | v2 | PRA-3 |
| P28 | Résultats biologiques | fiche → Biologie → compte rendu | G7/G6 | v2 | PRA-3 |
| P29 | Constats et portes du parcours | fiche → Biologie → Constats | G7 | v2 | PRA-3 |
| P30 | Correspondance d'un dossier | fiche → Correspondance | G2/G6 | v2 | PRA-3 |
| P31 | Documents du dossier | depuis la fiche | G2/G7 | v2 | PRA-3 |
| P32 | Composition et export | depuis Documents ou la fiche | G6/G7 | v2 ; composition (`DocumentComposer`, page Documents) à PRA-5 avec P52, export en PDF de la fiche à PRA-3 (PRA-3b Q10 a, 2026-11-13) | PRA-3 (export) ; PRA-5 (composition) |
| P33 | Agenda et consultations | `/dashboard/agenda` | G2/G6 | v2 ; groupe Travail | PRA-2 |
| P34 | Consultation copilote | `/dashboard/copilote` | G3/G7 | v2 ; panneau contextuel escamotable (AM-5) | PRA-5 |
| P35 | Liste des fiches-trajectoires | `/dashboard/trajectoires` | G2 | v2 ; « Fiches » actif jusqu'au dossier (C4, livré) | PRA-2 |
| P36 | Comptes du cabinet | `/dashboard/cabinet` | G2 | groupe Cabinet (Q-E2-1) ; joignable au téléphone par le menu complet | PRA-2 |
| P37 | Bibliothèque des questionnaires | `/dashboard/bibliotheque/questionnaires` | G2 | v2 ; groupe Bibliothèque | PRA-4 |
| P38 | Assignation, packs, file d'envoi | dans P37 | G6/G2 | v2 | PRA-4 |
| P39 | Instruments du cabinet | dans P37 | G4 | v2 | PRA-4 |
| P40 | Rayon analyses biologiques | `/dashboard/bibliotheque/biologie` | G2 | v2 | PRA-4 |
| P41 | Fiche d'analyse | depuis P40 | G7 | v2 | PRA-4 |
| P42 | Signature NABM par lot | depuis P40 | G4 | v2 ; sans « tout valider » | PRA-4 |
| P43 | Fiches d'usage biologiques | depuis P40 | G2/G7 | v2 | PRA-4 |
| P44 | Compléments et fiche produit | `/dashboard/bibliotheque/complements` | G2/G7 | v2 | PRA-4 |
| P45 | Fiches conseils et relecture d'assiette | `/dashboard/bibliotheque/fiches-conseils` | G2/G7 | v2 | PRA-4 |
| P46 | Connaissances | `/dashboard/bibliotheque/connaissances` | G2/G7 | v2 | PRA-4 |
| P47 | Atelier corpus : file et pièce | `/dashboard/corpus` | G4 | groupe Ateliers (Q-E2-1) | PRA-4 |
| P48 | Étiquetage et opérations par lot | dans P47 | G4 | v2 | PRA-4 |
| P49 | Atelier des règles | `/dashboard/regles` | G4 | sans entrée tant que la garde est fermée (v2 l.770) | PRA-4 |
| P50 | Positions d'expert | `/dashboard/bibliotheque/positions-expert` | G4 | idem | PRA-4 |
| P51 | Synthèses et édition | `/dashboard/synthese` | G2/G6/G7 | raccourci du téléphone gardé ([[D-324]] §5) ; sans entrée au rail | PRA-5 |
| P52 | Documents : accès global | `/dashboard/documents` | G2/G7 | sans entrée de menu (v2) | PRA-5 |
| P53 | Correspondance : accès global | `/dashboard/correspondance` | G2/G7 | v2 ; groupe Travail | PRA-2 |
| P54 | Confiance et droits | `/dashboard/droits` | G2/G6 | v2 ; groupe Travail | PRA-2 |
| P55 | Validation d'un effet indésirable | depuis P54 | G6/G8 | v2 ; jamais sous un accordéon | PRA-2 |
| P56 | Conditions : envoi et suivi | dans P54 | G6/G2 | v2 | PRA-2 |
| P57 | Paramètres | `/dashboard/parametres` | G7 | groupe Cabinet (Q-E2-1) | PRA-2 |
| P58 | Agenda du sommeil : lecture | depuis le dossier | G7 | v2 | PRA-3 |
| P59 | Agenda alimentaire : lecture | depuis le dossier | G7 | v2 | PRA-3 |
| P60 | Décisions de parcours, journal | depuis le contexte du dossier | G7 | v2 | PRA-3 |

### 3.2 Patient

| Fiche | Titre (v2) | Route | Gab. | Navigation cible | Lot |
|---|---|---|---|---|---|
| U01 | Connexion à mon espace | `/portail/connexion` | G6 | v2 ; sans rail ni menu | PAT-2 |
| U02 | Lien indisponible | `/portail/lien/indisponible` | G7 | v2 ; sans rail ni menu | PAT-2 |
| U03 | Avant de commencer | `/portail/[token]` | G6 | v2 ; pas de rail avant franchissement ([[D-447]] §1) | PAT-2 |
| U04 | Date de naissance | `/portail/[token]` | G6 | v2 ; idem | PAT-2 |
| U05 | Circuit mineur | `/portail/[token]` | G7 | v2 ; aucune navigation adulte ([[D-283]] §5) | PAT-2 |
| U06 | Consentements d'entrée | `/portail/[token]` | G6 | v2 | PAT-2 |
| U07 | Fiche de renseignements initiale | `/portail/[token]` | G6 | v2 | PAT-2 |
| U08 | Parler de votre situation | `/portail/[token]` | G6 | v2 ; titre au registre (T-31), inchangé avant acceptation | PAT-2 |
| U09 | Fin de l'entrée, première tâche | `/portail/[token]` | G5 | v2 | PAT-2 |
| U10 | Mon parcours et mes questionnaires | `/portail/[token]/questionnaires` | G5 | frise gardée ; « Autres espaces » sous 1 024 px seulement quand le rail est servi (AM-2) ; « Mon accompagnement » ouvert sur échec (#1979, livré) | PAT-3 |
| U11 | Questionnaire : saisie par parties | `/questionnaires/[idAssignation]` | G6 | v2 ; ni rail ni barre ; bouton « Menu » selon les gardes | PAT-4 |
| U12 | Questionnaire de plaintes | dans U11 | G6 | v2 | PAT-4 |
| U13 | Vérifier puis transmettre | dans U11 | G6/G8 | v2 | PAT-4 |
| U14 | Réponses transmises, correction | dans U11 | G7 | v2 | PAT-4 |
| U15 | Mon équilibre | depuis les réponses | G7 | v2 | PAT-5 |
| U16 | Mon agenda du sommeil | assignation d'agenda | G6/G7 | v2 | PAT-4 |
| U17 | Mon agenda alimentaire | assignation d'agenda | G6/G7 | v2 | PAT-4 |
| U18 | Mon accompagnement | bloc du hub | G5/G7 | v2 ; états d'échec **livrés** (#1973, #1979) | PAT-3 |
| U19 | Jour difficile | dans U18 | G7 | v2 | PAT-3 |
| U20 | Mon point de suivi | `/portail/[token]/suivi` | G6/G7 | entrée du rail et titre au registre (T-30) ; états d'erreur et de session **livrés** (#1973, #1978) | PAT-3 |
| U21 | Mon protocole imprimable | `/portail/[token]/protocole` | G7 | v2 ; sans rail à l'impression | PAT-3 |
| U22 | Mon observation alimentaire | `/portail/[token]/alimentation` | G6 | v2 | PAT-4 |
| U23 | Ce qui compte pour moi | `/portail/[token]/ce-qui-compte` | G6/G7 | v2 | PAT-5 |
| U24 | Ce que mon praticien a compris | `/portail/[token]/comprehension` | G7/G6 | v2 | PAT-5 |
| U25 | Mon dossier à deux voix | `/portail/[token]/dossier` | G7 | v2 | PAT-5 |
| U26 | Mon bilan | `/portail/[token]/bilan` | G7 | v2 | PAT-5 |
| U27 | Ma bibliothèque | `/portail/[token]/bibliotheque` | G2/G7 | v2 | PAT-5 |
| U28 | Mes fiches (liste héritée) | `/portail/[token]/fiches` | G2 | v2 ; jamais deux entrées pour une même destination | PAT-5 |
| U29 | Lire une fiche remise | `/fiches/[idRemise]` | G7 | v2 ; retour vers `/fiches` | PAT-5 |
| U30 | Pour votre médecin | `/pour-votre-medecin` | G7 | v2 | PAT-5 |
| U31 | Courrier pour mon médecin | `/courrier-medecin` | G7 | v2 | PAT-5 |
| U32 | Courrier préalable (complément) | `/courrier-complement` | G7 | v2 | PAT-5 |
| U33 | Mes documents : dépôt | `/documents` | G6/G2 | v2 | PAT-6 |
| U34 | Comptes rendus biologiques | `/comptes-rendus` | G6 | v2 | PAT-6 |
| U35 | Renseignements et déclarations | `/renseignements` | G6/G7 | v2 | PAT-6 |
| U36 | Mes échanges | `/echanges` | G2/G7 | v2 | PAT-6 |
| U37 | Informations et cadre | `/informations` | G7 | v2 | PAT-5 |
| U38 | Conditions d'utilisation | `/conditions` | G7/G8 | v2 ; retour « ← Mon espace » gardé, vers sa destination actuelle (T-34 refusé, [[D-488]] §6) | PAT-5 |
| U39 | Mes choix et droits | depuis Informations | G6/G7 | v2 | PAT-6 |
| U40 | Signaler un problème | depuis Informations ou U18 | G6/G8 | v2 | PAT-6 |
| U41 | Invitation à une réévaluation | dans Mon parcours | G7/G8 | v2 | PAT-3 |
| U42 | Confort de lecture | commande persistante | G8 | v2 ; le rail réduit garde ses cibles en confort 112,5 % (AM-1) | PAT-1 |

### 3.3 Communes

| Fiche | Titre (v2) | Gab. | Cible révisée | Lot |
|---|---|---|---|---|
| X01 | Connexion praticien | G6 | v2 | PRA-2 |
| X02 | Menus global, dossier et Mon espace | G3/G5 | praticien : trois états, sans vues rapides (AM-3, AM-5) ; patient : trois états, rail seul dès 1 024 px (AM-1, AM-2) | PRA-1 et PAT-1 |
| X03 | États de lecture et messages | G1–G7 | v2 ; composant d'état par rôle (`LienDataState` en référence) | COM-0 puis chaque lot |
| X04 | Panneaux superposés | G8 | v2 ; `PanneauSuperpose` reste la primitive | COM-0 |
| X05 | Brouillons, reprise, conflits | G6 | v2 ; replier un rail ou changer de sous-vue ne perd aucune saisie | chaque lot |
| X06 | Lecteur, impression | G7 | v2 ; aucun rail ni menu à l'impression | PRA-5 et PAT-5 |
| X07 | Erreur globale, page absente | G7 | v2 | COM-0 |
| X08 | Vitrines de fixtures | — | v2 ; hors navigation | — |

## 4. Couverture

110 fiches sur 110 ont un gabarit et un lot. Changent par rapport à la v2 :
X02, P01, P04, P33, P35, P36, P47, P51, P53, P54, P57, U10, U20, U42 et la
navigation des fiches à rail ; les autres gardent leur fiche v2. Les
prototypes de l'étape 3 couvrent d'abord les familles listées par la
contre-lecture §10 (étape 3) ; les autres fiches suivent leur gabarit.
