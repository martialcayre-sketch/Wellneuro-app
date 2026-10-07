# BP-26 — Trame de la note de qualification par fonction (2026-10-05)

**Ce document est une trame, pas la note.** Il pose les questions, fonction
par fonction, avec les faits du dépôt qui servent à y répondre. **Il ne
conclut rien** : chaque conclusion revient au responsable (`D-266` §2,
cadrage BIO-PARCOURS v3 §4.6). La note signée sera datée. Si elle cite des
cas, elle est déposée hors dépôt ; au dépôt ne figurent alors que sa
conclusion, sa date et son emplacement.

Aucun cas réel n'est cité ici.

## Comment remplir une ligne

Pour chaque fonction :

1. **Énoncé de destination.** Ce que le logiciel fait, pour qui, dans quel
   but. L'énoncé proposé ci-dessous décrit le comportement constaté dans le
   code. Le responsable le confirme ou le corrige : la qualification dépend de
   la destination revendiquée et de ce que la fonction fait réellement, pas de
   son intitulé.
2. **Arbre de décision.** MDCG 2019-11 Rev.1 (juin 2025), figure 1 (§3.3,
   cinq étapes) puis figure 2 (§3.4, trois étapes). Texte relu le 2026-10-07
   (section « Relecture du texte officiel » ci-dessous). Les libellés Q1 à Q5
   sont conservés pour les renvois des lignes A ; Q1b est l'étape que la
   première version omettait.
   - Q1 — Est-ce un logiciel au sens du guide (« un ensemble d'instructions qui
     traite des données d'entrée et crée des données de sortie ») ? Figure 1,
     étape 1.
   - Q1b — Est-ce un produit de l'annexe XVI du MDR, un accessoire d'un
     dispositif, ou un logiciel qui pilote ou influence l'usage d'un
     dispositif matériel ? Si oui, il suit ce dispositif. Figure 1, étape 2.
   - Q2 — Le logiciel fait-il plus que stocker, archiver, communiquer,
     rechercher simplement ou compresser sans perte ? Figure 1, étape 3 ; §3.1.
   - Q3 — Ce traitement sert-il un patient individuel ? Ne le servent pas :
     l'agrégation de données de population, les parcours génériques non
     dirigés vers un patient, la littérature, les atlas, modèles et gabarits.
     Figure 1, étape 4.
   - Q4 — La finalité est-elle celle d'un dispositif médical : article 2(1) du
     MDR (diagnostic, prévention, surveillance, prédiction, pronostic,
     traitement ou atténuation d'une maladie…) ou article 2(2) de l'IVDR ?
     Figure 1, étape 5. L'annexe I b range parmi les dispositifs les outils
     qui combinent des connaissances médicales générales et des algorithmes
     avec des données propres au patient, pour fournir aux professionnels ou
     aux utilisateurs des recommandations de diagnostic, de pronostic, de
     surveillance ou de traitement **pour un patient individuel**.
   - Q5 — Si Q4 est oui : MDR ou IVDR ? L'information relève-t-elle de
     l'article 2(2) de l'IVDR (étape 1) ; repose-t-elle sur des données issues
     uniquement de dispositifs de diagnostic in vitro (étape 2) ; sinon, la
     destination est-elle portée principalement par ces données (étape 3,
     pondération qualitative des sources) ? Figure 2.
3. **Limite « outil ».** Ce que la fonction ne fait pas, et doit continuer de
   ne pas faire, pour rester dans l'étage outil.
4. **Conclusion du responsable** : hors champ, à réduire, à porter par une
   décision distincte (marquage CE, système qualité, évaluation clinique) ;
   pour une fonction déjà servie, exemption, régularisation ou réduction.

## A. Fonctions déjà servies (statuer sur chacune)

Chaque ligne porte les mêmes champs : faits (avec fichier), énoncé proposé,
points à examiner, limite « outil » (à remplir), conclusion du responsable.
Les champs vides le sont à dessein : la trame ne propose aucune voie à la
place du responsable.

### A1. Proposition de bilan biologique

- **Faits.**
  - Table `indicationsBiologieV1.ts` : 15 règles signées, déterministes, sans
    IA. Elles se répartissent en 12 `conditionnel`, 1 `optionnel` et 2
    `non_indique_actuellement` ; aucune n'est `recommande`.
  - Entrées : zones des questionnaires, drapeaux d'anamnèse de la
    consultation porteuse, panels déjà documentés.
  - Sortie **par panel**, analytes listés dans la ligne
    (`statuts.ts:73-91`). Six statuts : `recommande`, `optionnel`,
    `conditionnel`, `non_indique_actuellement`, `a_repeter`,
    `deja_documente`. Pour un `conditionnel`, la ligne dit si le déclencheur
    est rempli.
  - Le praticien voit les lignes. Un courrier au médecin est généré côté
    serveur et remis à la main, sans envoi (`proposition/courrier/route.ts`).
    Un **document remis au patient**, établi par le praticien, est tiré de la
    proposition (`proposition/document-patient/route.ts`, `D-122` §1).
  - L'écran affiche « Une orientation d'exploration, hiérarchisée et sourcée
    — pas une ordonnance » (`PropositionBilanPanel.tsx:684-685`).
  - Drapeaux : `WN_CB_ENABLED` (déjà `true` au constat `D-070` du 2026-08-17)
    et `WN_CB_PROPOSITION` (posé le 2026-08-18, `D-072`).
- **Énoncé proposé.** « Proposer au praticien, d'après les réponses et
  l'anamnèse d'un patient, des panels d'examens biologiques à envisager, avec
  leur motif, à faire prescrire par un médecin. »
- **À examiner.** La proposition est calculée sur les données d'un patient
  (Q3, Q4). Le document patient est remis au patient (Q3, Q4).
- **Limite « outil »** :
- **Conclusion du responsable** : ☐ exemption · ☐ régularisation · ☐ réduction — motif :

### A2. Orientation (questionnaires et packs à proposer)

- **Faits.**
  - `orientationRulesV1.ts` : 20 règles signées, sans IA. Les déclencheurs se
    combinent en conjonction, avec des disjonctions `ou` (`D-060`,
    `orientationRulesV1.ts:193-200`).
  - Une suggestion vise un questionnaire ou un pack. La route dit « rien
    n'est jamais auto-assigné ».
  - Les constats du registre des contradictions (A9) excluent des cibles.
  - Drapeau : `WN_ENABLE_ORIENTATION_NNPP2`, posé.
- **Énoncé proposé.** « Suggérer au praticien les questionnaires ou les packs
  à faire remplir, d'après les scores et l'anamnèse du patient. »
- **Limite « outil »** :
- **Conclusion du responsable** : ☐ exemption · ☐ régularisation · ☐ réduction — motif :

### A3. Candidats de priorité (moteur de priorité)

- **Faits.** `priorityRulesV1.ts` : 8 règles signées, servies par
  `api/praticien/cockpit/route.ts` **sans drapeau**, sous la seule
  signature. Elles fournissent les candidats de la carte de décision ; le
  praticien retient une priorité, motif écrit.
- **Énoncé proposé.** « Présenter au praticien les priorités d'accompagnement
  candidates pour un patient, chacune issue d'une règle signée. »
- **Limite « outil »** :
- **Conclusion du responsable** :

### A4. Proposition d'objectif

- **Faits.** Route `api/praticien/propositions-objectif/route.ts`, machine
  déterministe distincte de l'usage IA de A5. Elle assemble des propositions
  d'objectif à partir de la plainte dominante, des candidats signés et de
  l'anamnèse lue en base. Drapeau : `WN_OBJECTIF_PROPOSE`, posé (`D-154`),
  relu `true` le 2026-09-11.
- **Énoncé proposé** :
- **Limite « outil »** :
- **Conclusion du responsable** :

### A5. Usages de l'IA générative au dossier

Ces usages sont déclarés au patient dans `usage_ia` v5 :

- **Synthèse** : brouillon structuré (résumé, axes prioritaires, points de
  vigilance, questions d'entretien, narratif patient, limites).
- **Proposition de priorité** : une formulation de 200 caractères au plus.
- **« Ce que j'ai compris de vous »** : premier jet, que le praticien doit
  réécrire.

Pour ces trois usages, le praticien valide avant que le patient ne voie quoi
que ce soit. Cela ne vaut pas pour A10.

- **Énoncé proposé** (une ligne par usage) :
- **À examiner.** « Axes prioritaires » et « points de vigilance » au regard
  de Q4.
- **Limite « outil »** :
- **Conclusion du responsable** (par usage) :

### A6. Relevé des comptes rendus biologiques (BIO-INGEST)

- **Faits.**
  - Le PDF ou l'image part entier chez Anthropic. Le modèle relève libellé,
    valeur, unité, date et page. `bio-extraction-v2` relèvera aussi
    l'intervalle et la marque imprimés, verbatim (`D-267`).
  - Le praticien valide ligne par ligne. Aucune unité n'est convertie, aucune
    valeur n'est qualifiée.
  - L'analyte n'est pas choisi par le modèle : un resolver signé, déterministe,
    en propose un quand il ne reste qu'un candidat (`resolverLibellesV1.ts`,
    `D-259`). Le praticien valide.
  - Drapeau : `WN_BIO_INGEST_ENABLED`, posé le 2026-10-03.
- **Énoncé proposé.** « Transcrire, pour validation par le praticien, les
  résultats imprimés sur un compte rendu de laboratoire. »
- **À examiner.** Q2 : ce traitement dépasse-t-il la communication ? Q5 : ce
  sont des résultats de laboratoire imprimés, à confronter à l'article 2(2)
  de l'IVDR.
- **Limite « outil »** :
- **Conclusion du responsable** :

### A7. Restitution des résultats biologiques

- **Faits.** `EstimeMesurePanel` affiche la série et la plage fonctionnelle
  sourcée, juxtaposée seulement si l'unité est la même. Il ne calcule aucun
  écart, n'affiche aucune couleur d'état, ne pose aucun verdict (`D-122`,
  `D-157`). Pas de surface patient. Drapeau : `WN_CB_RESULTS_ENABLED`.
- **Énoncé proposé.** « Présenter au praticien les résultats enregistrés d'un
  patient, à côté des plages publiées et sourcées, sans les interpréter. »
- **Limite « outil »** :
- **Conclusion du responsable** :

### A8. Assiettes indiquées, portes biologiques, fiches d'assiette

- **Faits.**
  - Assiettes indiquées : table signée, déclencheurs sur scores et anamnèse,
    sans IA (`indicationsAssiettesV1.ts`). Drapeau `WN_ASSIETTES_INDIQUEES`.
  - Portes biologiques : table signée, sans aucun nombre. Elles juxtaposent
    les claims du corpus et le dernier résultat ; aucune indication
    (`portesBiologiquesService.ts`).
  - Fiches d'assiette : texte adapté par IA sans donnée patient, validé par le
    praticien, remis au clic. Drapeaux `WN_FICHES_ASSIETTE` et
    `WN_FICHES_ASSIETTE_LECTURE`.
- **Limite « outil »** :
- **Conclusion du responsable** :

### A9. Registre des contradictions (`C-STR`)

- **Faits.** Registre signé qui produit des constats sur le dossier. Ces
  constats excluent des cibles de l'orientation (A2). Drapeau :
  `WN_ENABLE_CONTRADICTIONS_NNPP2`, posé.
- **Énoncé proposé** :
- **Limite « outil »** :
- **Conclusion du responsable** (recenser, au moins pour écarter avec motif) :

### A10. Scoring des questionnaires et couverture des 12 besoins

- **Faits.**
  - Les bandes d'interprétation sont lues au catalogue (libellé, couleur
    facultative). La couverture de 0 à 100 et le niveau de preuve par besoin
    sont calculés (`api/praticien/besoins/route.ts`).
  - **Deux destinataires.** Le praticien les reçoit. Le patient reçoit, par
    `api/patient/equilibre/route.ts` (écran `MonEquilibreAccueil`), un indice
    global de 0 à 100, la couverture par besoin, le momentum et la
    trajectoire, **sans validation préalable du praticien**. Seul le niveau
    de preuve lui est masqué.
  - Aucun drapeau.
- **Limite « outil »** :
- **Conclusion du responsable** :

### A11. Sécurité : SAF-EI-01 et chaîne d'adressage médical

- **Faits.**
  - SAF-EI-01 : règle déterministe sur un effet indésirable déclaré et
    rattaché par le patient. Elle **n'est pas signée**
    (`validationExterne: false`) et l'interruption exige la signature
    (`safetyEffetIndesirableV1.ts:131-133`). Aujourd'hui, seule la capture
    tourne : la règle ne retient rien.
  - Adressage : table signée `safetySignalsV1`. La lettre consignée est la
    seule levée (`D-257` A7). Drapeaux `WN_ADRESSAGE_COURRIER`,
    `WN_LEVEE_ADRESSAGE` et `WN_LETTRE_ADRESSAGE_PATIENT` (lettre remise au
    patient).
- **À examiner.** Q4 : une retenue ou une orientation vers le médecin
  relève-t-elle de l'article 2(1) ?
- **Limite « outil »** :
- **Conclusion du responsable** :

### Question posée au responsable

Le panneau J21 (`J21DecisionPanel.tsx`) présente six libellés de décision et
un résumé « le score a-t-il bougé ». Lui faut-il une ligne en section A ? Le
suivi n'est couvert qu'en B (BP-20).

## B. Fonctions nouvelles de BIO-PARCOURS (une ligne avant toute ouverture)

Elles suivent le tableau du cadrage, §2. L'étage outil vise une ouverture
sans qualification. L'étage assistant n'ouvre qu'après sa ligne.

| Fonction | Étage outil (limite) | Étage assistant | Lots |
|---|---|---|---|
| Lecture biologique | restitution fidèle, faits du laboratoire tels qu'imprimés, aucun écart ni verdict | évaluateur par marqueur, constat proposé | BP-27 |
| Constat | posé par le praticien | pré-proposé par l'évaluateur | BP-11 |
| Examens | analytes de la question choisie ; demande contresignée hors outil | bilan sélectionné d'après le dossier | BP-04 |
| Options et dose | bibliothèque signée, toutes options affichées | classement par dossier, admissibilité calculée, alternatives | BP-17, BP-19 |
| Prescription | acte du praticien, figée, remise | — | BP-18a, BP-18b |
| Résultat préoccupant | marquage du laboratoire restitué, acte de lecture tracé, carte « geste » | cotation sur valeur | BP-10 |
| Suivi | historique factuel, marche 1, note du praticien | note d'impact générée, révision proposée | BP-20 |

Pour chaque ligne : énoncé de destination, Q1 à Q5, limite, conclusion du
responsable.

## Relecture du texte officiel (2026-10-07)

**Texte relu.** MDCG 2019-11 Rev.1, *Guidance on Qualification and
Classification of Software in Regulation (EU) 2017/745 – MDR and Regulation
(EU) 2017/746 – IVDR*, octobre 2019, révision 1 de juin 2025. PDF anglais
téléchargé le 2026-10-07 depuis le site de la Commission
(`health.ec.europa.eu`, fichier `mdcg_2019_11_en.pdf`), SHA-256
`ed60b2084a91648bf483eb6c33641e0635e51bfb9712f889124c279b1885f38d`. Le
document n'est pas juridiquement contraignant : seule la Cour de justice de
l'Union donne une interprétation qui lie (page de garde).

**Ce que la relecture corrige dans la trame.**

- L'arbre de la figure 1 a **cinq** étapes, pas quatre : l'étape 2 (annexe XVI,
  accessoire, logiciel qui pilote ou influence un dispositif) manquait. Elle
  est ajoutée en Q1b.
- Q4 et Q5 ne sont pas deux étapes du même arbre : Q4 est la dernière étape de
  la figure 1, Q5 résume la figure 2, qui ne se joue que si Q4 est oui.
- L'annexe I b ne vise pas seulement le logiciel qui « recommande un
  traitement ». Elle vise les recommandations de diagnostic, de pronostic, de
  surveillance **et** de traitement, pour un patient individuel, à
  destination des professionnels ou des utilisateurs.

**Principes transverses, à garder en tête sur chaque ligne.** Ce sont des
citations du texte ; aucune n'est appliquée ici à une fonction.

- **La destination déclarée compte.** « The intended purpose, as described by
  the manufacturer of the software is relevant for the qualification » (§3.1).
  Elle doit décrire toutes les fonctions qui servent une finalité médicale,
  sans ambiguïté, et toute revendication médicale doit être étayée par des
  preuves cliniques (§3, article 7 MDR et IVDR).
- **Le risque n'est pas un critère.** Le risque de nuire, panne comprise,
  « is not a criterion on whether the software qualifies as a medical
  device » (§3.1).
- **Bien-être.** Les applications « wellness or fitness » ne sont pas des
  logiciels dispositifs médicaux (§3.1). Mais le §3.2 range parmi eux un
  logiciel qui réagit à des données de régime et d'activité pour atténuer un
  trouble alimentaire : c'est la finalité qui décide, pas la donnée traitée.
- **Traiter de l'information médicale.** Un logiciel qui traite, analyse,
  interprète, calcule, crée ou modifie de l'information médicale « may be
  qualified » quand cette création est gouvernée par une finalité médicale
  (§3.1).
- **Modules (§7).** La qualification se fait module par module. C'est au
  fabricant de délimiter les modules et leurs interfaces, et de dire aux
  utilisateurs lesquels relèvent du MDR ou de l'IVDR. Les fonctions non
  médicales nécessaires au fonctionnement d'un module médical entrent dans
  sa description. La note « une ligne par fonction » suit ce découpage.

**Passages à confronter, par fonction.** Ce relevé renvoie au texte. Il ne
dit pas comment la fonction en sort.

| Fonction | Passages du guide |
|---|---|
| A1 Proposition de bilan | Annexe I b (aide à la décision : données du patient + algorithme → recommandation pour un patient) ; §3.2 note 4, exemple du module de dossier patient qui analyse les données d'un patient pour proposer des recommandations thérapeutiques ou des alertes ; Q3 pour le document remis au patient |
| A2 Orientation | Annexe I b ; §3.2 note 4, exemple du logiciel de dépression (questionnaires d'humeur et de symptômes, exercices choisis selon les réponses) |
| A3 Candidats de priorité, A4 Objectif | Annexe I b ; §3.1 (« process, analyse, interpret, calculate, create ») |
| A5 IA générative | Annexe I b ; §3.1 ; « axes prioritaires » et « points de vigilance » au regard de Q4 |
| A6 Relevé des comptes rendus | §2 : un document numérique (PDF, image) se distingue du logiciel capable de le lire ; annexe I f.1, note (modifier la représentation de résultats IVD disponibles n'est pas un dispositif IVD, à condition que les résultats restent lisibles et compréhensibles sans le logiciel) ; annexe I f.4 (transférer des résultats vers le professionnel n'est pas un dispositif IVD) |
| A7 Restitution | Annexe I f.1, note : ne relèvent pas de l'IVDR les opérations arithmétiques de base (moyenne, conversion d'unités), le tracé dans le temps et « a comparison of the result to the limits of acceptance **set by the user** ». Ici la plage est sourcée par l'outil et non fixée par l'utilisateur : point nommé, à examiner |
| A8 Assiettes, portes, fiches | §3.1 (bien-être) et §3.2 (exemple du trouble alimentaire) ; annexe I b pour les assiettes indiquées d'après les scores |
| A9 Contradictions | §3.1 ; Q3 et Q4 |
| A10 Scoring et couverture | §3.2 note 4 (logiciel utilisé par des profanes, exemple du logiciel de dépression qui évalue et suit par questionnaires) ; note 22 (un usage par des profanes ajoute des exigences : annexe I, points 22 et 23.4 w du MDR) |
| A11 Sécurité | Q4, article 2(1) du MDR (prévention, surveillance) ; §4.2.1 (règle 11, ajout de la révision 1 sur la prévention du risque de maladie), à lire si Q4 est oui |
| B, étage assistant biologique (BP-27, BP-11, BP-04) | Annexe I f.2, système expert : un logiciel qui fournit de l'information au sens de l'IVDR en analysant ensemble un ou plusieurs résultats in vitro d'un même patient ; figure 2, étapes 2 et 3, si la biologie est combinée aux questionnaires |
| B, Options et dose (BP-17, BP-19) | Annexe I b, systèmes de planification médicamenteuse (calcul de la dose pour un patient donné) |
| BIO-INGEST LOT-05, adaptateur laboratoire | Annexe I f.1 (systèmes d'information de laboratoire) et f.4 (transfert de résultats) ; Q1b |

## Ce que la trame laisse ouvert

- La lecture de MDCG 2019-11 Rev.1 que portait le cadrage a été **vérifiée
  sur le texte officiel le 2026-10-07** (section ci-dessus). L'arbre est
  corrigé, mais aucune ligne n'est tranchée.
- `REGISTRE_FRONTIERES.md` §1 affirme que la qualification de dispositif
  médical « s'évite par conception ». `D-266` §4 l'affirme pour l'étage outil,
  sous l'hypothèse de travail de §2. Les lignes B le confirment ou
  l'infirment ; les lignes A disent ce qu'il en est des fonctions déjà
  servies.
- L'étape « accessoire, ou logiciel qui pilote un dispositif » existe dans le
  texte (figure 1, étape 2). Elle est ajoutée en Q1b.
- La relecture n'a porté que sur la qualification (§1 à §3, §7, annexe I).
  La classification (§4 et §5, règle 11) n'est pas relue : elle ne se lit que
  si une ligne conclut à un dispositif.
- Contre-revue de la trame : faite le 2026-10-05 par `wn-reviewer` (7 P1 et
  9 P2 corrigés). Relecture du texte officiel de MDCG 2019-11 Rev.1 : faite
  le 2026-10-07.
