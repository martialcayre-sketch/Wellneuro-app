# Cadrage définitif — BIO-PARCOURS v3

2026-10-04 · responsable de traitement

> **Version versée au dépôt** par BP-00 (`D-266`), révision 3.1 (Claude Doc privé `c054ca75-5da4-49d6-9cac-8d4891750f20`, onglet « Cadrage définitif v3 », rev 67). Le dépôt est public (D-251 §4) : ce qui disait le contenu d'un claim ou d'une option clinique est retiré et marqué « (contenu au Claude Doc) » ; les identifiants restent. Le Claude Doc fait foi pour ces passages. Remplace `CADRAGE_BIO_PARCOURS_2026-10-04.md` (v1).

Ce cadrage confronte la proposition reçue le 2026-10-04 au dépôt, aux décisions, au code et aux arbitrages du responsable, puis fixe le cadrage définitif. **Version 3** : elle intègre deux séries d'arbitrages du responsable et deux contre-revues Codex, toutes du 2026-10-04 ; la révision 3.1 porte les corrections de la contre-revue d'architecture qui a suivi (§1). Elle ne vaut ni autorisation de migration, ni modification clinique, ni ouverture en production.

## 0. Ce qui change depuis la v2

La v2 a été arbitrée en deux séries, puis éprouvée par deux contre-revues Codex (23 affirmations : 10 réfutées, 4 non vérifiables) ; trois arbitrages ont été repris après la seconde. Changements de structure :

- **Deux étages.** Le premier parcours vit dans l'**étage outil** : restitution fidèle, bibliothèque, décision humaine enregistrée, historique factuel. Il vise une ouverture sans qualification réglementaire, sous réserve de la ligne de chaque fonction dans BP-26. Ce qui dépasse ces limites (évaluateur, classement par dossier, note d'impact générée, verdicts de suivi) forme l'**étage assistant** : développé derrière drapeau, chaque fonction n'ouvre qu'après sa ligne de la note de qualification signée (BP-26), qui statue aussi sur les fonctions déjà servies qui proposent d'après le dossier.
- **Périmètre de prescription** : compléments alimentaires et produits hors médicament, jamais de médicament ; la biologie part en demande d'examens contresignée par un médecin, hors de l'outil. L'habilitation est close.
- **La prescription vient de la bibliothèque** (BP-17), pas de la stratégie classée : BP-18 ne dépend plus de BP-19, qui passe à l'étage assistant.
- **Une quatrième source de dose** : la position d'expert signée du responsable, avec un rang dédié dans DC-06 et un usage d'affichage seul.
- **Faits du laboratoire** : intervalle et marquage imprimés, transcrits par un lot BIO-INGEST nouveau, LOT-07, avancé avant LOT-04 ; LOT-05 reste l'adaptateur laboratoire.
- **Patient** : le « protocole personnalisé » porte forme, dose et durée validées.
- **Nouveaux lots** : BP-25 (plafond porté à 7), BP-26 (note de qualification par fonction), BP-27 (évaluateur par marqueur, ex-phase 4) ; BP-12, BP-18 et BP-21 scindés en a et b (révision 3.1).
- **Premier lot, hors campagne, avant le 2026-10-21** (*au versement : fait, D-265, #1305*) : la décision qui pérennise les données réelles en production et le portail G4, pose base légale et AIPD, et maintient la voie d'exception de D-234, dont elle consigne la justification. C'est le préalable de toute la campagne, pas du seul BP-24 (révision 3.1).
- **Corrections des contre-revues** : préalables complets au lieu d'un chemin dessiné, identité d'auteur séparée du rôle (`approvedBy`), restrictions exécutables inventoriées, invariants testés, impact du plafond sur la table de repli.

## 1. Confrontation de la proposition

**Méthode.** Six confrontations indépendantes (dépôt et campagnes ; décisions et doctrine ; code réel ; couverture des huit arbitrages ; science et réglementaire ; structure des lots), puis une réfutation adverse (18 réfutations, 18 affirmations confirmées) et une critique de complétude (17 manques). Chaque affirmation retenue ci-dessous est lue dans le dépôt (`149d1f8b`) ou dans une source ouverte ; ce qui n'a pas été lu est marqué *incertain*.

**Verdict.** La proposition est juste sur la forme du produit et fausse sur son point de départ : elle décrit un logiciel à construire sur un terrain vide, alors que le dépôt porte déjà la moitié des objets, des décisions qui ferment plusieurs de ses chemins, et quatre textes de frontière qu'elle contredit sans les nommer. Elle contredit aussi trois arbitrages du responsable.

### Retenu tel quel

- La question centrale et les six questions du §1 ; l'objet « stratégie personnalisée versionnée ».
- Le tableau des étapes (§3) avec sa colonne « décision humaine » ; « une information manquante suspend seulement les propositions qui en dépendent ».
- Les trois validations distinctes : documentaire, usage clinique, exécution logicielle (§4.3) — les deux premières sont celles du brainstorming.
- « Résultat disponible, utilisable pour une règle, comparable » (§5.3) ; les corrections comme événements datés.
- « Aucune alternative n'est fabriquée pour remplir l'interface » ; les options exclues restent accessibles (§6.3).
- « “Aucune interaction détectée” ne doit jamais laisser croire à une vérification exhaustive » ; le contrôle non réalisé est affiché (§7).
- Les trois niveaux de conclusion : observation, interprétation, attribution (§8.2) ; le taux d'acceptation ne mesure pas la justesse (§8.3).
- La désactivation sans perte d'historique (§11) ; la définition de réussite (§12).
- « Aucune ouverture prescriptive ne précède l'achèvement du suivi nécessaire à son usage » (§10).
- Les trois scénarios fictifs (§10), portés par les trois fixtures.

### Corrigé

| Point de la proposition | Pourquoi | Correction retenue |
| --- | --- | --- |
| §6.1 place les objectifs du patient après la solidité des preuves | Contredit l'arbitrage 2 | Ordre rétabli : sécurité → besoins fondamentaux documentés et prérequis → retentissement et objectifs → solidité des options → faisabilité et préférences ; dimensions comparées côte à côte, sans pondération ni score |
| §7 : précautions et surveillance « lorsqu'un usage le permet » | Contredit l'arbitrage 1(4) | Fail-closed : une option dont les précautions ou la surveillance ne peuvent être énoncées n'entre ni dans la bibliothèque ni dans une proposition |
| §4.1 : cinq natures de lien | Mêle la force de preuve (quatre niveaux du brainstorming) et une finalité (sécurité, surveillance) | Trois axes orthogonaux : nature du lien (4), usage décisionnel (5, plus un marqueur sécurité/admissibilité), statut d'usage (3, arbitrage 3) |
| L3 (évaluateur) placé avant L4 sur le chemin critique | Exige D-157 amendée, plages par population, sexe au dossier, contexte DC-46, discordances arbitrées : le lot le plus coûteux et le plus exposé, posé en préalable | Le premier parcours lit des **constats posés par le praticien** (étage outil) ; l'évaluateur (BP-27) se développe derrière drapeau et n'ouvre qu'après sa ligne de la note de qualification (BP-26) |
| L0–L7 présentés comme des lots | Aucun n'a de migration unique, de done observable, de drapeau ni de dépendance ; ce sont des phases | Phases conservées, lots BP-nn à l'intérieur (§5) |
| §6.4 et §9 laissent ouverts des « calculs validés » | Le responsable a retenu le niveau 3, pas le niveau 4 | Posologie tirée d'une source (claim, registre, référentiel certifié ou position d'expert signée), modifiable, **jamais calculée** ; aucune dérivation posologique |
| §7 : vue patient réduite à « objectifs, décisions, modalités, suivi » | Contredit l'arbitrage 7 (options, bénéfices, risques) tout en citant NICE NG197 | Vue patient complète, document remis « protocole personnalisé », forme, dose et durée validées comprises (§4.3) |
| §8.2 invoque D-058 pour les évolutions biologiques | D-058 vaut pour le déclaratif ; en biologie, D-157 §2 interdit tout écart calculé | Série datée sans delta ; bandes publiées par acte séparé ; échelle à quatre marches (§4.4) |
| §11 : « qualification DM plausible », MDCG 2019-11 « une référence » | MDCG 2019-11 Rev.1 (juin 2025), annexe I b : un logiciel qui recommande un traitement à un patient individuel est un dispositif médical, quel que soit le produit ; « risk is not a criterion » | Deux étages ; note de qualification **par fonction** signée (BP-26) ; une fonction au-delà de la limite « outil » n'ouvre qu'après sa ligne (§2, §4.6) |
| §5.1 : intervalle du laboratoire, méthode, qualitatif, document source | `ResultatBiologique` n'a ni intervalle ni méthode ; `valeur` est un `Decimal` non nul ; la consigne D-256 interdit de recopier les valeurs de référence ; le schéma d'extraction est fermé (`additionalProperties: false`) ; D-256 §3 écarte la colonne qualitative ; D-258 purge le document | Intervalle et marquage imprimés transcrits comme **faits du laboratoire** par BIO-INGEST LOT-07 (nouveau), avancé avant LOT-04 et avant la purge : schéma, parseur, staging, persistance, validation, restitution, contrats ; qualitatif maintenu écarté |
| §11 : désactivation qui préserve les prescriptions | La vue patient est **rejouée** et s'éteint sur `carte_derivee` quand une table signée change | Une prescription validée est servie **figée**, jamais rejouée |
| OMS 2020 citée en appui | Page de résumé seule, contenu non lu | À ouvrir avant la fiche d'usage ; une seconde source externe lue (contenu au Claude Doc) |
| « Prescriptif sous validation professionnelle », restitution centrale, triade de l'arbitrage 4 | Présents en substance, pas en forme | Verdict partiel : reprendre les phrases du responsable mot pour mot (§4.1) |

### Ignoré par la proposition, et qui préexiste

- **Textes de frontière** : `REGISTRE_FRONTIERES.md` §1 (« la qualification dispositif médical s'évite par conception », « la finalité revendiquée du logiciel ne dépend pas des diplômes de l'opérateur », « prescription » proscrit sur toute surface patient, activité « hors prescription médicale », présenté comme non négociable) ; `ROADMAP_PRODUIT.md` §2 ; TRUST (`registre.ts:44`, `:128`, `:587` : « traitements et décisions médicales se discutent avec » le médecin traitant, « n'établit pas de diagnostic médical », consentement « hors diagnostic médical », limite de finalité opposable du dossier RGPD) ; D-037 (« activité non réglementée ») ; D-215 §2 (« Docteur en Pharmacie ») ; `assertRenduMedecinNonPrescriptif`. Et des **restrictions exécutables** : `contexteClinique.ts:199` (« sans proposer d'ajustement posologique ni d'arrêt »), `anthropic.ts:376` (« Ne recommande aucun dosage précis de compléments ou de médicaments »), `fiches-assiette/invariants.ts` (« prescription » côté patient).
- **Chantiers déjà cadrés** : Curation signée (signature claim par claim, liens biomarqueur ↔ besoin) ; C4 compléments (modèle de règles, seuils, alertes ; tables à zéro ligne ; D-056 fail-closed ; D-133 : jamais vers un protocole) ; Fiche d'assiette (D-251 : texte en base HDS, validation version par version, remise à la diffusion) ; Phase 5 Actions (plafond 7, catalogue, dose sourcée, complétion IA relue — une ligne de handoff, aucun D-xxx) ; D-206 (unité = tableau clinique, première table sur un axe curé seulement : sommeil ou humeur) ; BIO-INGEST LOT-03 à LOT-05 ; les lots BP-01, BP-02, BP-04, BP-08 du cadrage v1.
- **Arbitrages déjà pris** : règles orphelines (DC-39, DC-40, DC-45, DC-47, DC-48) routées en **campagne dédiée** par le responsable (D-107) ; D-081 (un drapeau naît avec le code qui le lit) ; D-087 ; D-125 ; D-190 §5 ; D-105 ; D-255 ; D-256 §3 ; D-213 §1 tranchée mais non exécutée (`versions/route.ts:474` tamponne sans condition).
- **État du code** : un seul rôle (`auth.ts:5`, garde recopiée dans une soixantaine de fichiers) ; `approvedBy` vaut `'practitioner'`, littéral exigé par la diffusion (`diffusion.ts:34`), le portail (`portailProtocol.ts:101`) et le calendrier ; médicaments en champs distincts et automédication en classes fermées (`anamnese.ts:300`, `:318`), sans référentiel normalisé ; `constraints: []` en dur ; aucune colonne de sexe, `dateNaissance` en `String?` ; carte de décision non persistée (le `payload` de `ProtocolDraft` l'est), `counterfactuals` sans producteur ; `FORBIDDEN_SUPPLEMENT_FIELDS` refuse la dose ; lexique patient interdit `posologie` et `dosage` ; deux tables signées lisent le plafond d'actions (`baremeChargeV1`, `tableRepliV1`) ; une table signée sert déjà un libellé au patient (`priorityRulesV1.libelle`, D-208) ; DC-42 livrée non signée (`SAF-EI-01`) ; DC-43 sans sujet (exclusions nulles) ; `validationExterne: true` = signature du responsable, pas une évaluation indépendante ; `FilCardLecture` existe (accusé par lecture, inadapté à une alerte).

### Trouvé par la confrontation, absent du v1 comme de la proposition

1. **Le résultat préoccupant est une dette présente**, pas un livrable futur : l'import est ouvert, l'extraction jette le marquage d'anomalie du laboratoire, le document est purgé, la validation est une transcription, la levée D-257 ne couvre que l'anamnèse, la notification est à échec silencieux. BIO-INGEST LOT-04 (dépôt par le patient) ne doit pas ouvrir avant un véhicule.
2. **L'évaluation clinique indépendante n'a ni titulaire ni véhicule.**
3. **Un conflit entre claims se déclare et s'escalade, mais aucun arbitrage n'est persisté** (`conflitsSourcesV1`, DC-54, DC-55).
4. **La population n'est pas dans le claim** (DC-14, D-095) : la posologie sourcée n'a pas son garde-fou.
5. **Les données physiologiques du parcours n'existent pas** (sexe, statut, règles abondantes, antécédents en texte libre ; mineurs = trou RGPD).
6. **Les bandes de bruit ne sont pas publiées** (`BANDES_DE_BRUIT` vide) : l'échelle du suivi a quatre marches, pas trois.
7. **La restitution patient a déjà son canal** (D-251, D-262, garde D-189 §4) ; `PortailLecturePatient` n'a pas d'horodatage.
8. **La garde de migration de D-264 §3** (échec si une donnée déjà servie change de sens) est à généraliser.
9. **RGPD** : base légale et AIPD à poser (par le responsable, décision du 2026-10-21), effacement tout ou rien, résidu d'une prescription à définir.
10. **Le constat d'usage au conteneur** exige une session hors mode auto (le classifieur refuse `run -d` + `psql`).
11. **WN-CL-0031-025@v1.0 ne se cite pas dans le premier parcours** : son objet n'est pas celui que la proposition lui prêtait (contenu au Claude Doc).
12. **PRIO-FAT** : la fatigue est « un carrefour, non un axe » ; sa condition de retour exige une mesure par **instrument**, pas une mesure biologique.

### Contre-revues Codex (2026-10-04)

Deux passes adverses en lecture seule à `149d1f8b`. Chaque citation a été revérifiée dans l'arbre.

| Affirmation | Verdict | Correction dans la v3 |
| --- | --- | --- |
| B1 — six textes s'opposent à la prescription, et eux seuls | Réfutée | Inventaire étendu aux restrictions exécutables (`contexteClinique.ts:199`, `anthropic.ts:376`), **maintenues** : elles sont cohérentes avec « hors médicament » et « le LLM rédige seulement » (§5.1) |
| B2 — le constat n'exige qu'une précision de D-122 | Résiste sous condition | La précision couvre la consommation du constat ; chaque marqueur de l'évaluateur reste une règle neuve avec sa décision et ses claims (BP-27) |
| B3 — module distinct compatible avec D-206 | Non vérifiable | Décision de portée en BP-00, garde en BP-01 : le module n'alimente pas `catalogueConduitesV1` et ne crée aucun axe |
| B4 — amendement nommé des orphelines | Résiste | Liste reprise : DC-03, DC-38, DC-39, DC-40, DC-41, DC-44, DC-48 |
| B5 — le jour 0 ne peut pas bouger | Non vérifiable en totalité | Invariant exigé et testé en BP-15, sur le jour 0 et les quatre empreintes |
| B6 — chemin critique cohérent | Réfutée | Préalables complets (§5.3), dont BP-07 → BP-12a → BP-11 |
| B7 — une migration par lot, ordre tenu | Résiste | Convention tranchée : un lot = la migration et son consommateur, en deux PR |
| B8 — aucune table signée ne sert de texte au patient | Réfutée | `priorityRulesV1.libelle` le fait déjà (D-208) ; les nouvelles fiches portent une garde « aucune phrase » (BP-01) |
| A3 — aucun artefact figé | Réfutée en partie | Ce qui manque est un instantané de la vue patient servi sans rejeu ni recontrôle (BP-18a) |
| A6 — le plafond n'a qu'un consommateur | Réfutée | `tableRepliV1` et une garde littérale aussi (BP-25) |
| A7 — traitements en texte libre seulement | Réfutée | BP-13 reprend la saisie existante |
| O1 — `approvedBy` nominatif | Omission confirmée | Identité d'auteur dans un champ distinct, rôle inchangé (BP-14) |
| O2 — J1 sans verrou d'ouverture | Omission, en partie dépassée | Deux décisions d'ouverture séparées (BP-21a, BP-21b) |
| B9 — « hors médicament » et habilitation écartent MDR et IVDR | Réfutée | Deux étages, note de qualification par fonction (§2, BP-26) |
| B10 — le régime permanent ne touche que le registre et deux rubriques | Réfutée | Décision du 2026-10-21 élargie : rubriques 3, 13, 14, checklist TRUST, D-234, commentaires de drapeaux, portail G4 (§4.6) |
| B11 — position signée compatible avec DC-06, DC-16, DC-19 | Non vérifiable | Rang dédié et contrat de provenance (§4.2) |
| B12 — la consigne d'extraction suffit | Réfutée | Lot complet : schéma, parseur, staging, persistance, validation, restitution, contrats, garde de non-consommation |
| B13 — quatre endroits seulement à corriger | Réfutée | Les endroits relevés sont corrigés dans cette v3 |

Résistent sans autre correction : A1, A2 (la table des constats aura son propre contrat négatif), A4, A5 (état réel du drapeau relu en BP-02), A8, C1 (non vérifiable sans la base), C2 (annexe I b confirmée).

### Contre-revue d'architecture (2026-10-04)

Une passe adverse en lecture seule à `149d1f8b`, sur la structure, les limites « outil », le découpage et les préalables, sans avis clinique. Les deux réfutations structurantes (§5.3, LOT-05) ont été revérifiées dans l'arbre.

| Affirmation | Verdict | Correction dans la révision 3.1 |
| --- | --- | --- |
| « Une fonction au-delà de la limite outil n'ouvre qu'après sa ligne de BP-26 » | Réfutée comme état présent : `indicationsBiologieV1` et les routes `api/praticien/biologie/proposition/*` proposent déjà d'après le dossier | BP-26 statue sur chaque fonction déjà servie : exemption, régularisation ou réduction, par décision du responsable (§2, §4.6) |
| « L'étage outil s'ouvre sans qualification » | Fragile : il porte une bibliothèque clinique signée (BP-17) | Il « vise » une ouverture sans qualification ; chaque fonction outil a aussi sa ligne de BP-26 (§0) |
| La lecture de MDCG 2019-11 Rev.1 annexe I b fonde les deux étages | Fragile : source externe, invérifiable depuis le dépôt | Nommée hypothèse de travail, assumée par la note signée BP-26 (§2) |
| « BP-00 → tout lot » et « dès maintenant : BP-01, BP-02, LOT-05 » | Réfutée : contradiction interne de la §5.3 | BP-00 précède tout lot sauf BP-02 (lecture seule) ; BP-01 et LOT-07 le suivent (§5.3) |
| « BIO-INGEST LOT-05 transcrit les faits du laboratoire » | Réfutée : le cadrage BIO-INGEST définit LOT-05 comme l'adaptateur laboratoire (`CADRAGE_BIO_INGEST_2026-09-30.md:110`) | Lot nouveau BIO-INGEST LOT-07, ajouté au cadrage BIO-INGEST par BP-00 ; LOT-05 inchangé |
| « Décision du 2026-10-21 → BP-24 » | Réfutée en portée : sans reconduction écrite, l'invariant du registre reprend effet le 2026-10-21 (`REGISTRE_FRONTIERES.md:22-27`) | Préalable de la campagne et premier lot (§5.3, §6.6) |
| « BP-00 à BP-09 conservés avec leur contenu » | Réfutée en partie : BP-00 change d'objet, BP-06 est absorbé par BP-05 | « Conservés et étendus », absorption consignée (§2, §5.2) |
| BP-12, BP-18 et BP-21 sont chacun un lot | Réfutée : chacun porte deux finalités | Scindés en a et b ; BP-11 ne dépend que de BP-12a, ce qui raccourcit la branche J1 d'une `release-db` (§5.2, §5.3) |
| Contreseing de la demande « hors de l'outil » | Fragile : rien ne dit ce que devient l'attente sans date de contreseing | Règle fixée en BP-04 : fail-closed ou déclarative explicite (§5.2) |
| BP-10 précède BIO-INGEST LOT-04 | Fragile en forme : consigné dans aucun document BIO-INGEST | Porté par la D-xxx de sécurité biologique et au cadrage BIO-INGEST par BP-00 |

Tiennent : la nécessité des deux étages ; les limites « outil » de la lecture, des options (règle signée, non neutre), du suivi à la marche 1 et du résultat préoccupant ; les acquis du §3.6 ; les préalables D-256 (LOT-07), D-213 §1 (BP-23) et DC-42 (BP-18a).

## 2. Objectif, périmètre, ce que ce cadrage remplace

**Direction (responsable, 2026-10-04).** « Assistant clinique proactif, prescriptif sous validation professionnelle, explicable et longitudinal, construit autour des 12 besoins. Développement par situations cliniques couvrant toute la boucle, puis extension. »

**Question centrale.** « Compte tenu de ce que nous savons aujourd'hui, quelle est la prochaine décision utile pour ce patient, pourquoi, et comment saurons-nous si elle lui bénéficie ? »

**Quatre engagements.** Le praticien décide ; chaque proposition est explicable (elle cite ses données et ses claims) ; la force d'une proposition suit ses preuves ; tout est révisable.

**Invariant de traçabilité.** question clinique → éléments examinés → hypothèse retenue → intervention décidée → intervention réellement suivie → résultats observés → décision suivante. Chaque maillon est daté, en ajout seul, et référence le précédent par identifiant.

### Ce que ce cadrage remplace

| Document | Sort |
| --- | --- |
| Cadrage v1 (`CADRAGE_BIO_PARCOURS_2026-10-04.md`, BP-00 à BP-09) | Absorbé. Les identifiants BP-00 à BP-09 sont **conservés** et étendus — BP-00 devient la décision-cadre, BP-06 est absorbé par BP-05 ; le régime « présence, date, unité » devient l'étage documentaire du programme, non sa frontière ; la table « Refusé » du v1 vaut pour cet étage, chaque refus nommant la décision qui le lèverait |
| Proposition tierce (L0 à L7) | L0 à L7 deviennent les **phases** 0 à 5 ; ses apports retenus sont intégrés section par section |
| Cadrage définitif v2 (onglet « Cadrage v2 (remplacé) ») | Remplacé par cette v3 ; reste lisible, avec son fil de commentaire et la consignation des deux premières séries d'arbitrages |
| Brainstorming (onglet principal) | Source : arbitrages 1 à 8, matrice, fiches d'usage, synthèse de recherche |
| `FILE_ATTENTE.md:77` (« Ré-alimentation du moteur par le mesuré ») | Remplacée par une entrée **parapluie** « Assistant clinique — BIO-PARCOURS » renvoyant aux lots ; « Import laboratoire » (`:78`) close comme absorbée par BIO-INGEST LOT-05 |

### Ce que ce cadrage ne fait pas

Aucune migration, aucune modification de `schema.prisma`, aucune règle clinique, aucun seuil, aucune dose, aucune ouverture en production. Chaque `D-xxx` citée comme « à prendre » reste à prendre par le responsable, avec son fragment `changelog.d/`. La décision du 2026-10-21 est nommée et préparée à part, pas prise ici. Les paraphrases de claims restent dans ce document ou en base : la version versée au dépôt public ne cite que des identifiants.

### Deux étages : l'outil, puis l'assistant

La qualification réglementaire dépend de ce que fait le logiciel, ni du produit recommandé ni du diplôme de l'opérateur (`REGISTRE_FRONTIERES.md` §1 ; MDR art. 2(1), IVDR art. 2(2), MDCG 2019-11 Rev.1 annexe I b, confirmés par la contre-revue). Cette lecture juridique, externe au dépôt, reste une hypothèse de travail que seule la note signée BP-26 assume. Le programme se construit donc en deux étages.

| Fonction | Étage outil : ouvrable sans qualification | Étage assistant : derrière drapeau, ouverture après sa ligne de BP-26 |
| --- | --- | --- |
| Lecture biologique | Restitution fidèle : fait, date, unité, jour n, plages publiées, faits du laboratoire tels qu'imprimés ; jamais d'écart, de couleur ni de verdict (D-122, D-157) | Évaluateur par marqueur (BP-27) : lit la valeur et **propose** un constat à confirmer |
| Constat | Posé par le praticien (BP-11) ; aucun module ne lit de valeur | Pré-proposé par l'évaluateur, toujours confirmé par le praticien |
| Examens | Analytes de la question choisie ; demande d'examens à contresigner, transmise hors de l'outil | Proposition de bilan sélectionnée d'après le dossier |
| Options et dose | Bibliothèque signée des options de l'hypothèse confirmée, toutes affichées avec précautions, population et source de dose (BP-17) ; données déclarées du dossier juxtaposées ; contrôles non réalisés affichés | Classement par dossier, admissibilité calculée, « non proposable », alternatives typées (BP-19) |
| Prescription | Choix et modification par le praticien, prescription figée, « protocole personnalisé » remis (BP-18a, BP-18b) | — : la prescription reste un acte du praticien dans les deux étages |
| Résultat préoccupant | Marquage du laboratoire restitué, acte de lecture tracé, carte « geste » (BP-10) | Cotation sur valeur (étage 2) |
| Suivi | Historique factuel, marche 1 (observation), note du praticien (BP-20) | Note d'impact générée, révision proposée, marches 2 à 4 |

Changer un intitulé ne change pas une fonction : seule une réduction effective de ce que fait le logiciel la fait passer d'un étage à l'autre. La note de qualification recense aussi les fonctions déjà servies qui proposent d'après le dossier (proposition de bilan `indicationsBiologieV1`, orientation) ; ce cadrage ne les juge pas, mais BP-26 statue sur chacune (exemption, régularisation ou réduction) par décision du responsable. D'ici là, la règle « sa ligne de BP-26 avant ouverture » ne vaut que pour les fonctions nouvelles.

Le constat du praticien se justifie d'abord par la doctrine (DC-13, DC-24, D-157 §2 : le rapprochement appartient au praticien, désormais tracé) et par le coût. Son gain réglementaire est limité à la lecture, et seulement plausible (C2).

### Le parcours en six étapes

| Étape | Le logiciel, étage outil | Ajout de l'étage assistant | Le praticien | Objet porteur |
| --- | --- | --- | --- | --- |
| Compréhension | Besoins évalués et non évalués (« non évalué, pas zéro »), mesures au dossier (présence, date), traitements déclarés, questions de la liste signée du périmètre | — | Pose la question du cycle, ou aucune | Question (libellé de l'attente et de l'action) |
| Exploration | Analytes de la question : rôle, ce que le résultat pourra changer ou « ne modifiera aucune option », à vérifier avant prélèvement, déjà au dossier ; demande d'examens à contresigner | Proposition de bilan sélectionnée d'après le dossier | Retient les analytes, fait contresigner la demande, pose l'attente typée | `analyteCodes` et date du contreseing sur l'attente (D-142, BP-04) |
| Lecture et constat | Fiche de lecture documentaire avec les faits du laboratoire ; formulaire de constat avec les pièces attendues par la fiche d'usage | Constat pré-proposé par l'évaluateur | **Pose le constat** : confirmée, non retenue, non évaluable, sans objet ; note obligatoire hors « confirmée » | Constat du praticien (BP-11) ; arbitrage existant réveillé sans pré-remplissage |
| Options et prescription | Bibliothèque des options de l'hypothèse : précautions, surveillance, critère d'arrêt, source de dose ou « information manquante », population ; dossier juxtaposé | « Protocole proposé » : groupes, stratégie privilégiée, alternatives, « non proposable » | Choisit, modifie (geste tracé), écarte avec motif ; prescrit ; valide la version | Version (contrat V5), prescription figée, « protocole personnalisé » |
| Mise en œuvre et suivi | Frise : jour 0, début réel, interruptions, check-ins, prélèvements en jour n, attentes ouvertes ; cinq dimensions séparées, à la marche 1 | Marches 2 à 4 | Déclare ou recueille début, interruption, reprise, tolérance ; programme la re-mesure | Décisions de parcours (BP-15), séries (BP-03), indicateurs (BP-08) |
| Réévaluation | Bilan de la question en deux colonnes (clinique, biologie) ; données nouvelles listées ; aucune réécriture silencieuse | Note d'impact générée, révision proposée | Rédige sa note ; maintient, ajuste, arrête, explore autrement, reformule, clôt ; motive | Nouvelle version ; décision de révision persistée ; un pivot relance le calendrier (D-255), une version non |

## 3. Fondations : connaissances et données

### 3.1 Une seule nomenclature (décision à prendre en BP-00)

Le dépôt porte déjà quatre vocabulaires concurrents (DC-07, DC-13, DC-45, `NIVEAU_PREUVE_PAR_SOURCE` et `niveau_preuve`). La proposition en ajoutait deux. Une seule décision de nomenclature fixe trois axes **orthogonaux** par lien de la matrice :

| Axe | Valeurs | Ce qu'il dit |
| --- | --- | --- |
| Nature du lien | mesure directe ; information contributive ; piste exploratoire ; usage non étayé | La force de preuve du lien besoin ↔ mesure |
| Usage décisionnel | confirmer une hypothèse ; réduire sa plausibilité ; départager des options ; surveiller une intervention ; réexaminer la stratégie ; plus un marqueur **sécurité / admissibilité** qui oblige à l'afficher | À quelle décision la mesure sert |
| Statut d'usage (arbitrage 3) | étayé et validé (soutient une proposition préférée) ; preuves limitées (option conditionnelle) ; non validé (espace de réflexion, aucun déclenchement) | Ce que l'assistant a le droit d'en faire |

La correspondance entre nature et statut (une piste exploratoire peut-elle soutenir une option conditionnelle ?) relève du responsable ; recommandation : non, elle reste en espace de réflexion. DC-13 est amendée pour que sa portée vise l'**usage** et non le claim ; DC-20 (nature de chaque seuil : intervalle du laboratoire, seuil décisionnel documenté, cible thérapeutique) et DC-47 sont actées en doctrine, banc dû (corrigé au versement : « armées » ; l'armement revient aux lots porteurs, après décision, banc et statut, D-266 §9) ; les textes périmés de DC-46 et DC-47 sont corrigés.

**Unités.** La **question clinique** est l'unité de raisonnement ; le **tableau clinique** reste l'unité de conduite de D-206 A2. D-206 A1 n'ouvre la première table de conduites que sur un axe curé (sommeil ou humeur) et la fatigue est « un carrefour, non un axe » : la fiche d'usage est donc un **module signé distinct** de `catalogueConduitesV1`, et le premier parcours se nomme « exploration du besoin 2 », pas « axe fatigue ». Un claim isolé n'est qu'un matériau : seule une chaîne complète (indication, lecture, options, précautions, suivi) fonde un usage.

### 3.2 La fiche d'usage décisionnel, en deux couches

Une fiche par question clinique et par usage ; un analyte peut apparaître dans plusieurs fiches. Le dépôt est public (D-251 §4) : le texte clinique ne le touche jamais.

| Couche | Où | Contenu | Validation |
| --- | --- | --- | --- |
| Structure | Table TS signée à cinq termes (`shaPerimetre` littéral, D-063/D-067), hook DC-17 étendu, déclarée à la matrice de consommation | Identifiant d'usage, question, codes d'analyte, besoins, claims `identifiant@version`, nature, usage décisionnel, statut d'usage, **population** (champ obligatoire, curé claim par claim — DC-14, D-095), statut réglementaire du produit proposé, renvois aux précautions. **Aucune phrase** (garde dédiée en BP-01 : une signature cohérente ne prouve pas l'absence de phrase, `priorityRulesV1.libelle` le montre). | Signature du responsable = validation de l'**usage** (distincte de la validation du claim, portée par Curation signée) |
| Texte | Base HDS, patron `FicheAssietteVersion` / `FicheAssietteActe` (D-251 §5) : `FicheUsageVersion`, `FicheUsageActe`, ajout seul | Question, population en clair, préanalytique et contexte requis, résultats possibles et conséquences autorisées, interprétations permises et interdites, options, précautions, surveillance et critère d'arrêt, limites, argument de préférence, explication patient | Un modèle peut rédiger, un second contre-lire ; la validation est un acte daté du responsable, ligne à ligne (DC-16) ; aucune donnée patient dans une consigne |

Règles : contrat de fraîcheur étendu à la couche texte (un claim remplacé rend la fiche « à relire », jamais réécrite) ; une fiche qui perd un claim repasse en espace de réflexion ; les claims narratifs n'entrent jamais dans une table ; les discordances du parcours sont **déclarées** dans `conflitsSourcesV1` (re-signé) et un objet d'**arbitrage de conflit** en ajout seul (conflit, question clinique, position retenue — la plus prudente par défaut, DC-54 —, auteur, date, motif, révocation) consigne ce que DC-55 ne persiste pas aujourd'hui ; l'arbitrage vaut pour une question, jamais pour le claim en général ; la capacité de validation du responsable est une constante produit (plafond de fiches par séance) ; une source externe (NICE, BSG, Vaucher) sert à concevoir et n'apparaît à l'écran qu'ingérée en claim certifié (DC-01) ; registre daté des sources ouvertes ; là où aucune source ne chiffre, une position d'expert signée peut renseigner une dose (§4.2).

### 3.3 Les questions cliniques

Le motif de consultation est un texte libre ; un LLM ne le lit pas (D-059 §5 : l'extraction D-256 reste le seul flux biologique vers un modèle). Les questions viennent d'une **table signée par périmètre** (motif ou réponse de questionnaire → question → analytes concernés), sur le patron d'`indicationsBiologieV1` (15 règles signées) ; dans l'étage outil, le praticien choisit la question ; son déclenchement d'après le dossier, comme la proposition de bilan existante, relève de l'étage assistant. Chaque élément d'une indication est porté par un claim (structure au Claude Doc) ; le nombre de questions ouvertes est plafonné (constante produit) ; les ensembles d'examens sont définis par situation, jamais en panel universel ; chaque examen dit la question qu'il éclaire, les décisions qui changeraient, ses limites.

### 3.4 Le constat du praticien (objet nouveau, BP-11)

Dans l'étage outil, aucun module ne lit de valeur : le parcours lit les constats posés par le praticien. Dans l'étage assistant, l'évaluateur (BP-27) peut pré-proposer un constat ; le constat reste posé par le praticien.

| Champ | Règle |
| --- | --- |
| Hypothèse | Identifiant d'une hypothèse du vocabulaire signé du parcours (table TS d'identifiants ; libellés en base, §3.2) — jamais un texte libre de verdict |
| Verdict | `confirmee` · `non_retenue` · `non_evaluable` (données insuffisantes, DC-24) · `sans_objet` ; note obligatoire hors `confirmee` |
| Pièces | Identifiants de résultats, de réponses, de déclarations (contexte, traitement) ; **aucune valeur recopiée** (contrat négatif **propre à la table** : celui d'`arbitrages_biologiques` ne la couvre pas) ; la fiche d'usage dit quelles pièces sont attendues (ex. marqueur inflammatoire du même prélèvement : présent, absent, inconnu) |
| Auteur, date | Posés côté serveur ; ajout seul ; `supersedes` |
| Validité | Durée = valeur à sourcer (claim certifié) ou fixée par le praticien avec sa nature déclarée (DC-19, DC-20) |
| Réaction | Un résultat corrigé (D-124) ou annulé (BP-09) passe le constat à « à relire », jamais réécrit |

Pourquoi un objet distinct de `ArbitrageBiologique` : l'arbitrage porte sur une **action** (unicité version × intention, `confirme ⇒ active`) et son contrat négatif refuse toute colonne `valeur|resultat|mesure|unite|analyte`. Étendre l'arbitrage amenderait D-059 §4, son contrat et sa clé ; un objet distinct laisse D-059 §4 et D-157 §2 intacts et matérialise le geste que §2 réserve au praticien. D-122 est précisée pour couvrir expressément la consommation du constat ; elle ne dispense pas des décisions et des claims des règles qui l'utilisent. Le vocabulaire de sa surface (« déficit », « carence » sont des mots de verdict au sens de D-157 §3) est décidé explicitement, séparément de la surface Estimé ↔ mesuré. Le logiciel signale « résultat arrivé, constat à poser » ; il ne signale pas une valeur, et la surface le dit (ce n'est pas un filet de sécurité — voir 4.5).

### 3.5 Données neuves

Un lot porte au plus une migration, et la migration forme un lot avec son code consommateur, en deux PR : la migration seule, puis le code après `release-db` approuvée et constat par conteneur (D-087 ; `pr-revue-et-release-db.md` aligné sur `CLAUDE.md` en BP-00). Registre RGPD et nouvelle version TRUST **avant** le drapeau qui lit la table (leçon du 2026-09-09). Effacement IDP2 et RLS deny-all sur chaque table.

| Objet | Rôle | Migration | Préalable | Lot |
| --- | --- | --- | --- | --- |
| Faits du laboratoire | Intervalle de référence et marquage d'anomalie **tels qu'imprimés**, attribués au laboratoire, jamais recalculés ni réutilisés comme plage Wellneuro. Schéma d'extraction et parseur à clés exactes étendus, colonnes de staging, persistance sur le résultat validé, validation humaine, restitution juxtaposée. Consignés avant la purge D-258, sans en repousser l'échéance ; D-059 §4 intacte | oui | Amendement de la consigne D-256 ; précision de D-157 ; garde de non-consommation (BP-01) | BIO-INGEST LOT-07 (nouveau), avancé avant LOT-04 |
| Annulation d'un résultat | Retire une erreur d'analyte ou de date d'une série ; motif fermé ; patron D-257 §6 ; amende D-124 | oui | D-xxx | BP-09 |
| Constat biologique d'adressage, étage 1 | Acte de lecture clinique, carte « geste », destinataire, accusé ; consomme le marquage transcrit, ne lit aucune valeur | oui | D-xxx de sécurité biologique | BP-10 |
| Constat du praticien | 3.4 | oui | D-xxx, registre RGPD | BP-11 |
| Fiches d'usage, couche texte ; positions d'expert signées ; arbitrage de conflit | 3.2 ; positions versionnées comme un claim (§4.2) | oui | D-251 §4-§5 étendue ; DC-06 amendée | BP-12a (couche texte), BP-12b (positions, arbitrage) |
| Données physiologiques du parcours | Sexe ou statut physiologique **déclaré, jamais déduit** ; statut menstruel ou ménopause ; grossesse et allaitement (existent dans `etatPopulation`) ; « inconnu » explicite ; mineur hors périmètre | oui (même migration que les traitements) | D-xxx listant chaque critère et sa forme ; registre RGPD ; TRUST | BP-13 |
| Traitements et compléments en cours, structurés | Reprend la saisie existante (`anamnese.ts:300`, `:318` : automédication en classes fermées, médicaments en champs distincts) ; classe, début, fin, « inconnu » explicite, déclaré ou confirmé, prescripteur tiers ; ce n'est pas un référentiel médicamenteux normalisé | (même migration) | id. | BP-13 |
| Identité d'auteur | `ProtocolDraft.creePar` ; identité nominative de l'approbateur dans un champ **distinct** ; `approvedBy` garde `'practitioner'`, que lisent la diffusion, le portail et le calendrier | oui | D-xxx d'identité d'auteur | BP-14 |
| Décisions de parcours | Préférences et **refus** du patient par version ; mise en œuvre réelle (début, interruption, reprise, arrêt, motif, déclarant) ; décision de révision (maintenir, ajuster, arrêter ; motif ; version suivante) ; note du praticien ; une table typée par CHECK | oui | D-xxx ; aucune attribution (DC-39) ; invariant testé : aucun de ces événements ne change le jour 0 (D-255) ni les quatre empreintes | BP-15 |
| Prescription validée, figée | Instantané, empreinte, auteur, date, versions des règles et des fiches ; servie sans rejeu ni recontrôle contre une table signée (à la différence de `servicePatient.ts:119`) ; seul contrôle : sa propre empreinte | oui | D-xxx | BP-18a |
| Journal des propositions servies | Étage assistant : proposition servie (versions), geste du praticien (retenue, modifiée, écartée) et motif ; options classées (rang, « ce qui ferait changer », exclue et motif) | oui | D-xxx | BP-19 |
| Proposition contestée | Signalement d'une proposition erronée après ouverture (versions, motif) | oui | D-xxx | BP-22 |
| Contexte de prélèvement (DC-46) | Liste fermée alignée sur `biology_preanalytics.type_condition` plus les champs de DC-46 ; tri-états avec « inconnu » ; activation par fiche d'usage ; préalable de l'évaluateur | oui | D-xxx de forme ; registre RGPD | BP-05 |
| Plages `NUMERIC` versionnées par population (inclusivité, type DC-47, nature DC-20) ; variation biologique sourcée (EFLM, BIVAC) ; bandes de bruit publiées | Préalables de l'évaluateur et des marches 2 et 3 du suivi | oui | D-xxx par variable, acte séparé (D-058 §1) | BP-27 |

**Sans migration** : `analyteCodes` partagé et date du contreseing sur l'attente (D-142, lecteur tolérant avant l'écrivain, banc d'empreinte) ; `serieParAnalyte` (fonction pure ; ne rend jamais « comparable ») ; liste de questions signée ; liens claim ↔ besoin ↔ analyte signés (patron des portes D-246) ; bibliothèque d'options du parcours ; contrat d'action V5 (JSON) ; `FilCardLecture` existant pour l'information acquittée par lecture.

**Règles de données.** Ajout seul partout. Dates jamais confondues : prélèvement, réception, correction, annulation, demande d'exploration, contreseing et échéance, jour 0 (diffusion), début réel, interruption, reprise, arrêt, exposition, check-in, décision suivante. La garde de migration de D-264 §3 (échec si une donnée déjà servie change de sens) devient un critère de done de toute migration. Un merge à la fois, déploiement constaté (D-248). L'invariant « unité du résultat = unité du catalogue » en base précède tout changement d'unité d'un analyte qui porte des résultats. Base légale et AIPD posées (décision du 2026-10-21), règle d'effacement d'une prescription (résidu défini) avant toute ouverture.

### 3.6 Acquis

Catalogue de 85 analytes et resolver signé (D-261, D-263, D-264), import d'un compte rendu (BIO-INGEST LOT-02) : c'est la fondation de l'acquisition, dont BIO-INGEST reste propriétaire (LOT-03 photo et « Relancer la lecture » ; LOT-07, nouveau, avancé avant LOT-04, qui transcrit l'intervalle et le marquage d'anomalie imprimés **avant la purge D-258**). Tout analyte nouveau suit le patron D-261 puis D-263. Deux analytes manquent au catalogue ; ils sont nommés comme limites du premier parcours au Claude Doc.

## 4. Moteur, prescription, suivi, sécurité

### 4.1 Le moteur de propositions

**Étage outil.** Aucun classement, aucune sélection d'après le dossier. La bibliothèque affiche toutes les options de l'hypothèse confirmée, chacune avec ses précautions, sa surveillance, son critère d'arrêt, sa population et la source de sa dose. Le dossier (données physiologiques et traitements déclarés) est juxtaposé, jamais confronté par calcul ; la surface dit que l'admissibilité n'est pas calculée et liste les contrôles non réalisés. « Ne rien changer, ou surveiller » est toujours affiché (NG197 1.2.10). Une option dont les précautions ne sont pas documentées n'entre pas dans la bibliothèque (arbitrage 1(4), DC-38). « Aucune interaction détectée » n'apparaît jamais : aucun contrôle n'est fait à cet étage, et la surface le dit.

**Étage assistant (BP-19, après sa ligne de BP-26).**

- **Ordre de raisonnement** (arbitrage 2, rétabli) : sécurité → besoins fondamentaux documentés et prérequis → retentissement et objectifs → solidité des options → faisabilité et préférences. La sécurité est un **préalable non compensable** : aucun autre argument ne rachète un défaut d'admissibilité. Les dimensions sont comparées côte à côte, sans pondération ; pas de score numérique global, classement par arguments visibles. La priorité clinique d'un besoin n'est pas l'ordre pratique des actions.
- **Trois niveaux** : (1) hiérarchie en quatre groupes — prioritaires ; à accompagner en même temps ; à réévaluer ; insuffisamment documentés (groupe obligatoire : le besoin 2 n'a aucune source de questionnaire) — avec le rang justifié ; (2) cinq questions par intervention : pourquoi cette intervention, pourquoi maintenant, pourquoi cette modalité, qu'en attend-on, quand reconsidérer ; (3) alternatives typées — plus progressive ; adaptée à une contrainte ; conditionnelle à une information manquante — chacune avec ce qu'on gagne, ce qu'on reporte, ce qui reste incertain. Aucune alternative fabriquée ; les options exclues restent accessibles avec leur motif.
- **Composition transversale** : le protocole préféré pour un besoin isolé n'est pas forcément le meilleur composant du protocole global ; arbitrage visible, jamais dissimulé dans un score ; simultanéité confrontée à DC-39 et aux interactions (DC-44). Le classement est une table signée (D-093) ; DC-43 (exclusions curées) précède tout calcul d'admissibilité.
- **Restitution canonique** : « Protocole proposé — voici les besoins à traiter en premier et pourquoi ; la stratégie que je privilégie et son déroulement ; les alternatives pertinentes et leurs compromis ; ce que nous suivrons pour décider de la suite. » Forme courte : « Je propose A parce que… ; B si cette contrainte domine ; C nécessite cette information. » Chaque proposition cite ses données **et** ses claims `identifiant@version`, figés au moment de l'affichage.
- **Note d'impact générée** : objet daté, en ajout seul, pour toute donnée nouvelle : ce que la donnée documente ; ce qu'elle ne permet pas de conclure ; hypothèses renforcées ou fragilisées ; options dont la pertinence change ; réévaluation proposée. Elle propose une révision, n'en applique aucune. Une intolérance ouvre une note **et** suspend la logique automatique (DC-42).
- **Fail-closed par dossier** : admissibilité ou surveillance non énonçable ⇒ « non proposable » ; population de la fiche ⊇ population du patient, sinon non proposable (banc DC-14) ; contrôle d'interaction impossible ⇒ proposition fermée (patron D-056) ; contexte inconnu ⇒ non évaluable, jamais « normal » (DC-24) ; information insuffisante = explicitement manquante.

**Les deux étages.** Aucun LLM ne hiérarchise, ne compose ni n'arbitre (D-003). Le LLM extrait des claims brouillons de dose, durée et précaution que le responsable certifie (DC-16, BP-07) ; il rédige, sous contrat de sortie, le « protocole personnalisé » et les explications à partir du contenu validé, sans valeur biologique ni identité (D-059 §5, pseudonymisation D-252). DC-03 est bloquante pour toute sortie LLM du programme : un identifiant ou un nombre cité qui n'existe pas dans les sources fournies refuse la sortie (BP-01) ; la synthèse existante reste en journalisation (D-011). Aucun apprentissage ne modifie en silence les règles en production.

### 4.2 La prescription (arbitrage 1, niveau 3)

- **Périmètre** : compléments alimentaires et produits hors médicament, jamais de médicament. L'habilitation est close : le responsable est docteur en pharmacie, exercice encadré par le label SIIN. Le statut réglementaire de chaque produit, porté par la fiche, tient le périmètre. Tout besoin qui touche un médicament sort en « à discuter avec le médecin » (`assertRenduMedecinNonPrescriptif`) ; les restrictions `contexteClinique.ts:199` et `anthropic.ts:376` restent en vigueur. La biologie se prescrit par une demande d'examens que le médecin contresigne hors de l'outil ; le praticien consigne la date du contreseing.
- **Contrat d'action V5** (JSON, pas de migration) : forme, dose, unité, fréquence, durée, **source**, précautions, surveillance, critère d'arrêt (DC-38, DC-40), statut réglementaire du produit. La dose est **tirée d'une source, modifiable, jamais calculée** ; une dose modifiée par le praticien est son arbitrage tracé avec motif, pas une source (DC-19). Sans source : « information manquante », jamais une valeur. Quatre sources : corpus de claims ; registre des compléments (`SeuilFonctionnelSource`, `ClinicalRule.doseCible*`) ; référentiels externes certifiés ingérés ; **position d'expert signée** du responsable.
- **Position d'expert signée** (DC-06 amendée en BP-00) : rang dédié, sous les sources certifiées et au-dessus des données observationnelles internes ; pièce versionnée comme un claim (`identifiant@version`, auteur, date, périmètre, population, appuis cités, révision) ; cède devant toute source de rang supérieur qui la contredit ; affichée comme « position du responsable — preuves limitées », jamais comme un consensus ; renseigne une dose affichée et modifiable, ne déclenche jamais de règle automatique. Les référentiels SIIN n'entrent pas comme source.
- **Décisions** : `FORBIDDEN_SUPPLEMENT_FIELDS` et le contrat V4 sont amendés par décision (D-056) ; D-133 (le moteur C4 ne nourrit jamais un protocole) et D-190 §5 (le praticien ne pose que `conditionnelle_biologie`) sont amendées pour qu'une prescription **validée** crée des actions ; un producteur machine suggère une attente, ne la pose jamais (D-190 §3, application serveur vérifiée en BP-04).
- **Plafond d'actions, maintenant (BP-25)** : porté à 7 ; amende D-105, re-signe `baremeChargeV1` **et** `tableRepliV1`, met à jour la garde littérale (`seuilsLitterauxMotives.guard.test.ts`) et la couverture de `tableRepliV1.guard.test.ts`, rejoue les gardes de saisie. Le reste de Phase 5 (catalogue d'actions, complétion IA relue zone par zone sous D-251 §5) suit les fiches. C4 fournit son **modèle de données** (règles, seuils de dose, alertes) sans que la campagne C4 s'ouvre ; l'interdit lexical de C4 est amendé côté praticien par BP-18a et BP-18b (§5.1 ; corrigé au versement : la décision-cadre ne l'amende pas).
- **Servie figée** : une prescription validée est un instantané (`PrescriptionValidee`) avec empreinte, auteur, versions des règles et des fiches ; jamais rejouée ni recontrôlée contre une table signée. Le patron D-251 ne le garantit pas aujourd'hui : `servicePatient.ts:119` recontrôle et peut rendre une fiche indisponible. Seul contrôle : sa propre empreinte. Un claim ou un référentiel modifié produit une **proposition de révision**, jamais une réécriture (DC-15).
- **Préalables** : D-213 §1 exécutée sur la route (BP-23) ; identité d'auteur (BP-14) ; garde DC-03 (BP-01) ; signature qualifiée sur le document (patron D-215 §2) ; DC-42 signée (`SAF-EI-01`, sous réserve que `WN_EI_INTERRUPTION` soit toujours posé, relu en BP-02) ; DC-43 curée.

### 4.3 Restitution au patient (arbitrage 7)

La vue patient — objectifs, **options, bénéfices et risques**, actions retenues avec leur **forme, dose et durée validées**, suivi — est un **document remis à la diffusion**, intitulé « protocole personnalisé » (vocabulaire du registre §1), sur le patron D-251 et D-262 : texte en base HDS, version validée, remise figée et non rejouée, garde du registre anxiogène (D-189 §4). Les mots « prescription », « posologie » et « dosage » restent proscrits côté patient ; la garde lexicale (`fiches-assiette/invariants.ts`) est précisée pour admettre, dans ce seul document, le contenu d'une prescription validée. Ce qui va au patient de biologique est ce que le praticien a validé, rien d'autre. Préférences et refus sont enregistrés avec ce qui comptait pour la personne (NG197 1.2.17) ; une vue des options est une aide à la décision au sens de NG197 1.3.2 et vise un standard de qualité (IPDAS) ; la tension entre NG197 1.4 (chiffres de risque) et les gardes de vocabulaire du dépôt est à arbitrer, pas à contourner. « Rien au patient sans validation. »

### 4.4 Mise en œuvre et suivi (arbitrage 5)

- **Cinq dimensions séparées**, jamais fusionnées : adhésion ; tolérance et sécurité ; évolution clinique et fonctionnelle ; évolution biologique ; objectifs personnels. Pas de succès résumé à une valeur ; pas de causalité avant/après.
- **Échelle à quatre marches** : observation (série datée, motifs de non-comparabilité) ; au-delà du bruit (bande publiée par acte séparé, D-058 §1) ; portée clinique (seuil sourcé) ; attribution (DC-39 et DC-48 armées). Sans bande, le suivi reste à la marche 1 et le dit. Dans l'étage outil, il reste à la marche 1 : les marches 2 à 4 sont des fonctions de l'étage assistant. Un point n'a pas d'évolution. « Amélioration » et « significatif » restent interdits.
- **Temps** : le jour 0 est la première diffusion recevable (D-255, intact) ; début réel, interruption, reprise et arrêt sont des événements datés qui ne le déplacent pas ; seul un pivot relance le calendrier. Un délai de contrôle vient d'un claim de délai ou est « à fixer par le praticien » ; sans délai sourcé, jamais « en retard ».
- **Instruments** : le bénéfice clinique se mesure par un instrument désigné (fatigue : à désigner ; candidat au Claude Doc) sans le présenter comme une mesure validée (D-034) ; l'énergie déclarée aux check-ins s'affiche comme un fait.
- **Révision** : décision persistée avec motif (DC-40) ; dans l'étage outil, la note est rédigée par le praticien et le logiciel liste seulement les données nouvelles ; discordances prévues — mesure favorable sans mieux-être, mieux-être sans changement biologique — sans attribution automatique (DC-27, DC-30) ; avertissement fixe sur toute série.

### 4.5 Sécurité

- **Résultat préoccupant (dette présente, BP-10).** **Étage 1, dans l'étage outil** : le marquage d'anomalie imprimé par le laboratoire, transcrit par BIO-INGEST LOT-07, est restitué tel quel ; un acte de lecture clinique tracé, distinct de la validation d'import, est exigé ; carte « geste » non acquittable par lecture ; destinataire = praticien du dossier ; lettre et `medical_referral` hors borne et non retirable, par la chaîne D-218, D-257, D-262 ; levée et révocation en ajout seul ; notification jamais à échec silencieux. Wellneuro ne lit aucune valeur. **Étage 2, dans l'étage assistant** : cotation signée d'une liste sourcée de constats d'adressage sur valeur (valeurs à sourcer ; les claims d'orientation médicale restent à trouver dans le corpus). Deux régimes au Fil : l'information acquittée par lecture (`FilCardLecture`, existant) et l'appel à un geste (nouvel objet). Précondition nommée de BIO-INGEST LOT-04. Jusque-là, la surface dit qu'elle n'est pas un filet de sécurité (TRUST : « ni service d'urgence, ni surveillance continue »).
- **Sorties d'adressage du premier parcours** (jamais des branches de prescription, DC-31) : liste au Claude Doc (contenu clinique, retiré au versement). Dans l'étage outil, ce sont des rubriques de la fiche (situation hors périmètre, conduite : avis médical) que le praticien lit face aux données déclarées ; leur déclenchement d'après le dossier appartient à l'étage assistant. Source à citer : BSG 2021 (publication officielle, Gut), à ingérer avant affichage.
- **Grille de risques du moteur** (garde-fous exigés) : omission → contrôles non réalisés affichés, abstention motivée (DC-35), revue indépendante des cas d'omission ; fausse réassurance → contexte inconnu non évaluable, sentinelle étendue à toute surface neuve, couverture d'interactions affichée ; surprescription → indication = claim **et** population, dose sourcée, critère d'arrêt, durée bornée par la source, option « ne rien changer » ; interaction non vue → traitements structurés avant toute prescription, référentiel d'interactions certifié et versionné (lequel : incertain), fail-closed ; source périmée → versions figées, proposition de révision, registre daté, cadence de revue fixée par le responsable ; réponse confondue avec bénéfice → cinq dimensions, aucune attribution.

### 4.6 Réglementaire et responsabilité

- **Qualification par fonction (BP-26).** Une note interne, signée par le responsable, reprend chaque fonction du tableau de la section 2 : énoncé de destination, arbre MDR et IVDR (MDCG 2019-11 Rev.1 §3, §3.4, annexe I b), limite « outil », conclusion. Une fonction de l'étage outil s'ouvre dans sa limite ; une fonction de l'étage assistant s'ouvre seulement si sa ligne conclut, et dans la limite que la ligne fixe. Si une ligne conclut à un dispositif médical, la fonction est soit ramenée à sa limite « outil », soit portée par une décision distincte d'assumer la qualification (marquage CE, système qualité, évaluation clinique), que ce cadrage ne prend pas. La note statue aussi sur les fonctions déjà servies qui proposent d'après le dossier (indicationsBiologieV1, orientation) : exemption, régularisation ou réduction, par décision du responsable. Datée, déposée hors dépôt si elle cite des cas.
- **Frontières (BP-00).** `REGISTRE_FRONTIERES.md` §1 est amendé pour le vocabulaire praticien (« prescription » côté praticien), le périmètre hors médicament et la règle des deux étages ; « la qualification dispositif médical s'évite par conception » reste vrai de l'étage outil, et « la finalité revendiquée du logiciel ne dépend pas des diplômes de l'opérateur » est conservée. Sont aussi amendés : `ROADMAP_PRODUIT.md` §2, R4, R5 (le croisement questionnaires × biologie ne passe plus par la synthèse IA) et R9 ; TRUST, par une nouvelle version (une version publiée est immuable, `registre.ts:7`) de niveau « information substantielle », avec nouvel acquittement ; la finalité opposable du dossier RGPD. D-037 est précisée : activité de conseil en compléments hors médicament, encadrée par le label SIIN. Les restrictions exécutables sont nommées et maintenues (§5.1).
- **Décision du 2026-10-21 (hors campagne, premier lot, à prendre avant cette date ; préalable de toute la campagne).** *Au versement : faite, [[D-265]], acceptée et mergée le 2026-10-04 (#1305).* Le régime des dossiers réels en production devient permanent (`REGISTRE_FRONTIERES.md` §1, l. 23), comme l'ouverture du portail G4 (`WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`, l. 805). La base légale et l'AIPD sont posées par le responsable, sur une trame versée au dossier : amendement de `DOSSIER_RGPD.md` rubriques 3, 13 et 14 et de la checklist TRUST (`CHECKLIST_ACTIVATION_G_TRUST_04.md:291`). La voie d'exception de D-234 (transmission au médecin malgré un refus) est **maintenue** : la fermer recréerait le blocage sans fin que D-257 a levé, puisque seule une lettre consignée lève une abstention sur signal d'adressage (D-257 A7) ; sa justification est consignée au dossier RGPD (rubriques 3, 6 et 14). Les trous encore ouverts du dossier reçoivent une échéance fixée par le responsable, puisque la date par défaut disparaît. La dette HDS n'est pas rouverte (D-121). Les commentaires de `adressageFeatureFlag.ts:6` et `portail/featureFlag.ts:12` sont mis à jour. Une information patient nouvelle passe par une nouvelle version TRUST.
- **Évaluation indépendante** : pour l'étage assistant, un évaluateur clinique distinct du signataire et extérieur à l'équipe (question 5) ; `validationExterne` précisée dans la doctrine comme « signature du responsable » ; revue indépendante des preuves au-delà de la catégorie I (N41 §7.3) ; rapport daté, hors dépôt s'il cite des cas.
- **Critères de sortie avant toute ouverture** : statut réglementaire de chaque produit proposé ; assurance de responsabilité civile couvrant la prescription assistée ; transmission au médecin traitant selon le choix du patient, toujours ; base légale et AIPD posées ; règle d'effacement d'une prescription avec résidu ; registre RGPD et version TRUST des tables lues.

## 5. Décisions à amender, lots, chemin critique

### 5.1 Décisions et textes, dans l'ordre des phases

Verdicts : **R** respecter · **P** préciser · **A** amender · **X** exécuter · **arm.** armer une règle orpheline (le geste confié au lot porteur, jamais un état acquis : une règle n'est armée qu'après décision, banc qui tourne et statut). Chaque amendement est une section de la décision-cadre de BP-00, ou une `D-xxx` propre quand un lot la porte, avec son fragment `changelog.d/`.

| Texte | Ce qu'il dit | Verdict | Geste | Lot |
| --- | --- | --- | --- | --- |
| `REGISTRE_FRONTIERES.md` §1 (vocabulaire, finalité) | DM évité « par conception » ; « prescription » proscrit côté patient ; activité « hors prescription médicale » ; finalité indépendante des diplômes | **A** | Vocabulaire praticien ; périmètre hors médicament ; règle des deux étages ; « par conception » maintenu pour l'étage outil | BP-00 |
| `REGISTRE_FRONTIERES.md` §1 (l. 23, l. 805) ; `DOSSIER_RGPD.md` rubriques 3, 13, 14 ; checklist TRUST `:291` ; D-234 ; commentaires `adressageFeatureFlag.ts:6`, `portail/featureFlag.ts:12` | Données réelles et G4 bornés au 2026-10-21 ; base légale et AIPD réservées à un conseil ; voie d'exception sans justification | **A** | Décision du 2026-10-21 (§4.6) ; justification écrite de la route d'exception, maintenue (D-257 A7) | hors campagne, premier lot |
| `contexteClinique.ts:199`, `anthropic.ts:376`, `fiches-assiette/invariants.ts`, `assertRenduMedecinNonPrescriptif` | Pas d'ajustement ni d'arrêt d'un médicament ; pas de dosage par le LLM ; « prescription » côté patient | **R** | Nommées et maintenues par BP-00 : cohérentes avec « hors médicament » et « le LLM rédige seulement » | BP-00 |
| `ROADMAP_PRODUIT.md` §2, R4, R5, R9 | Jamais prescription ; biologie croisée dans la synthèse IA | **A** | R5 sort de la synthèse IA | BP-00 |
| TRUST `registre.ts:44`, `:128`, `:587` ; finalité RGPD | Traitements discutés avec le médecin traitant ; hors diagnostic | **A** | Nouvelle version (les publiées sont immuables), acquittement, registre | BP-24 |
| D-037 | Activité non réglementée | **P** | Conseil en compléments hors médicament, label SIIN | BP-00 |
| D-215 §2 | Qualité « Docteur en Pharmacie » écrite | P | Signature qualifiée sur tout document prescriptif | BP-18b |
| Arbitrage du 2026-08-24 (`FILE_ATTENTE.md:81`) | Règles orphelines : campagne dédiée | **A** nommément | DC-03, DC-38, DC-39, DC-40, DC-41, DC-44, DC-48 ; les autres restent à la campagne dédiée | BP-00 |
| DC-06, DC-19 | Hiérarchie des sources ; aucun seuil inventé | **A**, P | Rang « position d'expert signée » et son contrat de provenance | BP-00 |
| DC-03 | Une justification n'est jamais générée | **arm.** | Bloquante pour toute sortie LLM du programme ; la synthèse existante reste sous D-011 | BP-01 |
| DC-07, DC-13, DC-45 | Catégories, niveau d'exécution, niveaux de mesure | **A** | Nomenclature unique (§3.1) ; DC-13 portée sur l'usage | BP-00 |
| DC-20, DC-47, DC-46 | Nature du seuil ; type de référence ; contexte — textes périmés | **actées, banc dû** (corrigé au versement : « arm. ») | Triade intervalle / seuil décisionnel / cible ; dette DC-46 constatée, liste fermée | BP-00, BP-05 |
| DC-26, DC-17 | Chemin canonique ; hook sur huit fichiers | **A** / P | « Table TS signée + fraîcheur » canonique ; hook étendu | BP-01 |
| D-206 A1, A2, A3 | Unité = tableau clinique ; première table sur axe curé | P | Décision de portée : le module « besoin 2 » n'alimente pas `catalogueConduitesV1`, ne crée aucun axe, ne sélectionne aucun tableau ; garde | BP-00, BP-01 |
| D-208 | Une table signée sert déjà un libellé au patient | R | Garde « aucune phrase » sur les nouvelles structures | BP-01, BP-12a |
| D-213 §1 | La relecture cesse d'être un tampon | **X** | `versions/route.ts:474` | BP-23 |
| D-105 (+ barème D-198, table de repli) | Plafond d'actions = borne de charge | **A** maintenant | Plafond 7 ; deux tables re-signées ; garde littérale mise à jour | BP-25 |
| D-124 §3 | Correction : valeur et unité seulement | **A** | Annulation en ajout seul, patron D-257 §6 | BP-09 |
| D-256 §3 et consigne d'extraction | Ni qualitatif, ni lecture moteur, ni valeurs de référence | **A** partiel | Intervalle et marquage transcrits comme faits du laboratoire ; qualitatif écarté ; D-258 et D-059 §4 intactes | BIO-INGEST LOT-07 |
| D-257 | Levée par lettre ; signaux d'anamnèse | étendre | Étage 1 biologique : acte de lecture clinique, carte « geste », même chaîne | BP-10 |
| D-251 §4, §5 | Texte en base ; régime « adaptée par IA, validée » | étendre | Fiches d'usage, positions signées, « protocole personnalisé » ; la remise d'une prescription ne recontrôle pas | BP-12a, BP-18b |
| D-140, D-063, D-067, D-180 | Claim nommé ; verrou à cinq termes ; dépendances dans le périmètre haché | R | Toute fiche, toute bibliothèque | BP-12a, BP-17 |
| DC-14 (D-095) | Population absente = restriction ; banc dû | **arm.** | Population obligatoire par usage, affichée (étage outil) ; banc « fiche ⊇ patient » (étage assistant) | BP-12a, BP-17, BP-19 |
| DC-54, DC-55 | Pas de fusion ; escalade | R + objet | Conflits du parcours déclarés ; arbitrage de conflit persisté | BP-12b |
| D-122 | Faire parler un résultat au moteur est une règle neuve | P | Le parcours lit un acte praticien (constat), précision expresse ; chaque marqueur de l'évaluateur a sa décision et ses claims | BP-00, BP-11, BP-27 |
| D-059 §4, §5 | L'arbitrage ne porte jamais de valeur ; seul l'import envoie de la biologie à un modèle | R | Objet distinct ; rédaction LLM sans valeur biologique | BP-11, BP-18b |
| D-157 §2, §3, §5, §6 | Juxtaposer est documentaire ; vocabulaire ; toutes les plages ; référentiel laboratoire non servi | R, P, puis A par marqueur | Vocabulaire de chaque surface neuve décidé ; intervalle imprimé juxtaposé comme fait ; évaluateur par marqueur | BP-11, LOT-07, BP-27 |
| D-142 | Un type, deux lecteurs | généraliser | `analyteCodes` et date du contreseing sur les deux véhicules | BP-04 |
| D-190 §3, §5 | Le praticien suspend, n'active pas ; borne aux lignes de la proposition | P puis **A** | Borne §3 testée côté serveur ; §5 amendée pour qu'une prescription validée crée des actions | BP-04, BP-18a |
| D-255, D-052, D-113 | Jour 0 = diffusion ; T0 signé ; ancre immobile | P / R | Début réel distinct ; invariant testé sur le jour 0 et les quatre empreintes | BP-15 |
| DC-24, DC-27, DC-30 | Absent ≠ zéro ; association ≠ causalité ; discordance imposée | P | Contexte inconnu non évaluable ; manque ≠ incitation ; cas biologiques ajoutés | BP-16, BP-20 |
| D-058, D-034 | Pas de qualification sans bande ; pas de validité psychométrique revendiquée | P | Marche 1 dans l'étage outil ; bandes par variable, acte séparé ; l'instrument de fatigue est un repère | BP-20, BP-27 |
| D-056, D-133 | C4 fail-closed sans catalogue ; jamais sur un chemin patient | **A** | Contrat V5 ; dose lisant le registre | BP-18a |
| Interdit lexical C4 ; `FORBIDDEN_SUPPLEMENT_FIELDS` ; lexique patient | Jamais de terminologie prescriptive ; dose refusée ; `posologie`, `dosage` interdits côté patient | **A** côté praticien ; P côté patient | Contenu d'une prescription validée admis dans le seul « protocole personnalisé », mots maintenus proscrits | BP-18a, BP-18b |
| DC-42, DC-43 | Effet indésirable interrompt ; populations filtrent | **arm.** | `SAF-EI-01` signée ; exclusions curées | avant BP-18a |
| D-093, D-112, D-125 | Classement non signé ; appareil jamais servi ; fixture = mécanisme | R | Classement en table signée ; constat d'usage = verrou d'ouverture ; cas fictifs en bancs | BP-19, BP-21a, BP-21b |
| D-081, D-087, D-248, D-264 §3, D-121 | Drapeau né avec son lecteur ; migration seule puis release-db ; un merge à la fois ; garde de migration ; HDS clos | R | Régime commun de tous les lots | tous |
| D-003, DC-16, DC-01, D-011 | Déterminisme ; claim LLM = brouillon ; provenance certifiée ; synthèse journalisée | R | LLM : claims brouillons et rédaction seulement | BP-07, BP-18b |
| `POLITIQUE_REVUE.md` ; `pr-revue-et-release-db.md` | Codex sur tout P0 ; « lot suivant » après une migration | **A** | Codex obligatoire sur migrations, modules cliniques signés et décisions de frontière ; un lot = migration et consommateur, en deux PR | BP-00 |

### 5.2 Les lots

Une campagne, préfixe **BP** ; les identifiants BP-00 à BP-09 du v1 sont conservés et étendus (BP-06 absorbé par BP-05), BP-10 à BP-27 sont nouveaux, BP-12, BP-18 et BP-21 sont scindés en a et b ; les faits du laboratoire forment un lot BIO-INGEST nouveau, LOT-07 ; L0 à L7 deviennent des phases. Un lot = au plus une migration et son code consommateur, en deux PR. Revue : passe Codex obligatoire sur les migrations, les modules cliniques signés et les décisions de frontière ; `wn-reviewer` sur les autres lots P0 (`POLITIQUE_REVUE.md`, amendée en BP-00).

| Lot | Reprend | Objet | Migr. | Décision préalable | Dépend de | Done observable | Drapeau |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Préalable — hors campagne** |  |  |  |  |  |  |  |
| Décision du 2026-10-21 — *faite (D-265, #1305)* | B10, contre-revue d'architecture | Pérennise les données réelles en production et le portail G4 ; base légale et AIPD posées par le responsable ; voie d'exception D-234 maintenue, sa justification consignée (la fermer rebloquerait les dossiers signalés, D-257 A7) ; commentaires des drapeaux mis à jour (§4.6) | non | D-xxx du responsable, datée avant le 2026-10-21 | — | reconduction signée ; registre, `DOSSIER_RGPD.md` et checklist TRUST amendés ; pièces datées | aucun |
| **Phase 0 — Destination, gouvernance, gardes** |  |  |  |  |  |  |  |
| BP-00 | v1 BP-00 (étendu), L0 | Décision-cadre groupée, en sections numérotées : arbitrages des trois séries ; deux étages et limites par fonction ; nomenclature unique ; frontières (§4.6) ; restrictions exécutables maintenues ; portée face à D-206 ; orphelines reprises ; DC-06 ; précisions D-122 et D-059 §4 ; convention de lot et `POLITIQUE_REVUE.md` ; constat d'usage = verrou d'ouverture ; critères d'acceptation écrits **avant** ; constantes produit ; dette DC-46 | non | D-xxx du responsable | — | D-xxx, fragment, `CAMPAGNE.md`, fiches `lots/`, `FILE_ATTENTE.md` (entrée parapluie ; `:77`, `:78` closes), cadrage BIO-INGEST amendé (LOT-07 ; BP-10 → LOT-04), règle release-db alignée | aucun |
| BP-26 | B9, contre-revue d'architecture | Note de qualification par fonction (§4.6) ; statue sur les fonctions déjà servies (`indicationsBiologieV1`, orientation) : exemption, régularisation ou réduction | non | décision du responsable sur les fonctions déjà servies | BP-00 | note datée et signée, une ligne par fonction, existant compris | — |
| BP-01 | v1 BP-01 | Gardes avant surface : empreintes égales avec et sans résultats **sur le chemin documentaire**, entrées décisionnelles du nouveau module tracées ; import de `biology-library` interdit hors liste blanche nominative ; non-consommation des faits du laboratoire hors modules autorisés ; sentinelle étendue (mots, couleur, priorité) ; hook DC-17 étendu ; « aucune phrase » dans une structure signée ; vérificateur DC-03 bloquant ; module « besoin 2 » hors `catalogueConduitesV1` | non | aucune | BP-00 | T2 vert sur le code actuel ; les mutations décrites par la contre-revue rougissent | aucun créé (D-081) |
| BP-02 | v1 BP-02, M12 | Constat d'usage et ligne de base, en agrégats par identifiant (résultats, lignes candidates par statut, refus d'unité, imports non décidés, attentes, diffusions, check-ins, comptes, `clinical_rules`, `SAF-EI-01`, `WN_EI_INTERRUPTION`, `WN_C4_ENABLED`) | non | aucune | — (seul lot hors BP-00 : lecture seule) ; décision du 2026-10-21 s'il a lieu après cette date | note datée ; session hors mode auto | — |
| BP-23 | D-213 §1 | Relecture réelle : `review` nul quand la coche est fausse ; la validation pour diffusion reste un second verrou | non | D-213 §1 | BP-01 | banc sur la route des versions, pas seulement l'interface | aucun |
| BP-25 | Phase 5, A6 | Plafond d'actions porté à 7 : barème et table de repli re-signés, garde littérale et couverture mises à jour, gardes de saisie rejouées | non | D-xxx amendant D-105 | BP-00 | signatures à cinq termes ; gardes vertes à 7 | aucun |
| LOT-07 (BIO-INGEST, nouveau) | B12 | Faits du laboratoire transcrits (§3.5) ; LOT-05 (adaptateur laboratoire) inchangé | oui | consigne D-256 amendée ; D-157 précisée | BP-00, BP-01 | release-db constatée ; contrat de staging mis à jour ; un intervalle transcrit ne produit ni statut, ni couleur, ni priorité | né avec le code |
| BP-10 | M1, §9 | Sécurité biologique, étage 1 (§4.5) | oui | D-xxx de sécurité biologique, qui consigne aussi BP-10 → BIO-INGEST LOT-04 | BP-02, LOT-07 | release-db constatée ; banc « import validé sans lecture → signalé » ; précondition de BIO-INGEST LOT-04 | né avec le code |
| **Phase 1 — Fondations** |  |  |  |  |  |  |  |
| BP-09 | v1 BP-09 | Annulation d'un résultat, ajout seul, motif fermé | oui | D-xxx amendant D-124 §3 | BP-00 | release-db constatée ; résultat annulé hors élection, séries et réveils | sous `isCbResultsEnabled` |
| BP-07 | v1 BP-07, L1 réduit | Dossier de preuve remis à Curation signée : claims par rubrique, population par usage, conflits déclarés, claims douteux relus (WN-CL-0241-008, WN-CL-0031-025) ; claims brouillons de dose, durée et précaution extraits par LLM, nombres vérifiés contre le chunk, certifiés par le responsable ; positions d'expert là où rien ne chiffre ; exclusions DC-43 curées | non | signature par Curation signée | BP-00 | identifiants par rubrique ; aucun texte au dépôt | — |
| BP-12a | L1, M3 | Fiches d'usage : vocabulaire d'hypothèses, structure signée en module distinct, couche texte en base ; contrat de fraîcheur étendu | oui | D-xxx étendant D-251 | BP-07 | release-db constatée ; validation par acte daté ; hook DC-17 étendu à la structure | — |
| BP-12b | M4, M9 | Positions d'expert signées, versionnées comme un claim ; arbitrage de conflit persisté | oui | D-xxx d'arbitrage de conflit ; DC-06 amendée (BP-00) | BP-12a | release-db constatée ; `conflitsSourcesV1` re-signé | — |
| BP-13 | M5, §3, §7 | Données physiologiques déclarées + traitements et compléments en cours, à partir de la saisie existante | oui | D-xxx des critères et du modèle ; registre RGPD et TRUST avant | BP-00 | « inconnu » explicite ; effacement testé | éteint |
| BP-14 | §7, O1 | Identité d'auteur séparée du rôle : `ProtocolDraft.creePar`, approbateur nominatif dans un champ distinct, `approvedBy` inchangé | oui | D-xxx d'identité d'auteur | BP-00 | bancs nominatif et historique sur la diffusion, le portail et le calendrier ; aucun lecteur existant cassé | éteint |
| BP-03 | v1 BP-03 | `serieParAnalyte`, jour n depuis la diffusion, trois dates et annulation | non | BP-00 | BP-01, BP-09 | fixtures ; aucun delta | né avec le code |
| BP-04 | v1 BP-04 | Attente typée `analyteCodes` et date du contreseing sur les deux véhicules ; borne D-190 §3 testée serveur ; règle de l'attente sans date de contreseing (fail-closed ou déclarative explicite) | non | D-xxx de contrat (D-142) | BP-01, BP-09 | lecteur tolérant avant l'écrivain ; banc de hash V4 et C4 ; attente ancienne « non typée » | aucun |
| BP-05 | v1 BP-05, BP-06 (absorbé) | Contexte de prélèvement typé ; préalable de l'évaluateur, hors du chemin de l'étage outil | oui | demande explicite ; registre avant | BP-00, BP-03 | contrat négatif par forme ; inconnu par défaut | sous drapeaux existants |

| Lot | Reprend | Objet | Migr. | Décision préalable | Dépend de | Done observable | Drapeau |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Phase 2 — Premier parcours, étage outil** |  |  |  |  |  |  |  |
| BP-11 | §3.4 | Constats du praticien : objet distinct, quatre états, pièces par identifiant, vocabulaire signé | oui | D-xxx d'objet ; D-122 précisée ; registre RGPD | BP-09, BP-12a | contrat négatif propre à la table ; correction ou annulation ⇒ « à relire » | `WN_BIO_CONSTAT`, né avec le code |
| BP-16 | L2, L3 sans évaluateur | Boucle d'exploration : question choisie, analytes de la question, demande à contresigner, attente, lecture juxtaposée avec faits du laboratoire, constat, réveil, arbitrage sans pré-remplissage ; cartes Fil « information » | non | — | BP-03, BP-04, BP-11 | E2E fixture ; aucun état sans geste ; aucune valeur lue ; empreintes du chemin documentaire inchangées | posé à l'ouverture a (BP-21a) |
| BP-15 | §8.1, M, DC-40 | Décisions de parcours (préférences et refus, début réel, interruption, reprise, arrêt, révision, note du praticien), une table typée par CHECK | oui | D-xxx de véhicule ; D-255 précisée | BP-00 | release-db constatée ; contrat négatif ; bancs comparatifs du jour 0 et des quatre empreintes | éteint |
| BP-20 | L5, v1 BP-08 | Suivi factuel : frise, cinq dimensions à la marche 1, revue de cycle en deux colonnes, note du praticien, décision persistée, nouvelle version ; **jalon J1** | non | D-xxx de suivi | BP-15, BP-16 | aucune version réécrite sans geste ; avertissement d'attribution ; E2E | `WN_SUIVI_REVISION` |
| BP-08 | v1 BP-08 | Indicateurs de processus (sans attribution) | non | D-xxx d'indicateurs | BP-20 ; un cycle réel arrivé à J21 | agrégats au conteneur | — |
| BP-17 | L4a | Bibliothèque signée des options par hypothèse : options, précautions, surveillance, critère d'arrêt, population, source de dose ou « information manquante », statut réglementaire du produit ; aucune sélection d'après le dossier | non | D-xxx de premier usage prescriptif (arbitrage 1) | BP-11, BP-12b | signature à cinq termes ; hook DC-17 ; aucune option sans précautions | — |
| BP-18a | §7, Phase 5, C4B | Prescription niveau 3 : choix dans la bibliothèque, contrat V5, prescription figée servie sans rejeu ni recontrôle | oui | D-xxx amendant D-056, D-133, D-190 §5 ; DC-42 signée | BP-01, BP-14, BP-17, BP-23 | release-db constatée ; retrait du drapeau sans perte ; aucune dose sans source ; aucun médicament | distinct, éteint |
| BP-18b | §4.3, D-251 | « Protocole personnalisé » : rédaction sous contrat de sortie et garde DC-03, signature qualifiée, remise figée ; garde lexicale précisée pour ce seul document | selon (patron D-251) | D-215 §2 précisée | BP-18a | aucune sortie LLM sans contrôle DC-03 ; document remis jamais rejoué | celui de BP-18a |
| **Phase 3 — Ouvertures de l'étage outil** |  |  |  |  |  |  |  |
| BP-24 | §11, M11 | Conformité : TRUST nouvelle version et acquittement, registre RGPD, règle d'effacement avec résidu, statut des produits, RC professionnelle | non | décision du 2026-10-21 ; D-xxx | BP-13, BP-14, BP-18b | pièces datées du responsable, hors dépôt | — |
| BP-21a | L6, M2, M16, O2 | Ouverture J1 (exploration, constat, suivi factuel, étage 1 de sécurité) : épreuve sur les trois fixtures, contre-revue adverse **avant** clôture, constat d'usage du palier précédent, drapeaux testés posé puis retiré, effet constaté par sonde ; BP-02 refait | non | D-xxx d'ouverture J1 | BP-10, BP-20, BP-26 | critères écrits avant, atteints | pose |
| BP-21b | L6, O2 | Ouverture de la prescription, même régime que BP-21a | non | D-xxx d'ouverture de la prescription | BP-21a, BP-18b, BP-24 | critères écrits avant, atteints | pose |
| BP-22 | §8.3, M17 | Observation après ouverture : propositions contestées (ajout seul), agrégats au conteneur, revue périodique des sources | oui | D-xxx | BP-21a | signalement tracé ; cadence fixée | — |
| **Phase 4 — Étage assistant** (développement derrière drapeau ; chaque ouverture après sa ligne de BP-26 et le constat d'usage de l'étage outil) |  |  |  |  |  |  |  |
| BP-27 | L3 | Évaluateur par marqueur : lit la valeur, **propose** un constat à confirmer ; plages `NUMERIC` par population, variation biologique, bandes, politique de discordance signée, contexte DC-46 exigible, D-157 amendée par marqueur, faits du laboratoire si la règle les exige | oui | une D-xxx par marqueur et par usage, avec ses claims (D-122) | BP-03, BP-05, BP-12a, BP-13, LOT-07 | propose, ne pose jamais ; aucune ouverture avant sa ligne | par marqueur |
| BP-19 | L4b, §6, §8.3 | Stratégie proposée d'après le dossier : « Protocole proposé », quatre groupes, alternatives typées, admissibilité calculée, « non proposable », contrôles non réalisés, note d'impact générée, révision proposée, journal des propositions servies ; consomme BP-27 s'il est ouvert | oui (journal) | D-xxx ; DC-43 curée ; classement signé (D-093) | BP-13, BP-15, BP-17, BP-20 | E2E fixture ; aucune proposition sans précautions | `WN_ASSISTANT_PROPOSITION`, éteint |
| Étage 2 du résultat préoccupant ; marches 2 à 4 du suivi ; proposition de bilan d'après le dossier | — | Une fonction par lot | selon | une D-xxx par fonction | BP-27 selon le cas | ligne de BP-26 | par fonction |
| **Phase 5 — Extension** | L7 | second parcours (détail au Claude Doc) ; contre-épreuve sur le besoin 5 (axe curé) ; puis par situation clinique | selon | une D-xxx par parcours | BP-21b | — | — |

### 5.3 Préalables et chemin critique

Une flèche A → B signifie que B ne démarre pas, ou ne se clôt pas, sans A. Un lot qui avance en parallèle peut bloquer : il figure ici dès qu'il est une entrée obligatoire.

- Décision du 2026-10-21 (premier lot, hors campagne ; *faite, D-265*) → BP-02 s'il a lieu après cette date, BP-24 et les deux ouvertures ; sans reconduction écrite au 2026-10-21, plus aucun lot ne travaille sur dossiers réels.
- BP-00 → tout lot de la campagne, sauf BP-02 (lecture seule).
- BP-01 + BP-09 → BP-03 ; BP-01 + BP-09 → BP-04.
- BP-07 → BP-12a → BP-12b ; BP-09 + BP-12a → BP-11.
- BP-03 + BP-04 + BP-11 → BP-16.
- BP-15 + BP-16 → BP-20 (jalon J1).
- BP-11 + BP-12b → BP-17.
- BP-01 + BP-14 + BP-17 + BP-23 + DC-42 signée → BP-18a → BP-18b.
- BP-13 + BP-14 + BP-18b + décision du 2026-10-21 (*faite, D-265*) → BP-24.
- BP-00 + BP-01 + consigne D-256 amendée → BIO-INGEST LOT-07 ; LOT-07 + BP-02 → BP-10 ; BP-10 → BIO-INGEST LOT-04.
- Ouverture a (BP-21a) : BP-10 + BP-20 + BP-26 + constat d'usage + registre et TRUST des tables lues.
- Ouverture b (BP-21b) : BP-21a + BP-18b + BP-24.
- Étage assistant : BP-03 + BP-05 + BP-12a + BP-13 + LOT-07 → BP-27 ; BP-13 + BP-15 + BP-17 + BP-20 → BP-19 ; chaque ouverture : sa ligne de BP-26 + le constat d'usage de l'étage outil.
- BP-25 et BP-26 : indépendants, après BP-00 ; BP-26 statue sur les fonctions déjà servies.

**Chemin critique de l'étage outil :** BP-00 → BP-07 → BP-12a → BP-12b → BP-17 → BP-18a → BP-18b → BP-24 → BP-21b. **Branche J1 :** BP-12a → BP-11 → BP-16 → BP-20 → BP-21a ; elle n'attend plus les positions d'expert (BP-12b). BP-07 porte la cadence de signature du praticien : c'est lui qui fixe le rythme. La décision du 2026-10-21 précède tout, hors campagne.

**En parallèle, dès maintenant :** la décision du 2026-10-21 (premier lot ; *faite, D-265*) ; BP-02 ; BIO-INGEST LOT-03. Après BP-00 : BP-01, puis BIO-INGEST LOT-07 ; BP-25, BP-26, BP-09, BP-13, BP-14, BP-15, BP-23 en développement, leurs `release-db` sérialisées. L'étage assistant (BP-05, BP-27, BP-19) se développe derrière drapeau dès que ses préalables sont livrés ; il n'ouvre qu'après le constat d'usage.

**Ordre recommandé des `release-db`, une à la fois (D-248) :** LOT-07, BP-10, BP-09, BP-12a, BP-11, BP-12b, BP-13, BP-14, BP-15, BP-18a, BP-18b s'il porte une migration, BP-22 ; puis BP-05, BP-27, BP-19. Gestes humains : la décision du 2026-10-21 ; ces `release-db` ; les signatures du praticien (BP-07, BP-12a, BP-12b, BP-17, BP-25) et la note BP-26 ; les deux décisions d'ouverture.

**Régime commun.** Migration seule → `release-db` approuvée → constat au conteneur → code consommateur, dans le même lot ; garde D-264 §3 sur toute migration qui change le sens d'une donnée servie ; un drapeau naît dans le premier lot qui le lit, pose datée, effet constaté par sonde ; registre RGPD et note patient avant toute table neuve ; aucune fixture hors Sophie Nicola, Jennifer Martin, Michel Dogné ; aucun texte clinique au dépôt.

## 6. Premier parcours, cas fictifs, validation, réussite, arbitrages

### 6.1 Le premier parcours

**Nom.** « Exploration du besoin 2 » ([[D-266]] §6). La fatigue est un carrefour et un motif d'explorer, pas un axe (`priorityRulesV1.ts:432`) ; D-206 A1 n'ouvre aucune table sur un axe fatigue ; le parcours vit donc en module signé distinct. Le besoin 2 n'a aucune source de questionnaire (`constants.ts:287`) : le parcours vise un besoin aveugle au score, et le dit.

**Contenu clinique — au Claude Doc seulement.** La justification du choix, la population visée, les rubriques des claims, les discordances, les conditions, les sorties d'adressage et les sources externes à ingérer vivent dans le Claude Doc privé (rev 67), jamais au dépôt (D-251 §4). Le dépôt ne garde que les identifiants des claims du dossier, version v1.0, sans rubrique : WN-CL-0031-025, WN-CL-0044-003, WN-CL-0048-015, WN-CL-0061-006, WN-CL-0061-007, WN-CL-0061-011, WN-CL-0061-013, WN-CL-0062-042, WN-CL-0063-007, WN-CL-0112-012, WN-CL-0125-033, WN-CL-0150-014, WN-CL-0154-051, WN-CL-0161-044, WN-CL-0161-045, WN-CL-0166-041, WN-CL-0235-012, WN-CL-0240-005, WN-CL-0241-001, WN-CL-0241-005, WN-CL-0241-008, WN-CL-0241-016, WN-CL-0241-020, WN-CL-0312-012, WN-CL-0330-031, WN-CL-0358-022, WN-CL-0361-009, WN-CL-0377-015, WN-CL-0385-019, WN-CL-0387-013. Deux analytes utiles au parcours manquent au catalogue ; ils sont nommés comme limites au Claude Doc.

**Règles de structure** (sans contenu clinique). Dans l'étage outil, aucune position automatique face à une plage : l'évaluateur (BP-27) n'ouvre qu'après sa ligne de BP-26. Les données physiologiques déclarées (BP-13) sont juxtaposées à la population de la fiche ; un mineur est hors périmètre. Dose, durée et délai de contrôle sont tirés d'une source (claim, registre, référentiel ou position d'expert signée), sinon « information manquante ». Les sorties d'adressage sont des rubriques de la fiche, jamais des branches de prescription (DC-31) ; leur déclenchement d'après le dossier appartient à l'étage assistant.

**La boucle couverte, étage outil.** Compréhension → question choisie → analytes de la question → demande d'examens contresignée → attente typée → lecture juxtaposée avec les faits du laboratoire → constat du praticien → bibliothèque des options de l'hypothèse → choix, dose sourcée ou « information manquante » → prescription figée et « protocole personnalisé » → diffusion → début réel → suivi factuel en cinq dimensions → note du praticien → révision. L'étage assistant y ajoute ensuite le constat pré-proposé, le classement, la note d'impact générée et les marches 2 à 4.

**Contre-épreuve et extension.** Une contre-épreuve sans prescription sur le besoin 5 (axe curé au sens de D-206, instruments déjà branchés) éprouve le suivi sans risque de dose. Un second parcours éprouve ensuite le modèle des traitements et l'adressage sans délai. Détail clinique : au Claude Doc.

### 6.2 Les trois cas fictifs (D-125)

Deux usages : **(a)** épreuve documentaire, sans code — chaque cas est déroulé contre chaque section avant d'arrêter ce cadrage ; **(b)** bancs E2E en BP-21a et BP-21b, sur les trois fixtures seulement. Aucun ne prouve un parcours réel. Les cas se décrivent ici par le **mécanisme** qu'ils éprouvent ; leur contenu clinique est au Claude Doc.

| Cas | Mécanisme éprouvé |
| --- | --- |
| Sophie Nicola | Parcours nominal de l'étage outil, de la question choisie au « protocole personnalisé » remis ; constat « confirmée » avec ses pièces ; dose sourcée ou manquante ; suivi à la marche 1 sans attribution ; révision motivée ; une rubrique d'adressage. Étage assistant, plus tard : constat pré-proposé, classement. |
| Jennifer Martin | Pièce attendue inconnue → constat « non évaluable » ; aucune option retenue ; effet indésirable déclaré → suspension DC-42 et autre option de la bibliothèque ; mieux-être sans changement biologique → aucune attribution. Étage assistant : « non proposable » calculé. |
| Michel Dogné | Population déclarée hors de celle de la fiche, jamais déduite → rubrique d'adressage (lettre, `medical_referral`) ; résultat marqué par le laboratoire (fait transcrit) → étage 1 de sécurité (carte « geste », acte de lecture tracé). Étage assistant : sortie d'adressage déclenchée d'après le dossier ; variante donnée inconnue ⇒ « non proposable ». |

**Épreuve documentaire contre la v3 (étage outil).** Faite sur Sophie Nicola ; son déroulé est au Claude Doc. Chaque section tient ; trois manques sont déjà des lots : données physiologiques (BP-13), instrument de suivi du bénéfice (question 3), faits du laboratoire (BIO-INGEST LOT-07).

### 6.3 Validation par usage (arbitrage 6)

Cinq étapes nommées : sources et règles ; vérification technique sur cas fictifs ; évaluation clinique indépendante (étage assistant) ; conditions réelles dans un cadre autorisé ; surveillance après ouverture. Critères d'acceptation **écrits avant** (BP-00). Le constat d'usage verrouille chaque ouverture, jamais le développement. Contre-revue adverse avant clôture (patron D-108) ; chaque retrait est un drapeau réel testé « posé puis retiré », jamais une retenue de gouvernance (D-093, D-163) ; la désactivation empêche de nouvelles propositions sans faire disparaître prescriptions validées, historique ni suivi ; aucun apprentissage ne modifie en silence les règles en production ; proposition contestée tracée (BP-22) ; l'évaluation mesure les omissions, pas l'acceptation.

### 6.4 Définition de réussite

Le premier parcours est abouti quand, dans l'étage outil, le praticien peut partir d'informations vérifiées, poser ses constats, comparer des options sourcées, valider une prescription, la remettre au patient, suivre sa mise en œuvre et réviser sa décision à partir des résultats. Observable : les trois cas passent en banc, rubriques d'adressage comprises ; chaque option servie cite ses claims ou sa position signée `identifiant@version` ; aucune option sans précautions ; aucun médicament ; aucune version ni aucun constat réécrit sans geste ; chaque fonction ouverte a sa ligne de la note de qualification ; les deux ouvertures sont décidées par D-xxx ; au moins un cycle réel arrive au jalon de fin, constaté au conteneur en agrégats. **Jalon J1** (après BP-20) : la boucle sans prescription est utile seule et peut être observée avant l'ouverture prescriptive. L'étage assistant a sa propre définition de réussite, écrite avant son ouverture.

### 6.5 Arbitrages du responsable et questions restantes

**Tranché le 2026-10-04.**

- **Brainstorming (arbitrages 1 à 8, onglet principal)** : posologie de niveau 3 ; jamais de proposition sans précautions ; ordre sécurité → besoins → objectifs → solidité → faisabilité ; trois statuts d'usage ; cinq dimensions de suivi ; validation par usage.
- **Première série** : constats du praticien d'abord ; frontières amendées par la décision-cadre de BP-00 ; règles orphelines par amendement nommé (liste étendue à DC-03 par la seconde série) ; parcours « exploration du besoin 2 », module signé distinct de `catalogueConduitesV1`.
- **Seconde série** : habilitation close, prescription de compléments et produits hors médicament, biologie contresignée par un médecin ; proposition d'après le dossier, lisant constats et valeurs brutes, comme cible de l'étage assistant ; régime des dossiers réels en production rendu permanent au 2026-10-21, base légale et AIPD posées par le responsable ; position signée du responsable comme source de dose (pas les référentiels SIIN) ; intervalle et marquage du laboratoire transcrits avant la purge ; « protocole personnalisé » portant la dose ; plafond porté à 7 maintenant ; constat d'usage = verrou d'ouverture ; LLM : claims brouillons et rédaction seulement ; DC-03 bloquante pour le programme ; dépôt public ; un lot = migration et consommateur en deux PR, Codex ciblé, décision-cadre groupée.
- **Reprise après la contre-revue** : « outil d'abord, note de qualification par fonction » (remplace « aucune analyse ») ; voie d'exception de D-234 fermée — arbitrage repris le même jour : maintenue, car la fermer recréerait le blocage levé par D-257 A7 ; position signée en rang dédié, affichage seul ; contreseing par une demande hors de l'outil.

**Questions restantes** (aucune ne conditionne BP-00 ; *au versement, 1, 6 et 7 sont tranchées par D-266 — restent 2 à 5*) :

1. **Nomenclature.** *Tranchée par D-266 §3 : table explicite.* Correspondance nature du lien ↔ statut d'usage. *Recommandé : table explicite, sans règle par défaut ; une piste exploratoire reste en espace de réflexion.*
2. **Preuves.** Sources externes ingérées en claims certifiés avant tout affichage ? *Recommandé : oui, avec WN-SRC-0187 et WN-SRC-0267.* Curation limitée aux claims des fiches signées, relue par le responsable ? *Recommandé : oui.* Lire en intégral les sources et le claim désignés au Claude Doc avant de décider si un marqueur devient un contexte requis ? *Recommandé : oui ; d'ici là affiché, non exigé.*
3. **Instrument de fatigue.** Énergie des check-ins ou instrument sourcé (candidat au Claude Doc) ? *Recommandé : instrument sourcé, présenté comme repère (D-034).*
4. **Vue patient.** Options, bénéfices et risques sans chiffres d'abord (NG197 1.4 face aux gardes de vocabulaire), décision séparée ensuite ? *Recommandé : oui.*
5. **Évaluateur indépendant de l'étage assistant.** Qui, quand, sur quels critères ? *Recommandé : extérieur à l'équipe, avant l'ouverture de la première fonction de l'étage assistant.*
6. **Constantes produit** (BP-00) — *tranchée par D-266 §14 : nommées, chiffrées par le lot consommateur* : plafond de questions ouvertes, fiches validées par séance, seuil d'usage réel avant ouverture, effectif minimal pour masquer un agrégat, cadence de revue des sources.
7. **Rang.** *Tranchée par D-266 §15 : campagne parallèle, LOT-07 avant LOT-04.* Une campagne BP ; BIO-INGEST LOT-03 continue, LOT-07 (faits du laboratoire, nouveau) avancé avant LOT-04 ; Curation signée et C4 consommées, pas rouvertes. *Recommandé : oui.*

**Question ajoutée par la révision 3.1** (elle conditionne BP-26, pas BP-00) : le sort des fonctions déjà servies qui proposent d'après le dossier (`indicationsBiologieV1`, orientation) — exemption, régularisation ou réduction. À trancher fonction par fonction dans la note BP-26.

### 6.6 Prochaine action

1. *Au versement : fait (D-265, #1305).* **Premier lot, hors campagne, avant le 2026-10-21** : la décision qui pérennise les données réelles en production et le portail G4, fait poser base légale et AIPD par le responsable (trame à compléter) et maintient la voie d'exception — une PR de documentation, sans code fonctionnel.
2. Épreuve documentaire des cas Jennifer Martin et Michel Dogné contre cette v3.1.
3. Versement au dépôt par PR de doc (`docs/claude/campagnes/`), identifiants de claims seulement, remplaçant le v1 ; entrée parapluie dans `FILE_ATTENTE.md`.
4. BP-00 en mode Plan, dans sa propre session : il ouvre la campagne et amende le cadrage BIO-INGEST (LOT-07 ; BP-10 → LOT-04) ; sa décision-cadre passe la revue Codex (décision de frontière). Pas de nouvelle contre-revue du cadrage sans fait nouveau.
5. BIO-INGEST : LOT-03 (photo, « Relancer la lecture »), puis LOT-07 avant LOT-04 ; LOT-05 (adaptateur) à son rang.
