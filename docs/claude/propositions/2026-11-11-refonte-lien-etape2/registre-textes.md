# Refonte Lien / Empreinte — étape 2 : registre des textes

> **Accepté le 2026-11-11** : tous les textes mot pour mot sauf T-34, refusé
> (« ← Mon espace » et sa destination actuelle maintenus). Inscrits par
> DOC-0 dans [[D-488]], qui fait foi ; Q-E2-5 (a) y est aussi (§7).

Chaque texte neuf ou changé par la refonte passe ici avant tout lot (réponse
6 (a) du 2026-11-11). Le bloc du 2026-11-11 a été accepté, sauf T-34,
comme indiqué en tête ; chaque proposition ajoutée ensuite attend son
acceptation **mot pour mot**. Un texte accepté est inscrit sous une décision
par DOC-0 ou un DOC-n (`socle-commun.md`) avant le lot qui l'applique. Un texte
refusé laisse l'existant en place ; le lot qui le portait livre sans lui.

Numérotation par famille, avec des trous voulus : praticien T-01 à T-19
(T-16, « Aller au contenu », ajouté par DOC-1 dans [[D-488]] ; T-17 à T-19,
textes du prototype PRA-2, ajoutés par DOC-6, §1.4) et T-60 à T-66
(textes du prototype PRA-3b, ajoutés par DOC-8, §1.5),
rail patient T-21 à T-23, textes patient T-30 à T-34 ; T-35 est ajouté
le 2026-11-12 comme proposition non acceptée pour U02. DOC-5 ajoute
T-36 à T-39 ; DOC-7 inscrit T-40 à T-44 et T-48 (PAT-4), puis T-49/T-50
(lot Q5b). T-45 est sans objet ; T-46/T-47 restent libres.
Aucun identifiant absent n'est un texte manquant.

Colonnes : **Proposé** (texte exact, sans guillemets de l'interface) ;
**Où** (couche, composant) ; **Sens** (ce que le texte doit dire, pour juger
une autre formulation) ; **Existant** (texte affiché au commit `ac3f0ead`,
fichier:ligne sous `web/src/`) ; **Lot** (plan qui l'applique).

Sources : inventaire des libellés du 2026-11-11 (lecture du dépôt) ; cadrage
v3 §4 (l.80-97), §10 (l.279) ; catalogue v2 (fiches citées).

Rien ici ne touche un texte de pause, de conduite à tenir, de consentement ni
de droits (cadrage v3 l.91) : les lignes qui en approchent sont marquées
« non proposé ».

## 1. Praticien

### 1.1 Groupes du menu (Q-E2-1, option a)

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-01 | Travail | intertitre du rail, du tiroir et de la feuille « Plus » | le travail du jour et des dossiers | « La Spirale » `components/ui/SidebarRail.tsx:67` | PRA-1 |
| T-02 | Bibliothèque | idem | inchangé | `SidebarRail.tsx:104` | PRA-1 |
| T-03 | Ateliers | idem | outils de fabrication du savoir, hors consultation | aucun (entrées sous Bibliothèque) | PRA-1 |
| T-04 | Cabinet | idem | comptes et réglages du cabinet | « Réglages » `SidebarRail.tsx:115` | PRA-1 |

La feuille « Plus » n'a aujourd'hui aucun intertitre
(`components/ui/MobileBottomNav.tsx:34`) ; elle prend T-01 à T-04.

### 1.2 Libellés de destination

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-05 | Le Fil du jour (rail, feuille) ; Le Fil (barre basse, inchangé) | `/dashboard` | une seule forme longue ; la forme courte reste celle de la barre, faute de place | rail `SidebarRail.tsx:69` ; barre « Le Fil » `MobileBottomNav.tsx:10` ; vues rapides « Fil du jour » `components/ui/VuesRapides.tsx:13` (retirées, AM-3) | PRA-1 |
| T-06 | Fiche-trajectoire (rail, feuille) ; Fiches (barre basse, inchangé) | `/dashboard/trajectoires` et fiches patient | inchangé ; la barre garde sa forme courte | `SidebarRail.tsx:81` ; `MobileBottomNav.tsx:16` | — |
| T-07 | Consultation copilote | toutes couches | une seule forme | rail `SidebarRail.tsx:88` ; vues rapides « Consultation » `VuesRapides.tsx:19` (retirées, AM-3) | PRA-1 |

Aucun autre libellé de destination praticien ne change. « Synthèses »
(barre, `MobileBottomNav.tsx:20`) et « Synthèse IA & Booklet » (titre,
`app/dashboard/synthese/page.tsx:12`) diffèrent : relevé, non proposé.

### 1.3 Commandes des panneaux

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-10 | Navigation principale | nom accessible du `<nav>` du rail | nommer le rail pour les lecteurs d'écran | aucun (`SidebarRail.tsx:197`) ; la barre basse porte déjà ce nom (`MobileBottomNav.tsx:71`), affichée à d'autres largeurs | PRA-1 |
| T-11 | Réduire la navigation / Étendre la navigation | bouton du rail | inchangé | `components/NavBar.tsx:110` | — |
| T-12 | Masquer la navigation | pied du rail | escamoter le rail | aucun | PRA-1 |
| T-13 | Afficher la navigation | en-tête, rail escamoté | rouvrir le rail déplié | aucun ; cadrage v2 §5.2 l.166 proposait « Ouvrir le menu » | PRA-1 |
| T-14 | Masquer les phases / Afficher les phases | fiche, rail des sept phases | le cadrage dit « étapes » (l.279) ; la fiche les nomme « phases » | aucun | PRA-3 |
| T-15 | Masquer le contexte / Afficher le contexte | fiche, panneau droit | cadrage v3 l.279 | aucun | PRA-3 |

### 1.4 Textes du prototype PRA-2 — acceptés (D-488)

Le responsable a validé par écrit le prototype PRA-2 le 2026-11-12 (« Oui,
tout validé ») : onze questions, inscrites en complément DOC-6 de
[[D-481]], et les trois textes ci-dessous, acceptés mot pour mot.
Inscription par DOC-6 dans [[D-488]], amendement du 2026-11-12. Existant
lu au commit `9a680203`.

| Id | Proposé | Où | Sens | Existant | Lot | Statut |
|---|---|---|---|---|---|---|
| T-17 | Réessayer | Patients (tableau) et Agenda (liste des rendez-vous), sous le message d'échec de lecture | relit la seule lecture en échec ; recherche, tri et saisie du formulaire gardés | aucun ; un échec vide aujourd'hui la liste (`components/dossier/RayonPatientsPanel.tsx:491`, `components/agenda/AgendaPraticien.tsx`) | PRA-2a (Patients, Agenda) | **Accepté (D-488)** |
| T-18 | Météo d'adhésion indisponible | badge d'une carte du Fil dont la météo d'adhésion n'a pas pu être lue (`components/fil/FilDuJour.tsx:245`) | ne qualifie pas l'adhésion ; distinct du panneau « Météo d'adhésion » | aucun | PRA-2b | **Accepté (D-488)** |
| T-19 | Retour à la file | Confiance & droits, en tête du détail d'un dépôt, à la tablette et au téléphone (Q10 b) | revient à la file, même page et même position ; n'enregistre rien | aucun | PRA-2b | **Accepté (D-488)** |

T-17 est posé dès son inscription (Q4 b) ; les messages d'échec qu'il
accompagne sont les phrases existantes. Aucun texte de consentement, de
droits ni de sécurité n'est touché.

### 1.5 Textes du prototype PRA-3b — acceptés (D-488)

Le responsable accepte mot pour mot le 2026-11-12 (« J'accepte tout ») les
textes du prototype PRA-3b (itération 2 révisée). Le prototype les
numérotait T-50 à T-56 ; T-49 et T-50 étant pris par DOC-7, ils sont
inscrits sous T-60 à T-66, sans changement de mot. Inscription par DOC-8
dans [[D-488]], amendement du 2026-11-13 ; arbitrages Q4 a, Q6 b, Q9 a et
Q17 a en complément DOC-8 de [[D-481]]. Existant lu au commit `50b0e4cf`,
inchangé à `c8542cab`.

| Id | Proposé | Où | Sens | Existant | Lot | Statut |
|---|---|---|---|---|---|---|
| T-60 | Les questionnaires reçus n’ont pas pu être lus. Ce n’est pas un dossier sans réponse. | fiche, Données : carte des questionnaires reçus et tiroir « Détail des réponses » (`components/FichePatientPanel.tsx:1634`, `:2080`) | dit l'échec de lecture ; la comparaison (P10) se tait derrière lui | « Aucun questionnaire complété pour ce patient. » affiché sur un échec | PRA-3b, PR 2 | **Accepté (D-488)** |
| T-61 | Les points d’étape n’ont pas pu être lus. Ce n’est pas une absence de réponse du patient. | fiche, Suivi : point J21 (`components/patient-cockpit/J21DecisionPanel.tsx:156`) | ne qualifie pas l'adhésion | pastille « Indéterminée » et « non disponible pour l’instant » | PRA-3b, PR 5 | **Accepté (D-488)** |
| T-62 | Les transmissions du patient n’ont pas pu être lues. Ce n’est pas une absence de transmission. | onglet Alimentation (`components/food-observation/PractitionerFoodObservationPanel.tsx:646`) | dit l'échec de lecture | « Aucune transmission du patient à ce jour. » sur un échec | PRA-3b, PR 5 | **Accepté (D-488)** |
| T-63 | Le protocole diffusé n’a pas pu être lu. Ce n’est pas une absence de protocole. | onglet Alimentation (`components/food-observation/PractitionerFoodObservationPanel.tsx:626`) | dit l'échec de lecture | « Aucun protocole diffusé pour ce patient : … » sur un échec | PRA-3b, PR 5 | **Accepté (D-488)** |
| T-64 | Les arbitrages biologiques n’ont pas pu être lus. Ce n’est pas une absence d’arbitrage. | onglet Biologie (`components/patient-cockpit/ArbitrageBiologiquePanel.tsx:155`) | aucun formulaire de verdict ni « Appliquer » tant que la lecture n'a pas réussi | formulaires affichés comme si rien n'était arbitré | PRA-3b, PR 6 | **Accepté (D-488)** |
| T-65 | La proposition de bilan n’a pas pu être lue. Ce n’est pas une absence de proposition. | onglet Biologie, proposition de bilan (`components/biologie/PropositionBilanSection.tsx`) | pour toute réponse autre que le motif `cb_proposition_desactivee` (étage fermé), qui laisse le panneau absent | le panneau disparaît | PRA-3b, PR 6 | **Accepté (D-488)** |
| T-66 | Voir les nuits une par une | tiroir Agenda du sommeil, sous le chronogramme (`components/agenda-sommeil/ChronogrammeSommeil.tsx`) | déplie la liste des nuits, chacune avec toutes les rubriques de l'infobulle | aucun | PRA-3b, PR 8 | **Accepté (D-488)** |

Inscrits par le même amendement de [[D-488]] : dans l'onglet Alimentation,
retrait des deux mentions de version (JA5-03, JA5-05) et quatre apostrophes
rétablies (Q9 a) ; emplacements neufs de T-17, du texte de relecture
existant sous P28 et du message serveur de double arbitrage sous P19
(Q17 a). Aucun texte de consentement, de droits ni de sécurité n'est
touché ; chaque texte est posé par la PR de PRA-3b indiquée.

## 2. Patient

### 2.1 Commandes du rail (AM-1, §4 bis)

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-21 | Réduire le menu | pied du rail « Mon espace » | passer au rail réduit, libellés gardés | aucun | PAT-1 |
| T-22 | Agrandir le menu | idem, rail réduit | revenir au rail déplié | aucun | PAT-1 |
| T-23 | Masquer le menu | idem | escamoter le rail ; le bouton « Menu » reparaît | aucun | PAT-1 |
| — | Menu | en-tête, rail escamoté | inchangé : rouvre le rail déplié | `components/patient/menu/textesMenu.ts:5` | PAT-1 |

« Menu » plutôt que « navigation » : c'est déjà le mot du bouton côté
patient ([[D-442]]).

### 2.2 Point de suivi (cadrage v3 l.95)

Le cadrage pose « Mon point de suivi » pour le formulaire et réserve
« rendez-vous » à une rencontre. Les lignes T-30 s'acceptent ensemble ou pas
du tout : le cadrage exige la cohérence entre entrée, titre, bouton et
confirmation.

| Id | Proposé | Où | Existant |
|---|---|---|---|
| T-30a | Ouvrir mon point de suivi | entrée de la table (menu, rail, hub) | « Ouvrir mes rendez-vous de suivi » `components/patient/autres-espaces/entreesAutresEspaces.ts:71` |
| T-30b | Mon point de suivi | titre de page | « Rendez-vous de suivi » `components/patient-companion/ProtocolCheckinForm.tsx:129, :140, :155` |
| T-30c | Mon point de suivi — semaine N | titre, point ouvert | « Rendez-vous de suivi — Semaine N » `ProtocolCheckinForm.tsx:170` |
| T-30d | Mes points de suivi | intertitre de l'historique | « Vos rendez-vous de suivi » `components/patient-companion/ProtocolCheckinTrend.tsx:39` |
| T-30e | Mon point de suivi | lien de l'accompagnement | « Mes rendez-vous de suivi » / « Mon rendez-vous de suivi » `components/patient-companion/PatientCompanionHome.tsx:303` |
| T-30f | Le noter dans mon point de suivi | lien de Jour difficile | `PatientCompanionHome.tsx:382` |
| T-30g | Répondre à mon point de suivi | action du Fil patient | `lib/portail/filDuJour.ts:174` |
| T-30h | Votre suivi est clôturé : vous ne pouvez plus répondre à ce point de suivi. | message, dossier clos | `lib/patient/cycleDeVie.ts:108` |
| T-30i | Aucun point de suivi ouvert actuellement. / Ce point de suivi n’est pas ouvert. | erreurs du serveur affichées | `app/api/portail/protocole/checkin/route.ts:99, :108` |

« Suivi » (barre basse, `components/patient/barre-basse/textesBarreBasse.ts:9`)
ne change pas. T-30h et T-30i touchent `lib/` et une route : texte seul, sans
changer la règle ni le statut. Les tests qui citent l'ancien texte suivent.

### 2.3 Entrée du parcours (cadrage v3 l.97, fiche U08)

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-31a | Parler de votre situation | titre de l'étape d'entrée | nommer l'étape sans le mot « anamnèse » ; les questions ne changent pas | « Anamnèse » `app/portail/[token]/page.tsx:511` | PAT-2 |
| T-31b | Continuer vers votre situation | bouton qui y mène | idem | « Continuer vers l’anamnèse » `page.tsx:312` | PAT-2 |

Non proposé : le gabarit d'e-mail au patient
(`lib/correspondance/registreGabarits.ts:113`) et le texte de
`lib/portail/stockageAppareil.ts:81` gardent « anamnèse » ; un gabarit de
correspondance a son propre circuit de validation. Côté praticien,
« anamnèse » reste partout (cadrage v3 l.97).

### 2.4 Écarts relevés dans l'existant

| Id | Proposé | Où | Sens | Existant | Lot |
|---|---|---|---|---|---|
| T-32 | Ouvrir mon carnet alimentaire | entrée de la table | casse : « mon » en minuscule, comme les autres entrées | « Ouvrir Mon carnet alimentaire » `entreesAutresEspaces.ts:72` | PAT-1 |
| T-33 | Ce que mon praticien a compris de moi | titre de page | première personne, comme le lien qui y mène (cadrage v3 l.82) | « Ce que votre praticien a compris de vous » `components/patient-companion/ComprehensionView.tsx:117, :126, :143` | PAT-5 |
| T-34 | ← Mon parcours | retour de la page Conditions, vers `/questionnaires` | même retour que toutes les autres pages | « ← Mon espace », vers `/portail/[token]` `app/portail/[token]/conditions/page.tsx:88` | PAT-5 |

Le « Réessayer » affiché sous « Suivi non reconnu. »
(`lib/protocol/portailProtocol.ts:32`, rendu par `ProtocolCheckinForm.tsx`)
n'est pas un texte mais un comportement : il passe en question (Q-E2-5,
`README.md` §4).

T-33 : si une décision fixe ce titre, elle est à amender (non trouvée à la
lecture du registre ; à vérifier à l'acceptation).

Non proposés, relevés :

- « Mon parcours » (menu, rail, hub) et « Accueil » (barre basse) : le
  cadrage v3 l.309 garde « Accueil » à la barre.
- Titre de Conditions identique à celui d'Informations
  (`conditions/page.tsx:83`, `informations/page.tsx:103`) : page de droits,
  hors refonte (cadrage v3 l.91).
- « Mes informations et mes droits », « Confidentialité et droits »,
  « Consulter les informations détaillées » : quatre formes pour une page ;
  textes de droits, hors refonte.
- « Votre accompagnement » (encart et page imprimable) sous le titre
  « Mon accompagnement » du hub ; « Mon dossier, à deux voix » sous l'entrée
  « Ouvrir mon dossier à deux voix » ; « votre médecin » dans les titres et
  « mon médecin » dans les actions du Fil. À reprendre dans un registre de
  textes patient séparé si le responsable le demande.
- Hub : `aria-label` « Autres espaces » sans titre visible
  (`components/patient/autres-espaces/NavAutresEspaces.tsx:40`) ; dès
  1 024 px avec rail, le bloc n'est plus rendu (AM-2).
- Deux `<nav>` « Accès rapides » (barre basse et `VuesRapidesPortail`) :
  le second disparaît avec AM-2.
- Libellés morts des dix composants `Lien*` montés en `sondeSeule`
  (`SondesAutresEspaces.tsx:34-43`) : jamais affichés ; ils ne changent pas.

### 2.5 Proposition après arbitrage PAT-2 — en attente

Le responsable a retenu Q2 (a) le 2026-11-12 : U02 garde le lien et la
destination actuels. Il demande de soumettre le libellé ci-dessous, pas de
l'appliquer. Référence : [[D-481]], complément PAT-2 du 2026-11-12 (DOC-3).

| Id | Proposé | Où | Sens | Existant | Lot | Statut |
|---|---|---|---|---|---|---|
| T-35 | Revenir à la connexion | U02, `app/portail/lien/indisponible/page.tsx`, lien vers `/portail/connexion` | nommer la destination réelle ; garder la navigation pleine page qui relit les conditions d'ouverture | Continuer avec Google | lot distinct après acceptation et inscription DOC-n ; non appliqué dans PAT-2 avant cette acceptation | **Proposé — non accepté ; acceptation mot pour mot requise** |

T-35 ne fait pas partie du bloc accepté le 2026-11-11 et n'est pas ajouté
aux textes acceptés de [[D-488]]. Aucun changement de destination, de garde
ou d'authentification n'est proposé ici. Q5 (reconnexion), Q6 (brouillon
dans l'onglet) et Q7 (emplacement de l'alerte) restent des questions
séparées : aucun autre texte n'est implicitement accepté. Elles ont été
tranchées le même jour, à part : voir §2.6 (DOC-4).

### 2.6 Textes après arbitrage PAT-2 (Q5a, Q6b) — acceptés (D-488)

Le responsable a retenu Q5 (a), Q6 (b) et Q7 (a) le 2026-11-12 (DOC-4).
Il a ensuite accepté mot pour mot les quatre formulations ci-dessous,
telles qu'au présent §2.6 sur `claude/refonte-lien-doc4-pat2@61b3b1da`.
Inscription par DOC-5 dans [[D-488]], amendement du 2026-11-12 ; application
dans PAT-2 seulement. Numérotation : textes patient, à la suite de T-35.

| Id | Proposé | Où | Sens | Existant | Lot | Statut |
|---|---|---|---|---|---|---|
| T-36 | Me reconnecter | lien sous « Session expirée. Reconnectez-vous. » (réponses 401 de `/api/portail/consentement`, `/fiche`, `/valider`), vers la page de connexion, dans le même onglet | laisser le patient comprendre l'interruption et choisir de poursuivre (Q5a) | aucun | PAT-2 | **Accepté (D-488)** |
| T-37 | Brouillon gardé dans cet onglet — dernière sauvegarde à {HH:MM}. Il ne sera transmis à votre praticien qu’après validation. | entrée seule (fiche et situation, `app/portail/[token]/page.tsx`) ; `{HH:MM}` = heure de la dernière écriture réussie | dire où le brouillon est réellement conservé (`sessionStorage`) (Q6b) | « Brouillon enregistré sur cet appareil — dernière sauvegarde à {HH:MM}. Il ne sera transmis à votre praticien qu’après validation. » `components/patient/SaveStatusIndicator.tsx:36` | PAT-2 | **Accepté (D-488)** |
| T-38 | Connexion interrompue — vos réponses restent conservées dans cet onglet. | entrée seule, idem | idem (Q6b) | « Connexion interrompue — vos réponses restent conservées sur cet appareil. » `SaveStatusIndicator.tsx:19` | PAT-2 | **Accepté (D-488)** |
| T-39 | Transmission non terminée — vos réponses restent conservées dans cet onglet. | entrée seule, idem | idem (Q6b) | « Transmission non terminée — vos réponses restent conservées sur cet appareil. » `SaveStatusIndicator.tsx:27` | PAT-2 | **Accepté (D-488)** |

Les questionnaires (brouillon en `localStorage`) gardent leurs textes « sur
cet appareil » : T-37 à T-39 ne valent que pour l'entrée (U07, U08).
`{HH:MM}` est l'heure de la dernière écriture réussie. Q7 (a) ne propose
aucun texte : le message de sécurité garde son texte et son emplacement
([[D-277]] §1). T-36 à T-39 sont acceptés et inscrits dans [[D-488]] par
DOC-5 ; aucun code ne change dans ce lot documentaire. Le correctif Q6b
reste à réaliser dans PAT-2. T-35 reste proposé, non accepté.

## 2.7 PAT-4 et brouillon alimentaire — DOC-7

Acceptations individuelles du responsable le 2026-11-12, après présentation
de chaque existant revérifié sur main. Les textes exacts, leur emplacement,
leur sens, l'existant et leur lot ont pour **source canonique [[D-488]],
amendement DOC-7** ; ne pas recopier une variante depuis le prototype.

| Famille | Statut final | Portée |
|---|---|---|
| T-40 | accepté mot pour mot | accusé de la demande de correction, PAT-4 |
| T-41a, T-41b | acceptés mot pour mot | messages du sommeil sans emoji ; T-41a d'abord refusé puis accepté sur correction directe « t41a retirer l'émoji » |
| T-42a à T-42c | acceptés mot pour mot | boutons des agendas sans signe décoratif |
| T-43a à T-43e | acceptés mot pour mot | libellés du sommeil sans emoji ; mots, variantes et valeurs inchangés |
| T-44a, T-44b | acceptés mot pour mot | messages de l'agenda alimentaire sans emoji |
| T-48a à T-48g | acceptés mot pour mot | ponctuation avec U+00A0 avant ? et : |
| T-48h | accepté mot pour mot | seule l'apostrophe devient typographique, valeur gt60 inchangée |
| T-36, emplacement | accepté par Q6a, inscription DOC-7 | sous les 401 des questionnaires, plaintes et deux agendas ; même onglet vers /portail/connexion |
| T-49 | accepté mot pour mot, non publié | rappel de l'appareil partagé près du brouillon, lot Q5b |
| T-50 | accepté mot pour mot, non publié | information de conservation, circuit TRUST, lot Q5b |

T-45 est sans objet (Q5b, [[D-507]]) : les quatre textes « sur cet
appareil » restent. T-46/T-47 restent libres. T-49/T-50 étaient libres
avant inscription ; DOC-7 est le prochain numéro après DOC-6, sans DOC-n
concurrent ouvert au relevé. Aucun texte du message de sécurité ne change :
[[D-506]] ne change que sa visibilité, avec la réserve Q11b.

L'acceptation de T-49/T-50 ne publie aucune version de confidentialité :
ils ne deviennent visibles qu'au lot séparé Q5b, avec le comportement décrit.
Voir pat4-prealables.md et lot-q5b-brouillon-appareil.md.

## 2.8 PAT-5, lectures et espaces reçus — DOC-9

Réponses du responsable le 2026-11-13 au prototype PAT-5, itération 1
(« All recommended » : Q1c à Q8a), puis acceptation mot pour mot des deux
emplacements neufs (« Accept both »). Source canonique : [[D-488]],
amendement DOC-9, et [[D-481]], complément DOC-9.

| Texte | Statut final | Portée |
|---|---|---|
| T-33 | accepté (DOC-0), appliqué au seul titre de U24 (Q4a) | l'intitulé de la synthèse sous l'objectif, dans U25, reste « Ce que votre praticien a compris de vous » |
| T-36, emplacement | accepté mot pour mot, inscription DOC-9 | sous le 401 d'un envoi de U23, U24 et U25, vers /portail/connexion : même onglet sur U23, nouvel onglet sur U24 et U25 (`20261113-1856-d`) |
| Phrase vide de U28, emplacement | **retiré par DOC-10** (inscrit par DOC-9) | contredisait [[D-357]] §2 et [[D-360]] §3 (`20261113-2119-d`) : la phrase reste au seul U28, et le rayon vide de U27 ne s'affiche pas |

Aucun texte neuf ni nouvel identifiant. Ne sont pas proposés, et restent
tels qu'au code : les titres « Mon bilan » et « Bilan neuronutritionnel »
(U26), le titre commun de U37 et U38, les retours « ← Mon parcours » (U37)
et « ← Mon espace » (U38, T-34 refusé), la date de version en AAAA-MM-JJ
(confiée à PAT-6), et les apostrophes droites des textes signés. Le bouton
« Imprimer ou enregistrer en PDF » n'est pas étendu à U24 et U25 (Q5a).

## 2.9 PAT-6, transmissions et droits — DOC-11

Réponses du responsable le 2026-11-14 au prototype PAT-6, itération 1
(`Q1b — Q2a — Q3a — Q4a — Q5a — Q6a — Q7a`), avec l'acceptation mot pour
mot du réemploi de T-36 aux emplacements de Q2a et Q3a. Source canonique :
[[D-488]], amendement DOC-11, et [[D-481]], complément DOC-11.

| Texte | Statut final | Portée |
|---|---|---|
| Session expirée. Reconnectez-vous. (texte de la route), emplacement | retenu par Q2a, inscription DOC-11 | affiché sous le bouton d'envoi de U33 et U34 quand le dépôt est refusé en 401 ; chargement et accusé de U34 inchangés |
| T-36, emplacement | accepté mot pour mot, inscription DOC-11 | sous ce message sur U33 et U34, et sous le 401 d'un enregistrement de U35 (page seule), U39 et U40 ; vers /portail/connexion, nouvel onglet |

Aucun texte neuf ni nouvel identifiant. Changent de présentation seulement :
la date de version, en lettres dans `DocumentTrust` et dans les deux mentions
de U37 (Q1b), et les mentions datées de U35 (Q7a). Ne sont pas proposés, et
restent tels qu'au code : les titres « Ma fiche de renseignements » et « Mes
choix et autorisations » (le catalogue dit « Renseignements et
déclarations », « Mes choix et droits ») ; l'explication « votre praticien ne
l’a pas encore ouvert » de U34 (D-269 §4), quand U33 ne le dit jamais
(D-330) ; les espaces ordinaires avant « : » des mentions de traitement et
des intitulés de « Mes choix » ; les numéros d'urgence de « Signaler un
problème ». Un accusé explicite sur U35 et U39 reste à examiner dans un
micro-lot documentaire distinct (recommandation du responsable, Q6).

## 3. Récapitulatif

| Plan | Textes à accepter avant le lot |
|---|---|
| Praticien | T-01 à T-05, T-07, T-10, T-12, T-13 (PRA-1) ; T-14, T-15 (PRA-3) ; T-16 (PRA-2a, inscrit par DOC-1) ; T-17 (PRA-2a), T-18, T-19 (PRA-2b), acceptés et inscrits dans D-488 par DOC-6 ; T-60 à T-66 (PRA-3b), acceptés et inscrits dans D-488 par DOC-8 |
| Patient | T-21 à T-23, T-32 (PAT-1) ; T-31 (PAT-2) ; T-30 (PAT-3) ; T-33, T-34 (PAT-5), avec l'emplacement neuf de T-36 inscrit par DOC-9 (celui de la phrase vide de U28 retiré par DOC-10) ; T-36 à T-39 inscrits par DOC-5 ; emplacements neufs de T-36 et du message de session expirée inscrits par DOC-11 (PAT-6) ; T-40 à T-44, T-48 et nouvel emplacement T-36 inscrits par DOC-7 (PAT-4), T-49/T-50 inscrits pour Q5b ; T-34 refusé, T-35 reste proposé, T-45 sans objet |
