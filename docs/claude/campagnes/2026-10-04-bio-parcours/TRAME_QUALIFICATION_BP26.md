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
     dispositif matériel ? Si oui, il est traité dans le processus
     réglementaire de ce dispositif, ou de façon indépendante s'il en est un
     accessoire. Figure 1, étape 2.
   - Q2 — Le logiciel fait-il plus que stocker, archiver, communiquer,
     rechercher simplement ou compresser sans perte ? Figure 1, étape 3 ; §3.1.
   - Q3 — Ce traitement sert-il un patient individuel ? Ne le servent pas :
     l'agrégation de données de population, les parcours génériques non
     dirigés vers un patient, la littérature, les atlas, modèles et gabarits,
     ainsi que les logiciels destinés seulement aux études épidémiologiques ou
     aux registres. Figure 1, étape 4.
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

Chaque ligne porte les mêmes champs : faits (avec fichier), énoncé proposé
(rédigé d'après le code, ou « à rédiger »), limite « outil » et conclusion
du responsable (dans le tableau des fonctions, ou en champ unique quand la
ligne n'a qu'une fonction). Le champ « À examiner » n'apparaît que lorsqu'un
point a été relevé. Les champs vides le sont à dessein : la trame ne propose
aucune voie à la place du responsable.

**Une fonction par rangée** (§7 du guide, qualification module par module).
Une ligne qui réunit plusieurs fonctions porte un tableau : une rangée par
fonction, avec son destinataire, sa limite « outil » et la conclusion du
responsable. Les faits restent communs à la ligne.

### A1. Proposition de bilan biologique

- **Faits.**
  - Table `indicationsBiologieV1.ts` : 15 règles signées, déterministes, sans
    IA. Elles se répartissent en 12 `conditionnel`, 1 `optionnel` et 2
    `non_indique_actuellement` ; aucune n'est `recommande`.
  - Entrées : zones des questionnaires (17 déclencheurs) et un score comparé
    à un seuil (MADRS ≥ 8, `BIO-HUM-01`), panels déjà documentés. Les
    drapeaux d'anamnèse de la consultation porteuse sont transmis au moteur
    (`propositionService.ts:217-219`), mais aucune des 15 règles ne s'en sert
    aujourd'hui. Les deux règles de population (`BIO-POP-01`, `BIO-POP-02`)
    n'ont pas de déclencheur : elles s'affichent en conditionnel non rempli, à
    l'appréciation du praticien.
  - Sortie **par panel**, analytes listés dans la ligne
    (`statuts.ts:73-94`). Six statuts (`vocabulaireStatuts.ts:25-31`) :
    `recommande`, `optionnel`,
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
    et `WN_CB_PROPOSITION` (posé sur Vercel le 2026-08-18,
    `docs/FEATURE_FLAGS.md:27` et handoff
    `2026-08-18-1300-lot06-drapeau-pose-et-porte.md` ; dit vrai en
    production le 2026-08-24, `D-104` ; aucune relecture Scalingo consignée).
- **Énoncé proposé.** « Proposer au praticien, d'après les réponses et
  l'anamnèse d'un patient, des panels d'examens biologiques à envisager, avec
  leur motif, à faire prescrire par un médecin. »
- **À examiner.** La proposition est calculée sur les données d'un patient
  (Q3, Q4). Le document patient est remis au patient (Q3, Q4).
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Proposition de panels | praticien | | |
| Courrier au médecin, remis à la main | médecin, par le praticien | | |
| Document remis au patient | patient, par le praticien | | |

### A2. Orientation (questionnaires et packs à proposer)

- **Faits.**
  - `orientationRulesV1.ts` : 20 règles signées, sans IA. Les déclencheurs se
    combinent en conjonction, avec des disjonctions `ou` (`D-060`,
    `orientationRulesV1.ts:180-202`).
  - Une suggestion vise un questionnaire ou un pack. La route dit « rien
    n'est jamais auto-assigné ».
  - Un constat ouvert du registre des contradictions (A9) n'exclut rien : il
    empêche les règles d'arrêt d'éteindre une exploration
    (`orientationEngine.ts:1527-1528`, `D-053` §5, `D-055`). L'exclusion des
    instruments déjà renseignés relève des règles d'arrêt (exclusion
    `dejaRepondu`, `orientationEngine.ts:1341`).
  - Drapeau : `WN_ENABLE_ORIENTATION_NNPP2`, posé.
  - **Règles d'arrêt** (`stopRulesV1.ts`, créées par `D-053`, signées le
    2026-08-15 par `D-061`). Elles éteignent des explorations et excluent des
    instruments : « La table d'orientation propose ; celle-ci retient »
    (`:7-9`). Pas de drapeau à elles : elles suivent le drapeau des
    contradictions depuis `D-065` (`docs/FEATURE_FLAGS.md:276-279`).
- **Énoncé proposé.** « Suggérer au praticien les questionnaires ou les packs
  à faire remplir, d'après les scores et l'anamnèse du patient. » Règles
  d'arrêt : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Orientation (suggestions) | praticien | | |
| Règles d'arrêt (extinctions, exclusions) | praticien | | |

### A3. Candidats de priorité (moteur de priorité)

- **Faits.** `priorityRulesV1.ts` : 4 règles publiées et signées
  (`PRIO-DIG-01`, `PRIO-PON-01`, `PRIO-SOM-01`, `PRIO-DOU-01` ; signature du
  2026-08-28), plus 3 règles écartées avec motif (`PRIO-STR`, `PRIO-FAT`,
  `PRIO-MOB`) qui ne sont pas servies. La procédure d'abstention entre dans
  le périmètre signé. Les règles publiées sont servies par
  `api/praticien/cockpit/route.ts` **sans drapeau**, sous la seule
  signature. Elles fournissent les candidats de la carte de décision ; le
  praticien retient une priorité, motif écrit.
  - **Classement des candidats** (plainte dominante, puis priorité
    intrinsèque, puis identifiant) : codé dans `chaineC1.ts:549`, hors de la
    signature de `priorityRulesV1.ts`. Son périmètre descriptif
    (`perimetreClassementV1.ts`) a été attesté par le responsable le
    2026-09-16 (`ATTESTATION_CLASSEMENT`, `:372-389`), pour la fidélité
    descriptive seulement et non pour la légitimité clinique de l'ordre.
    L'écran affiche cette attestation (`DecisionSummaryCard.tsx:276`). Voir
    `D-162` §5.
  - **Gate de population** (`gatePopulationV1.ts`, non signée) : sa table de
    curation est **vide** ; elle n'écarte aucun candidat, et chaque candidat
    porte le motif « exclusions non curées », servi au praticien (`:10-16`,
    `DC-35`).
- **Énoncé proposé.** « Présenter au praticien les priorités d'accompagnement
  candidates pour un patient, chacune issue d'une règle signée. »
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Candidats issus des règles signées | praticien | | |
| Classement des candidats | praticien | | |
| Motif « exclusions non curées » (gate de population) | praticien | | |

### A4. Proposition d'objectif

- **Faits.** Route `api/praticien/propositions-objectif/route.ts`, machine
  déterministe distincte de l'usage IA de A5. Elle assemble des propositions
  d'objectif à partir de la plainte dominante, des candidats signés et de
  l'anamnèse lue en base. Drapeau : `WN_OBJECTIF_PROPOSE`, posé (`D-154`),
  relu `true` le 2026-09-11.
  - Destinataire : le praticien. Une proposition reprise devient un objectif
    négocié, présenté au patient (`D-154`, `WN_DOSSIER_DEUX_VOIX`).
  - Périmètre : tous les dossiers (`WN_OBJECTIF_PROPOSE_PATIENTS` absent,
    `docs/FEATURE_FLAGS.md:100`).
  - Plainte et candidats viennent du cockpit ; la route confronte le
    périmètre au registre signé et en recopie le texte (`D-115`,
    `propositions-objectif/route.ts:23-48` et `:68-76`).
- **Énoncé proposé** :
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Propositions d'objectif (assemblage déterministe) | praticien | | |
| Proposition reprise en objectif négocié | patient, après reprise par le praticien (`WN_DOSSIER_DEUX_VOIX`) | | |

### A5. Usages de l'IA générative au dossier

Ces usages sont déclarés au patient dans `usage_ia` (v3 du 2026-09-30,
repris sans changement jusqu'à la v6 courante du 2026-10-07) :

- **Synthèse** : brouillon structuré (résumé, axes prioritaires, points de
  vigilance, questions d'entretien, narratif patient, limites).
- **Proposition de priorité** : une formulation de 200 caractères au plus.
- **« Ce que j'ai compris de vous »** : premier jet, que le praticien doit
  réécrire.

Pour ces trois usages, le praticien valide avant que le patient ne voie quoi
que ce soit. Cela ne vaut pas pour A10.

Le corpus clinique signé est injecté dans le prompt de synthèse sous
`WN_ENABLE_CORPUS_CLINIQUE_V1`, posé en production le 2026-08-22
(`lib/anthropic.ts:345-346` pour la condition, drapeau et signature ;
`:607-608` pour l'injection ; `D-082`, `D-084`).

- **Énoncé proposé** (une ligne par usage) :
- **À examiner.** « Axes prioritaires » et « points de vigilance » au regard
  de Q4.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Synthèse (avec corpus injecté si le drapeau est posé et la signature valide) | praticien, puis patient après validation | | |
| Proposition de priorité | praticien, puis patient après validation (texte accepté tel quel ou réécrit) | | |
| « Ce que j'ai compris de vous » | praticien, puis patient après réécriture | | |

### A6. Relevé des comptes rendus biologiques (BIO-INGEST)

- **Faits.**
  - Le PDF ou l'image part entier chez Anthropic. Le modèle relève libellé,
    valeur, unité, date et page, et aussi l'intervalle et la marque imprimés,
    verbatim (`D-267`). Le procédé en service est `bio-extraction-v3`
    (`lib/biology-library/import/extraction.ts:38`), qui reprend inchangés le
    prompt et le schéma de la v2 (`:33-36`).
  - Le praticien décide chaque ligne, dont certaines arrivent
    pré-positionnées. Aucune unité n'est convertie, aucune valeur n'est
    qualifiée.
  - L'analyte n'est pas choisi par le modèle : un resolver signé, déterministe,
    en propose un quand il ne reste qu'un candidat (`resolverLibellesV1.ts`,
    signé par `D-259`, re-signé en dernier par `D-263` le 2026-10-03 ;
    départage par l'unité, `D-263`). Le praticien décide.
  - Une ligne rapprochée par le resolver et sans écart s'ouvre sur
    « Valider », repliée parmi les lignes prêtes (`D-260` §3,
    `ImportCompteRenduPanel.tsx:178-179` et `:646`). Rien ne part sans
    « Enregistrer les décisions », qui envoie tout ou rien (`D-270` §4).
  - Quand une ligne porte la même mesure dans une seconde unité et que sa
    jumelle part validée, « Écarter » est pré-coché, avec son motif (`D-270`).
    Le praticien peut changer ce choix.
  - Drapeau : `WN_BIO_INGEST_ENABLED`, posé le 2026-10-03 à 06:30 UTC
    (fiche LOT-02 de BIO-INGEST, `LOT-02-staging-et-pdf.md:118` ;
    `docs/FEATURE_FLAGS.md:443` ne porte que la date de création éteinte).
  - La transmission du compte rendu par le patient a sa ligne (A13).
- **Énoncé proposé.** « Transcrire, pour validation par le praticien, les
  résultats imprimés sur un compte rendu de laboratoire. »
- **À examiner.** Q2 : ce traitement dépasse-t-il la communication ? Q5 : ce
  sont des résultats de laboratoire imprimés, à confronter à l'article 2(2)
  de l'IVDR.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Extraction par IA (relevé verbatim) | praticien, pour validation | | |
| Resolver signé (analyte proposé) | praticien, pour validation | | |
| « Écarter » pré-coché sur la seconde unité (`D-270`) | praticien | | |

### A7. Restitution des résultats biologiques

- **Faits.** `EstimeMesurePanel` affiche la série et la plage fonctionnelle
  sourcée, juxtaposée seulement si l'unité est la même. Il ne calcule aucun
  écart, n'affiche aucune couleur d'état, ne pose aucun verdict (`D-122`,
  `D-157`). Pas de surface patient. Drapeau : `WN_CB_RESULTS_ENABLED`.
  - **Faits du laboratoire** (`D-267`) : `FaitsDuLaboratoire`, monté dans
    `EstimeMesurePanel.tsx:560`, juxtapose au résultat l'intervalle et la
    marque **tels qu'imprimés**, attribués au laboratoire. Ni statut, ni
    couleur, ni tri, ni comparaison à la valeur
    (`components/patient-cockpit/FaitsDuLaboratoire.tsx:1-4`).
  - L'acte de lecture d'un import validé a sa ligne (A12).
- **Énoncé proposé.** « Présenter au praticien les résultats enregistrés d'un
  patient, à côté des plages publiées et sourcées, sans les interpréter. »
  Faits du laboratoire : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Série et plage fonctionnelle sourcée | praticien | | |
| Faits du laboratoire (intervalle et marque imprimés) | praticien | | |

### A8. Assiettes indiquées, portes biologiques, fiches d'assiette

- **Faits.**
  - Assiettes indiquées : table signée, déclencheurs sur scores et anamnèse,
    sans IA (`indicationsAssiettesV1.ts`). Drapeau `WN_ASSIETTES_INDIQUEES`.
  - Portes biologiques : table signée, sans aucun nombre. Elles juxtaposent
    les claims du corpus et le dernier résultat ; aucune indication
    (`portesBiologiquesService.ts`).
  - Fiches d'assiette : texte adapté par IA (Anthropic rédige, OpenAI relit),
    une fois pour toutes et sans donnée patient, relu en entier et validé par
    le praticien responsable, remis au clic. Drapeaux `WN_FICHES_ASSIETTE` et
    `WN_FICHES_ASSIETTE_LECTURE`.
  - Hiérarchisation des assiettes indiquées (`D-254`, 2026-09-30) : classement
    par dossier, la priorité visée d'abord (selon `BESOIN_SOURCES`), puis la
    convergence (nombre de voies atteintes), puis l'ordre de la table. Aucun
    drapeau neuf.
  - Catalogue de conduites (`catalogueConduitesV1.ts`) : table signée le
    2026-09-17, trois lignes ; elle alimente les assiettes, les portes et la
    sécurité des fiches.
  - Replis d'assiette (`replisAssietteV1.ts`) : métadonnée non signée, aucune
    ligne (`:77` pour la table vide, `:102-113` pour la métadonnée).
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Assiettes indiquées | praticien | | |
| Hiérarchisation des assiettes (`D-254`) | praticien | | |
| Portes biologiques | praticien | | |
| Fiches d'assiette | praticien, puis patient au clic | | |
| Catalogue de conduites | praticien | | |
| Replis d'assiette (table vide) | — | | |

### A9. Registre des contradictions (`C-STR`) et conflits de sources

- **Faits.**
  - Registre signé qui produit des constats sur le dossier. Une
    contradiction ouverte empêche les règles d'arrêt d'éteindre une
    proposition d'orientation (A2) ; elle n'exclut aucune cible. Le drapeau
    des contradictions conditionne en outre la table d'arrêt tout entière
    (`D-065`). Drapeau : `WN_ENABLE_CONTRADICTIONS_NNPP2`, posé.
  - Les discordances ouvertes entrent aussi dans le prompt de synthèse (A5)
    et dans la garde de restitution (`contradictionsService.ts:468-475` et
    `:486`, consommées par `lib/synthese/generation.ts`).
  - Conflits de sources (`conflitsSourcesV1.ts`, `DC-54`, livraison non
    signée `D-103`) : un conflit déclaré et publié, `CS-BIO-01`. Deux couples
    écartés avec motif, qui ne produisent aucun constat : `CS-MAG-01` et
    `CS-MAG-02` (`CONFLITS_SOURCES_ECARTES_V1`). Registre curé à la main,
    signé le 2026-08-24 (`D-104`, `:279-280`). Il produit des constats de
    vigilance sur le dossier : verrou et production dans
    `contradictionsService.ts:88-108`, fusion aux constats du dossier en
    `:375`. Le même drapeau `WN_ENABLE_CONTRADICTIONS_NNPP2` gouverne les deux
    registres.
- **Énoncé proposé** :
- **Fonctions de la ligne** (recenser, au moins pour écarter avec motif).

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Contradictions `C-STR` | praticien ; entre dans le prompt de synthèse (A5) et dans la garde de restitution | | |
| Conflits de sources | praticien | | |

### A10. Scoring des questionnaires et couverture des 12 besoins

- **Faits.**
  - Les bandes d'interprétation sont lues au catalogue (libellé, couleur
    facultative). La couverture de 0 à 100 et le niveau de preuve par besoin
    sont calculés par `lib/equilibre/score.ts` et `evidence.ts`, servis par
    `api/praticien/besoins/route.ts`.
  - **Deux destinataires.** Le praticien les reçoit. Le patient reçoit, par
    `api/patient/equilibre/route.ts` (écrans `MonEquilibreAccueil` et
    `MonEquilibreDetail`, affichés dès que les réponses sont transmises), un indice
    global de 0 à 100, la couverture par besoin, le momentum et la
    trajectoire, **sans validation préalable du praticien**. Seul le niveau
    de preuve lui est masqué.
  - Objets cliniques du praticien (`lib/equilibre/objetsCliniques.ts`), dont
    « Stabilité métabolique », une moyenne dédiée (hyperexcitabilité et
    magnésium), distincte du besoin 4 (`:13-15`). Ils sont aussi versés dans
    l'instantané clinique de la chaîne C1 (`clinicalSnapshot.ts:167` et
    `:222`, A3) ; consommation aval au-delà de l'instantané à vérifier.
  - Mini-synthèse par questionnaire (`lib/scoring/miniSynthese.ts`) :
    « Sévérité déduite de la couleur d'interprétation » (`:8`). Elle est lue
    par la fiche, l'inbox, l'export et le prompt de synthèse.
  - L'indice de l'agenda du sommeil a sa ligne (A17) ; la réponse qu'il
    produit entre dans ce scoring.
  - Aucun drapeau.
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Scoring des questionnaires (bandes du catalogue) | praticien | | |
| Couverture et niveau de preuve par besoin | praticien | | |
| Mon équilibre (indice, couverture, momentum, trajectoire) | patient, sans validation préalable | | |
| Objets cliniques, dont « Stabilité métabolique » | praticien ; versé dans l'instantané clinique de la chaîne C1 (A3) | | |
| Mini-synthèse par questionnaire | praticien ; entre dans le prompt de synthèse (A5) | | |

### A11. Sécurité : SAF-EI-01 et chaîne d'adressage médical

- **Faits.**
  - SAF-EI-01 : règle déterministe sur un effet indésirable déclaré et
    rattaché par le patient. Elle **n'est pas signée**
    (`validationExterne: false`) et l'interruption exige le drapeau
    `WN_EI_INTERRUPTION` ET la signature
    (`safetyEffetIndesirableV1.ts:132-134`). Drapeau posé le 2026-08-23
    (handoff `2026-08-23-2329-release-db-interblocage-d102.md:80`, non
    reporté dans `docs/FEATURE_FLAGS.md`) : seule la capture tourne, la règle
    ne retient rien.
  - Adressage : table signée `safetySignalsV1`. La lettre consignée est la
    seule levée (`D-257` A7). Drapeaux `WN_ADRESSAGE_COURRIER`,
    `WN_LEVEE_ADRESSAGE` et `WN_LETTRE_ADRESSAGE_PATIENT` (lettre remise au
    patient).
  - Producteur de constats de sécurité sur les signaux d'anamnèse
    (`lib/clinical-engine/safetyFindings.ts`, `D-099`) : il alimente
    `safetyFindings`, et la carte de décision se bloque dès qu'un constat non
    couvert par une lettre consignée existe (`decisionCard.ts:112`,
    `chaineC1.ts:434-457`) ; un constat adressé reste porté par la carte sans
    bloquer. Il sert aussi la route du courrier d'adressage.
  - Dès qu'au moins un constat est adressé, le protocole doit s'ouvrir sur
    l'orientation vers le médecin (`D-257` §8) ; sinon il est refusé. Hors
    levée, l'action réservée est refusée. Le moteur ne la compose pas
    (`protocolDraft.ts:212-219`).
- **À examiner.** Q4 : une retenue ou une orientation vers le médecin
  relève-t-elle de l'article 2(1) ?
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Déclaration d'un effet indésirable (capture) | patient (saisie au portail), praticien | | |
| SAF-EI-01 (règle non signée, capture seule) | praticien | | |
| Constats de sécurité sur les signaux d'anamnèse | praticien | | |
| Lettre au médecin (`WN_ADRESSAGE_COURRIER`) | médecin, par le praticien | | |
| Levée par la lettre consignée (`WN_LEVEE_ADRESSAGE`) | praticien | | |
| Lettre remise au patient (`WN_LETTRE_ADRESSAGE_PATIENT`) | patient, par le praticien | | |
| Orientation exigée dans le protocole | praticien, puis patient | | |

### A12. Acte de lecture d'un import biologique validé (BP-10)

- **Faits.**
  - Une carte du Fil sous trois formes (lignes à décider, lecture à consigner
    à nouveau, compte rendu à lire), non écartable
    (`lib/fil/cartes.ts:690-750`).
  - Un acte de lecture et sa révocation, à codes fermés
    (`lib/biology-library/import/lectureImport.ts`, `D-268`), route
    `api/praticien/biologie/import/lecture`. Le module ne lit aucune valeur et
    « ne juge pas de ce qui est préoccupant » : le déclencheur est l'import
    validé, pas le marquage (`:6-9`).
  - Drapeau : `WN_BIO_LECTURE_ENABLED`, posé en production le 2026-10-06 à
    22:12 UTC ; il exige aussi `WN_BIO_INGEST_ENABLED`
    (`isBioLectureEnabled`, `featureFlag.ts:103-109`).
  - Destinataire : le praticien.
  - Servie : oui, constat en agrégats du 2026-10-07
    (`CONSTAT_USAGE_BP10_2026-10-07.md`).
- **Énoncé proposé** :
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Carte du Fil (trois formes, non écartable) | praticien | | |
| Acte de lecture et sa révocation | praticien | | |

### A13. Transmission d'un compte rendu par le patient (BIO-INGEST LOT-04)

- **Faits.**
  - Le patient dépose un document depuis son portail
    (`api/portail/comptes-rendus/route.ts`, `D-269`). Le dépôt n'appelle pas
    l'IA.
  - Côté praticien, une carte du Fil « Compte rendu transmis par le patient »
    (`lib/fil/cartes.ts:759-793`) ; le praticien regarde le document avant de
    lancer la lecture (A6).
  - Drapeaux : `WN_BIO_PORTAIL_ENABLED` (surface patient : page, route
    `api/portail/comptes-rendus`, lien du hub), posé en production le
    2026-10-07 à 17:53 UTC. La carte du Fil, « Voir le document » et
    « Écarter » côté praticien restent sous `WN_BIO_INGEST_ENABLED`, et
    survivent à une extinction du portail (`api/praticien/fil/route.ts:319-325`,
    `docs/FEATURE_FLAGS.md:445`).
  - Destinataires : le patient (dépôt et statuts), puis le praticien.
- **Énoncé proposé** :
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Dépôt et statuts au portail | patient | | |
| Carte du Fil, « Voir le document », « Écarter » | praticien | | |

### A14. Protocole 21 jours : construction, diffusion, vue patient

- **Faits.**
  - Le praticien construit le protocole : trois interventions au plus, plus
    l'orientation vers le médecin quand elle est exigée (hors borne, A11), phases,
    attentes biologiques, intention de complément par référence au
    catalogue, sans dose en texte libre (`lib/clinical-engine/protocolDraft.ts`).
  - La validation « pour diffusion » (`api/praticien/protocoles/diffusion`)
    ouvre la vue patient, dérivée par `contenuPatientProtocole.ts` et servie
    par `api/portail/protocole`.
  - Drapeau : aucun sur la vue patient (seule la boussole C5 y est gardée,
    A20).
  - Destinataires : le praticien, puis le patient.
  - Servie : oui, constat en agrégats du 2026-10-05 ; le service effectif au
    portail n'est pas vérifié (`CONSTAT_USAGE_2026-10-05.md`).
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Construction du protocole | praticien | | |
| Diffusion et vue patient | patient, après validation | | |

### A15. Check-ins J7/J14/J21 et résumé J21

- **Faits.**
  - Le patient répond au portail (`api/portail/protocole/checkin`) : quatre
    questions gelées, plus une question d'observance des compléments, avec un
    motif facultatif, posée seulement si une recommandation de complément figure au protocole actif
    (`lib/protocol/checkinDomain.ts`). Aucun score, aucun pourcentage
    d'observance.
  - Le praticien lit le résumé J21, « point de jonction » qui croise le
    momentum et les check-ins, en lecture seule
    (`lib/protocol/resumeJ21.ts:11-16`, `api/praticien/protocoles/checkins`).
    Le panneau J21 (`J21DecisionPanel.tsx`) consomme ce résumé.
  - Drapeau : aucun.
  - Servie, en agrégats au 2026-10-05 : 0 check-in reçu.
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Check-ins | patient (saisie), praticien (lecture) | | |
| Résumé J21 | praticien | | |

### A16. Calendrier de suivi et jalons

- **Faits.**
  - Le jour 0 d'un cycle est la première diffusion de son protocole ; seul un
    pivot (priorité changée) relance le calendrier
    (`lib/protocol/calendrierSuivi.ts:4-16`, `D-255`).
  - Le module dit quelle étape le patient peut renseigner
    (`lib/protocol/jalonObjectifDu.ts`, `D-111`).
  - Drapeau : aucun.
  - Destinataires : le patient et le praticien.
- **Énoncé proposé** :
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Calendrier de suivi (jour 0, pivot) | patient et praticien | | |
| Étape renseignable (`jalonObjectifDu`) | patient et praticien | | |

### A17. Agenda du sommeil (`Q_SOM_09`)

- **Faits.**
  - Le patient note ses nuits au portail (`api/portail/agenda-sommeil`).
  - La clôture est le « chemin UNIQUE de production des agrégats et du
    score » (`lib/agenda-sommeil/cloture.ts:12-13`). Elle calcule un indice
    composite sur 100 : « Indice longitudinal WellNeuro — non diagnostique
    (niveau de preuve D) », quatre sous-indices (durée, efficacité,
    régularité, qualité vécue) (`lib/questionnaires/sommeil.ts:250-262`).
  - Destinataires : le patient saisit ; son rappel ne montre aucun score,
    seulement la frise et « X nuits notées sur 21 »
    (`lib/agenda-sommeil/rappelPortail.ts`). Le praticien voit l'indice ; la
    réponse produite entre dans le scoring (A10).
  - Drapeaux : aucun sur l'écriture patient. Relance praticien par e-mail au
    clic, sous `WN_AGENDA_RELANCE` (`docs/FEATURE_FLAGS.md:39`) : présente
    mais illisible sur Vercel le 2026-08-19
    (`changelog.d/2026-08-19-gestes-drapeaux-lecture-production.md:7-10`),
    état Scalingo non consigné, à relire par `env` en conteneur avant la
    note.
- **Énoncé proposé** :
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Saisie des nuits et rappel (sans score) | patient | | |
| Indice composite sur 100 (clôture) | praticien ; la réponse entre dans le scoring (A10) | | |
| Relance par e-mail (`WN_AGENDA_RELANCE`) | patient, au geste du praticien | | |

### A18. Agenda alimentaire (`Q_ALI_09`) et discordance de rythme

- **Faits.**
  - La clôture transmet les agrégats en pseudo-items `AGA_*`, sans poids, sans
    seuil, sans score (`lib/agenda-alimentaire/cloture.ts:12-24`, `D-039`).
  - La discordance (`D-040`) lève un drapeau directionnel de sur-déclaration,
    pour le praticien seul : un axe ne se lève que si le patient déclare
    favorable et que l'agenda observe défavorable
    (`lib/equilibre/discordanceRythme.ts:6-16`), affiché dans
    `AgendaAlimentairePraticienPanel.tsx`.
  - Drapeau : `WN_AGENDA_ALI`, posé le 2026-08-05, relu `true` le 2026-09-11.
    Il ferme l'écriture patient, pas la relecture praticien.
  - Destinataires : le patient (saisie), le praticien (agrégats, drapeau de
    discordance).
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Agenda alimentaire (agrégats) | patient (saisie), praticien | | |
| Discordance de rythme (`D-040`) | praticien | | |

### A19. Journal alimentaire (JA)

- **Faits.**
  - Le patient note ses traces d'action et ses frictions
    (`api/portail/ja/observations`, page `portail/[token]/alimentation`).
  - Un compte de faisabilité est dérivé à la lecture du dernier brouillon JA
    relu par le praticien (`feasibilityRepository.ts:8-20`). Sa seule
    surface, l'observatoire Boussole praticien, n'est plus montée depuis
    `D-250` (2026-09-26) : non servi.
  - Le patient reçoit un retour du praticien : `feedbackPatient`,
    `deltaDecision`, `chargePercue`, `budgetChargeGlobal`
    (`api/portail/ja/decision/route.ts`).
  - Drapeau : aucun dans les routes JA.
  - Constat en agrégats du 2026-10-05 : aucun brouillon JA relu
    (`CONSTAT_USAGE_2026-10-05.md`).
- **Énoncé proposé** :
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Traces d'action et frictions | patient (saisie), praticien | | |
| Compte de faisabilité (non servi) | — | | |
| Retour du praticien au patient | patient | | |

### A20. Boussole alimentaire côté patient (C5)

- **Faits.**
  - Une vue d'aliment est servie au patient si une action du protocole
    diffusé porte un `foodCompassRef` (`api/portail/boussole/[foodRef]`).
  - Drapeau : `WN_C5_ENABLED`, non éteint (`D-250`).
  - Au 2026-09-26, aucun protocole 21 jours, donc aucun `foodCompassRef`
    (`D-250` §4) ; non recompté depuis les diffusions V4 du constat du
    2026-10-05. L'API d'insertion du constructeur reste en place (`D-250` §3).
- **Énoncé proposé** :
- **Limite « outil »** :
- **Conclusion du responsable** :

### A21. Rayon compléments (C4)

- **Faits.**
  - Moteur « compléments avant biologie »
    (`lib/supplement-library/decisionAvantBiologie.ts`, `D-056`) : verdict
    motivé, l'absence d'information vaut refus. Il est appelé par la
    prévisualisation de l'atelier de règles
    (`api/praticien/regles/previsualisation`), sans dossier.
  - Critères constatés sur un dossier par le praticien
    (`api/praticien/criteres-dossier`).
  - Sentinelle de cumul et de seuils (`sentinelle.ts`, appelée par
    `catalogue.ts`) : jamais de somme ni de maximum automatique des doses ;
    le praticien arbitre.
  - Question d'observance des compléments dans les check-ins (A15).
  - Drapeau : `WN_C4_ENABLED`, à `true` (`D-140`, lecture du 2026-09-07 ;
    constat du 2026-10-05).
  - Servie, en agrégats au 2026-10-05 : `clinical_rules` compte 0 ligne.
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Moteur « compléments avant biologie » (prévisualisation) | praticien | | |
| Critères constatés sur un dossier | praticien | | |
| Sentinelle de cumul | praticien | | |

### A22. Barème de charge thérapeutique et table du repli

- **Faits.**
  - Le barème suggère un niveau de charge pendant que le praticien compose le
    protocole (`lib/clinical/baremeChargeV1.ts`). Table signée le 2026-09-15,
    servie par `api/praticien/protocoles/versions/route.ts:760`.
  - La table du repli (`lib/clinical/tableRepliV1.ts`) constate combien
    d'actions répètent le même texte en plan idéal et en plan minimal.
    Contenu attesté le 2026-09-17, verrou armé. Aucun importeur dans
    `web/src` (relevé du 2026-10-08 ; `tableRepliV1.ts:124-127` le dit) : la
    table n'atteint aucun écran.
  - Drapeau : aucun, seulement la signature.
  - Destinataire : le praticien pour le barème ; aucun pour la table du
    repli (non servie).
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Barème de charge | praticien | | |
| Table du repli (aucun appelant) | — | | |

### A23. Trajectoire et suivi côté praticien

- **Faits.**
  - Fiche-trajectoire, momentum par besoin et comparateur multi-épisodes
    (`lib/protocol/trajectoire.ts`).
  - Mode de vie sur 7 domaines, zones lues au catalogue
    (`lib/equilibre/modeVie.ts`).
  - Repère de cabinet : médiane des momentums par jalon sur les cycles du
    cabinet, juxtaposée au dossier ; médianes et effectifs seulement, aucune
    donnée individuelle d'un autre patient
    (`api/praticien/cabinet-momentum/route.ts`).
  - Repassation ciblée : les questionnaires à refaire au jalon, dérivés des
    besoins qui fondent la priorité (`lib/protocol/repassationCiblee.ts`,
    `D-058`).
  - Météo d'adhésion à trois états, dérivée à la lecture des check-ins, non
    persistée (`lib/protocol/adhesion.ts`).
  - Vue « intentions → épisodes » (`lib/protocol/trajectoireIntentions.ts`).
  - Momentum J21 sur la carte jalon du Fil (`lib/fil/momentumJ21.ts`).
  - Drapeau : aucun.
  - Destinataire : le praticien. La version patient est en A10.
- **Énoncé proposé** : à rédiger.
- **Fonctions de la ligne.**

| Fonction | Destinataire | Limite « outil » | Conclusion du responsable |
|---|---|---|---|
| Fiche-trajectoire et momentum par besoin | praticien | | |
| Mode de vie (7 domaines) | praticien | | |
| Repère de cabinet | praticien | | |
| Repassation ciblée | praticien | | |
| Météo d'adhésion | praticien | | |
| Intentions → épisodes | praticien | | |
| Momentum J21 (carte jalon) | praticien | | |

### A24. Pack de réévaluation proposé au patient

- **Faits.** Après une longue absence, le portail propose au patient de
  refaire un pack. Proposé, jamais assigné ; refusable sans conséquence
  (`lib/patient/packReevaluation.ts`, `api/portail/pack-reevaluation`).
  Drapeau : aucun. Destinataire : le patient.
- **Énoncé proposé** :
- **Limite « outil »** :
- **Conclusion du responsable** :

### A25. Fonctions à recenser pour être écartées avec motif

Faits, drapeau et destinataire seulement. Le motif d'écart revient au
responsable.

| Fonction | Faits | Drapeau | Destinataire | Motif d'écart (responsable) |
|---|---|---|---|---|
| Export PDF du dossier | pour un outil d'IA externe, version pseudonymisée par défaut (`api/praticien/export-dossier`, `D-252`) | aucun | praticien | |
| Fil du jour patient et lectures attendues | `lib/portail/filDuJour.ts`, `api/portail/lectures` (en service au déploiement) | pas de drapeau propre ; chaque lecture suit le drapeau de sa surface : `WN_COMPREHENSION`, `WN_FICHES_ASSIETTE_LECTURE`, `WN_LETTRE_ADRESSAGE_PATIENT` (`api/portail/lectures/route.ts:132`, `:165`, `:175`) | patient | |
| Rappel d'un questionnaire non revenu | courrier de rappel au patient | `WN_RELANCE_QUESTIONNAIRE`, posé le 2026-09-12 | patient, au geste du praticien | |
| Échéance obligatoire | refuse une assignation sans échéance sur un dossier qui porte une synthèse validée | `WN_ECHEANCE_OBLIGATOIRE`, posé le 2026-09-12 | praticien | |
| Pré-vol du copilote | ce qui a changé depuis la consultation précédente ; questions suggérées, chacune fondée sur un fait de la liste (`lib/copilote/prevol.ts`) | aucun | praticien | |
| Préconditions T0 | `lib/clinical-engine/preconditionsT0.ts` (`D-052`) | aucun | praticien | |
| Validité des passations | les passations invalides, remplacées ou historiques sortent du raisonnement | `WN_ENABLE_VALIDITE_PASSATIONS`, posé le 2026-08-19 | praticien | |
| Bilan transmis au patient | `api/portail/bilan` | aucun | patient | |
| Tâche planifiée | une seule : la purge des comptes rendus (`web/cron.json`, `bio:purge-echeance`) | — | — | |

### Question posée au responsable

Le panneau J21 (`J21DecisionPanel.tsx`) présente six libellés de décision et
le résumé J21, qui a sa ligne (A15). Les six libellés de décision vont-ils
dans A15, ou leur faut-il une ligne à part ? Le suivi généré n'est couvert
qu'en B (BP-20).

## B. Fonctions nouvelles de BIO-PARCOURS (une ligne avant toute ouverture)

Elles suivent le tableau du cadrage, §2. L'étage outil vise une ouverture
sans qualification. L'étage assistant n'ouvre qu'après sa ligne.

| Fonction | Étage outil (limite) | Étage assistant | Lots | Conclusion du responsable |
|---|---|---|---|---|
| Lecture biologique | restitution fidèle, faits du laboratoire tels qu'imprimés, aucun écart ni verdict | évaluateur par marqueur, constat proposé | BP-27 | |
| Constat | posé par le praticien | pré-proposé par l'évaluateur | BP-11 | |
| Examens | analytes de la question choisie ; demande contresignée hors outil | bilan sélectionné d'après le dossier | BP-04 | |
| Options et dose | bibliothèque signée, toutes options affichées ; existant servi : rayon compléments C4 (A21) | classement par dossier, admissibilité calculée, alternatives | BP-17, BP-19 | |
| Prescription | acte du praticien, figée, remise | — | BP-18a, BP-18b | |
| Résultat préoccupant | marquage du laboratoire restitué (servi, A7), acte de lecture tracé (servi, A12), carte « geste » | cotation sur valeur | BP-10 | |
| Suivi | historique factuel, marche 1, note du praticien | note d'impact générée, révision proposée | BP-20 | |
| Adaptateur laboratoire | | — | BIO-INGEST LOT-05 | |

**État de l'adaptateur laboratoire** (`LOT-05-adaptateur-laboratoire.md`) :
lot à faire, aucun code ; architecture arrêtée le 2026-10-07
(`CADRAGE_LOT05_ADAPTATEUR_2026-10-07.md`) : flux automatisé visé, IA pour
les PDF et les photos, aucune IA sur le flux structuré (correspondance par
table déterministe curée), canal non tranché.

Pour chaque ligne : énoncé de destination, Q1 à Q5, limite, conclusion du
responsable. La limite de l'étage outil et la conclusion de la ligne
« Adaptateur laboratoire » restent à remplir, comme toutes les conclusions.

## Relecture du texte officiel (2026-10-07)

**Texte relu.** MDCG 2019-11 Rev.1, *Guidance on Qualification and
Classification of Software in Regulation (EU) 2017/745 – MDR and Regulation
(EU) 2017/746 – IVDR*, octobre 2019, révision 1 de juin 2025. PDF anglais
téléchargé le 2026-10-07 depuis le site de la Commission
(`https://health.ec.europa.eu/document/download/b45335c5-1679-4c71-a91c-fc7a4d37f12b_en?filename=mdcg_2019_11_en.pdf`),
SHA-256
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
dit pas comment la fonction en sort ; quand il nomme une condition du texte,
c'est sous forme de question. Les lignes A12 et A14 à A25 n'ont pas encore
de passages relevés.

| Fonction | Passages du guide |
|---|---|
| A1 Proposition de bilan | Annexe I b (aide à la décision : données du patient + algorithme → recommandation pour un patient) ; §3.2 note 4, exemple du module de dossier patient qui analyse les données d'un patient pour proposer des recommandations thérapeutiques ou des alertes ; Q3 pour le document remis au patient |
| A2 Orientation | Annexe I b ; §3.2 note 4, exemple du logiciel de dépression (questionnaires d'humeur et de symptômes, exercices choisis selon les réponses) |
| A3 Candidats de priorité, A4 Objectif | Annexe I b ; §3.1 (« process, analyse, interpret, calculate, create ») |
| A5 IA générative | Annexe I b ; §3.1 ; « axes prioritaires » et « points de vigilance » au regard de Q4 |
| A6 Relevé des comptes rendus | §2 : un document numérique (PDF, image) se distingue du logiciel capable de le lire ; annexe I f.1, note (modifier la représentation de résultats IVD disponibles n'est pas un dispositif IVD ; le guide ajoute que les résultats restent disponibles, lisibles et compréhensibles sans le logiciel) |
| A7 Restitution | Annexe I f.1, note : ne relèvent pas de l'IVDR les opérations arithmétiques de base (moyenne, conversion d'unités), le tracé dans le temps et « a comparison of the result to the limits of acceptance **set by the user** ». À examiner : la condition « set by the user » au regard de l'origine de la plage affichée |
| A8 Assiettes, portes, fiches | §3.1 (bien-être) et §3.2 (exemple du trouble alimentaire) ; annexe I b pour les assiettes indiquées d'après les scores |
| A9 Contradictions | §3.1 ; Q3 et Q4 |
| A10 Scoring et couverture | §3.2 note 4 (logiciel utilisé par des profanes, exemple du logiciel de dépression qui évalue et suit par questionnaires) ; note 22 (un usage par des profanes ajoute des exigences : annexe I, points 22 et 23.4 w du MDR) |
| A11 Sécurité | Q4, article 2(1) du MDR (prévention, surveillance) ; §4.2.1 (règle 11, ajout de la révision 1 sur la prévention du risque de maladie), à lire si Q4 est oui |
| A13 Transmission par le patient | Annexe I f.4 (surveillance à domicile : archiver des résultats de patients, ou transférer vers le soignant des résultats IVD obtenus au domicile, n'est pas un dispositif IVD, les résultats restant disponibles, lisibles et compréhensibles par l'utilisateur sans l'intervention du logiciel). À examiner : la condition « obtenus au domicile » au regard de la provenance du document, et la condition de lisibilité sans le logiciel au regard de la lecture par IA qui suit (A6) |
| B, étage assistant biologique (BP-27, BP-11, BP-04) | Annexe I f.2, système expert : un logiciel qui fournit de l'information au sens de l'IVDR en analysant ensemble un ou plusieurs résultats in vitro d'un même patient ; figure 2, étapes 2 et 3, si la biologie est combinée aux questionnaires |
| B, Options et dose (BP-17, BP-19) | Annexe I b, systèmes de planification médicamenteuse (calcul de la dose pour un patient donné) |
| BIO-INGEST LOT-05, adaptateur laboratoire | Annexe I f.1 (systèmes d'information de laboratoire) ; Q1b |

## Ce que la trame laisse ouvert

- La lecture de MDCG 2019-11 Rev.1 que portait le cadrage a été **vérifiée
  sur le texte officiel le 2026-10-07** (section ci-dessus). L'arbre est
  corrigé, mais aucune ligne n'est tranchée.
- `REGISTRE_FRONTIERES.md` §1 affirme que la qualification de dispositif
  médical « s'évite par conception ». `D-266` §4 l'affirme pour l'étage outil,
  sous l'hypothèse de travail de §2. Les lignes B le confirment ou
  l'infirment ; les lignes A disent ce qu'il en est des fonctions déjà
  servies.
- La relecture n'a porté que sur la qualification (§1 à §3, §7, annexe I).
  La classification (§4 et §5, règle 11) n'est pas relue : elle ne se lit que
  si une ligne conclut à un dispositif.
- **Fonctions servies puis retirées.** La trame ne dit pas si la note doit
  les couvrir ; le choix revient au responsable :
  - synthèse préparée sans geste du praticien (`WN_SYNTHESE_PAR_RIDEAU`),
    posée le 2026-09-12, retirée le 2026-09-17 (`D-226`) ;
  - journal du portail patient, allumé 13 minutes le 2026-09-12
    (`docs/FEATURE_FLAGS.md` §B.4) ;
  - observatoire Boussole praticien et son geste d'insertion, démontés le
    2026-09-26 (`D-250` ; route `api/praticien/boussole` conservée, non
    appelée).
- Recensement complété le 2026-10-08 : lignes A12 à A25, une rangée par
  fonction dans les lignes qui en réunissent plusieurs, ligne B
  « Adaptateur laboratoire ».
- Contre-revue de la trame : faite le 2026-10-05 par `wn-reviewer` (7 P1 et
  9 P2 corrigés). Relecture du texte officiel de MDCG 2019-11 Rev.1 : faite
  le 2026-10-07.
