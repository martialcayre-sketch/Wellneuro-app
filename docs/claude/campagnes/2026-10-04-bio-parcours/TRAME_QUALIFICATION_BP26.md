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
2. **Arbre de décision.** MDCG 2019-11 Rev.1, §3, §3.4 et annexe I b. Le
   cadrage le cite ; **cette session n'a pas relu le texte officiel**. Les
   questions ci-dessous résument les étapes telles que le cadrage les invoque,
   et se vérifient sur le texte avant toute réponse :
   - Q1 — Est-ce un logiciel au sens du guide ?
   - Q2 — Le logiciel fait-il plus que stocker, archiver, communiquer,
     rechercher simplement ou compresser sans perte ?
   - Q3 — Ce traitement sert-il un patient individuel ?
   - Q4 — La finalité relève-t-elle de l'article 2(1) du MDR (diagnostic,
     prévention, surveillance, prédiction, pronostic, traitement ou atténuation
     d'une maladie…) ? L'annexe I b vise le logiciel qui recommande un
     traitement à un patient donné.
   - Q5 — L'information porte-t-elle sur des données issues de dispositifs de
     diagnostic in vitro, au sens de l'article 2(2) de l'IVDR (orientation
     IVDR plutôt que MDR) ?
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

## Ce que la trame laisse ouvert

- La lecture de MDCG 2019-11 Rev.1 est une **hypothèse de travail** du
  cadrage. Elle se vérifie sur le texte officiel avant la première réponse.
- `REGISTRE_FRONTIERES.md` §1 affirme que la qualification de dispositif
  médical « s'évite par conception ». `D-266` §4 l'affirme pour l'étage outil,
  sous l'hypothèse de travail de §2. Les lignes B le confirment ou
  l'infirment ; les lignes A disent ce qu'il en est des fonctions déjà
  servies.
- L'arbre Q1 à Q5 n'a pas d'étape « accessoire, ou logiciel qui pilote un
  dispositif ». À vérifier en relisant le texte officiel.
- Contre-revue de la trame : faite le 2026-10-05 par `wn-reviewer` (7 P1 et
  9 P2 corrigés). La relecture du texte officiel de MDCG 2019-11 Rev.1 reste
  à faire.
