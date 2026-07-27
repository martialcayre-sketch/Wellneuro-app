# Rayon « Biologie fonctionnelle » de la bibliothèque — cadrage CB-00

Date : 2026-07-25. Statut : **proposition à relire par le praticien**. Aucun
code, aucune migration, aucune ingestion dans cette campagne de cadrage : le
présent document est le seul livrable (même nature que le LOT-00 de la
certification, PR #359, et que la proposition du rayon compléments C4).

## §0 — Nature de la campagne

Campagne **additive**, pendant biologie du rayon compléments C4. Code retenu
(décision 0, actée le 2026-07-25) : **CB** (« Catalogue Biologie »), scindé
comme C4 en **CB-A** (catalogue intrinsèque, data-first, aucune donnée patient)
et **CB-B** (lecture contextuelle du dossier), flag `WN_CB_ENABLED`. Le code C4
étant déjà pris (flag `WN_C4_ENABLED`, migration
`20260724133000_c4_supplement_product_catalogue` en base) et C5 occupé par
`food-compass`, CB évite toute collision.

La campagne est **subordonnée à la campagne de certification du corpus des
questionnaires** en cours (`docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/`) :
elle n'en réordonne aucun lot, et son moteur (§5) ne touche pas à la table de
règles NNPP2 tant que les lots 8-9 de la certification ne l'ont pas établie et
signée.

Déclaration liminaire, qui structure tout le document : le rayon a **deux
étages** séparés par le mur HDS (§2). L'étage documentaire est constructible
dès maintenant ; l'étage « résultats patient réels » est derrière un gate dur.

## §1 — Existant vérifié (2026-07-25)

Le terrain est déjà largement préparé ; le rayon biologie n'invente presque
aucune frontière, il en réplique.

### La doctrine s'applique intégralement

« Le RAG certifie, source et explique. Le moteur déterministe calcule. Le
graphe clinique (règles signées) choisit les explorations possibles. L'IA
rédige la synthèse. » L'IA n'est **jamais décisionnaire en runtime** ; elle
rédige en aval, bornée aux candidats produits par le moteur.

### Le point d'ancrage protocole existe déjà

- `ProtocolActionType` contient **`biological_exploration`**
  (`web/src/lib/clinical-engine/types.ts:277`), affiché « Exploration
  biologique à discuter » dans `ProtocolMiniBuilder.tsx`.
- Le contrat protocole V3 (`SupplementCatalogRef`, PR #340) fournit le patron
  exact d'une référence catalogue **opaque et gouvernée**, contrainte à un seul
  type d'action, posée uniquement par le praticien — jamais par l'IA, jamais en
  texte libre. Un futur `BiologyCatalogRef` (V4) en serait le miroir.

### Le moteur d'orientation est prêt à étendre

- `web/src/lib/clinical/orientationEngine.ts` : fonction pure
  `evaluerOrientation` ; l'union `CibleExploration` (l.43) vaut aujourd'hui
  `questionnaire | pack` — extensible.
- `web/src/lib/clinical/orientationRulesV1.ts` : table de règles **vide**,
  sha-256, `justificationClaims` jamais vide, niveaux
  `socle | approfondissement | specialise`, statuts
  `brouillon | publiee | suspendue`.
- Route `GET /api/praticien/orientation` : **double verrou fail-closed**
  (`WN_ENABLE_ORIENTATION_NNPP2` **et** table signée
  `validationExterne + dateValidation + claimsSource`). Réponse neutre
  « en cours de constitution » tant qu'inactif, avant toute lecture du dossier.
- Jamais d'auto-assignation ; filtre dur d'administrabilité ; exclusions A-009.

### Le patron de rayon C4 est implémenté et réutilisable

Domaine `web/src/lib/supplement-library/` (PR #337→#353) : `featureFlag`
fail-closed / `config` (vocabulaires fermés, secret d'ingestion ≥ 32 car.) /
`auth` Bearer à temps constant / `types` (contrats versionnés, refus des
échelles étrangères) / moteur déterministe / sentinelle (candidats de flags,
jamais écrits) / `catalogue` (dimensions nommées, **jamais de score global**,
facettes indépendantes, tri neutre) / `ingest` (**brouillons seulement**,
décision C4 n°11, idempotence sha-256, pointeur de version courante) /
`gouvernance` (règles append-only, statuts dérivés, signature praticien).
Barrière **D-003 dans le SQL** (`match_wellneuro_rag_claims`), tables pgvector
hors Prisma (`tables.external`).

### Le dossier patient exploitable par le moteur

- ~60 instruments dans `QUESTIONNAIRE_CATALOGUE` (`web/src/lib/questions.ts`),
  scores stockés dans `QuestionnaireReponse.scoresJson` (total, sous-scores,
  interprétation warning/danger).
- 12 besoins × 3 strates (`web/src/lib/equilibre/`), fondations critiques
  [1, 2, 4, 5, 9] ; le niveau de preuve **C = « biologie fonctionnelle
  interprétative » figure déjà dans la taxonomie** (`equilibre/types.ts`).
- Référentiels sans donnée patient : `NeuroAxis` (axes ↔ besoins,
  `niveauPreuve`), `NutrientAxisWeight` (axe ↔ nutriment, direction, poids,
  `seuilReference`), `CiqualNutrientValue`.
- Protocole = chaîne versionnée append-only (`ClinicalSnapshot →
  ClinicalReview → DecisionCard → ProtocolDraft → diffusion`), check-ins
  J7/J14/J21, momentum T0/J21/J42/J90 (`web/src/lib/fil/momentumJ21.ts`).
- Fil de correspondance médecin C3 (`CorrespondanceMedecin`) : **texte
  uniquement, « jamais de pièce biologique »** (commentaire du schéma).

### La chaîne corpus est réutilisable telle quelle

`tools/corpus/` (extract triple lecture A/B/C avec invariants sur les nombres,
chunk par unités de sens, claims rédigés par une IA et contre-vérifiés par une
seconde, ingest par routes internes, push NotebookLM/Drive) servira sans
modification au notebook « analyses biologiques ». Les claims biologiques
(plages, interprétations) suivent le **régime commun** de validation
(`VALIDATION_CLAIMS_DEUX_VITESSES.md`), dont la voie lente est clée sur la
**typologie** du claim. Ce paragraphe annonçait au départ une « voie lente
obligatoire » pour la biologie, en présupposant que ces claims seraient
prescriptifs ou interprétés : la mesure a dit l'inverse (74 % étiquetés
`déclaré`/`observé` non prescriptifs). Tranché le 2026-07-27 — régime commun et
audit d'échantillon ([décision 8](../2026-07-27-arbitrages-praticien/README.md)).

## §2 — Le verrou HDS et le modèle à deux étages (section pivot)

État vérifié : `web/src/app/dashboard/biologie/page.tsx` est un placeholder
100 % statique (« le stockage de résultats biologiques réels attend un
hébergement HDS ») ; `EstimeMesurePanel.tsx` est marqué « SECOND TEMPS — HDS
requis » ; le concept affiché est « **du présumé au mesuré** » — l'estimé
(questionnaires) et le mesuré (biologie) se confrontent, **jamais fusionnés**.
La migration HDS (Scalingo) est en préparation, échéance de dérogation
2026-10-21.

Conséquence structurante :

- **Étage 1 — documentaire (CB, constructible maintenant).** Catalogue
  d'analyses, claims du corpus, moteur d'exploration, génération de
  propositions. **Aucune valeur biologique patient n'est stockée.** Les entrées
  du moteur sont les scores questionnaires et le protocole (déjà en base,
  non-HDS) ; la sortie est un document (proposition, courrier) — jamais une
  valeur de laboratoire.
- **Étage 2 — résultats réels (gate dur HDS).** Saisie/import de résultats,
  interprétation par plages fonctionnelles, boucle estimé ↔ mesuré,
  ré-alimentation du moteur et du momentum. **Chaque table qui stockerait une
  valeur biologique patient est un acte gaté HDS.**

Deux flags distincts, pas un : `WN_CB_ENABLED` gouverne l'étage 1 ;
`WN_CB_RESULTS_ENABLED` (fail-closed, jamais activé avant attestation HDS)
gouverne l'étage 2. Aucune bascule accidentelle ne doit pouvoir ouvrir le
stockage de données de santé (décision A).

## §3 — Catalogue d'analyses CB-A (étage documentaire)

Modèle conceptuel — les noms sont indicatifs, le schéma réel relève du lot
CB-01 (migration = acte gaté). Aucune de ces tables ne porte de donnée patient.

### L'analyte (pivot clinique)

`BiologyAnalyte` : `code` interne stable (ex. `BIO_FERRITINE`, forme imposée
par contrainte), libellé, `unite` (vocabulaire **fermé**),
`typePrelevement` (sang, urine, selles, salive… — fermé),
`delaiRenduIndicatif?`, `sourceProvenance` (fermé :
`nabm_smt_ans | labo | saisie_praticien`), `statutFiche`
(`importee | verifiee | inactive`, défaut `importee`), `contenuSha256`
(idempotence, patron C4), `niveauCompletude`, `donneesManquantes[]`
(abstention honnête), `verifiePar?/verifieLe?`. Le coût indicatif est différé
(comme la dimension coût de C4) — l'audit confirme qu'aucun montant en euros
n'est disponible dans la source.

**Il n'existe volontairement aucune colonne `remboursable` ni
`codeRemboursement`.** Un booléen stocké est une inférence figée : il diverge
de la correspondance qui le fonde dès que la nomenclature bouge, alors que le
cadrage exige qu'il ne soit *jamais* inféré. Le caractère remboursable se
**dérive** donc à la lecture, et cette dérivation est écrite une seule fois
(`web/src/lib/biology-library/remboursable.ts`) pour que CB-02a, CB-05, CB-06
et CB-08 ne s'en donnent pas quatre définitions divergentes — elles décideraient
du document que le patient reçoit.

Elle ne rend pas un booléen mais **quatre états** : `non_evalue` (aucune
correspondance signée — ce n'est pas « non remboursé », et cela doit se dire),
`hors_nomenclature`, `remboursable`, et `remboursable_si_groupe` (l'analyte
n'est coté qu'au sein d'un groupe imposé : le proposer seul ne le rend pas
remboursable). Entente préalable, acte réservé et remboursement partiel sont
des **conditions à afficher**, jamais des motifs de basculer en « non
remboursé ».

`BiologyAnalyteNabm` : correspondance **plusieurs-à-plusieurs** entre analyte et
acte de la nomenclature (`analyteCode`, `codeActe`,
`nature : isole | groupe_et | groupe_ou`, `verifiePar/verifieLe`). Un analyte a
plusieurs cotations possibles selon le groupage (TSH seule, TSH + T4L,
TSH + T4L + T3L) et un acte couvre parfois deux analytes : un champ
`nomenclatureNabm` unique ne tiendrait pas. Voir
[l'audit de la source](AUDIT-SOURCE-NABM.md), §7.

Deux précisions issues de la revue du lot CB-01. **`groupe` valait pour deux
situations opposées** : un acte qui cote un ensemble imposé (1211 = TSH + T4
libre — proposer un seul membre ne le rend pas cotable) et un acte qui laisse
un choix (1387 = folates sériques *ou* érythrocytaires — chacun est couvert).
D'où trois natures et non deux. Et la correspondance est ancrée sur le **code
d'acte**, jamais sur la ligne d'un millésime : sans cela la signature du
praticien se périmait à chaque nouvelle version de nomenclature, faisant
basculer tout le catalogue en « non remboursé » — donc changer le document
remis au patient.

### Deux référentiels de valeurs, jamais fusionnés

- `BiologyReferenceRange` — valeurs de référence **laboratoire** (bornes,
  population, source officielle labo/HAS).
- `BiologyFunctionalRange` — plages **fonctionnelles optimales**, chacune
  portant `claimId + versionClaim` (claim **VALIDÉ**, D-003) et un niveau de
  preuve WellNeuro (A/B/C/D — C étant précisément « biologie fonctionnelle
  interprétative »).

**Invariant miroir de l'orientation : une plage fonctionnelle sans claim validé
n'est jamais servie.** L'UI présente toujours les deux référentiels côte à
côte, jamais une colonne « normes » unique.

### Panels, ratios, préanalytique, liens

- `BiologyPanel` + `BiologyPanelItem` : regroupements hiérarchisés (bilans),
  `niveau socle | approfondissement | specialise`, besoins ciblés (1-12).
- `BiologyRatio` : ratios calculés déterministes (HOMA, ω6/ω3, Cu/Zn,
  saturation de la transferrine…) — **spécification structurée d'opérandes,
  jamais d'expression libre exécutable** (patron `ScoringSpecification` de la
  certification) ; mêmes deux référentiels de valeurs séparés.
- `BiologyPreanalytic` : conditions de prélèvement (jeûne, moment, délai après
  prise), sourcées par claim quand elles viennent du corpus.
- `BiologyAnalyteLink` : biomarqueur ↔ besoin (1-12) / axe `NeuroAxis` /
  nutriment (`NutrientAxisWeight`), avec direction d'interprétation et
  **provenance claim obligatoire**.
- `BiologyCatalogVersionCourante` : pointeur de version courante par source
  (patron C4 — jamais servir toutes les versions).

### Alimentation

Deux voies, comme C4 : import de la nomenclature (NABM — **source auditée**, voir
[AUDIT-SOURCE-NABM.md](AUDIT-SOURCE-NABM.md) : Serveur Multi-Terminologies de
l'ANS, LOv2, 988 actes, six appels d'API anonymes) en **brouillons** `importee`
avec file de revue praticien, et corpus (notebook « analyses biologiques »)
pour les plages
fonctionnelles, le préanalytique interprétatif et les liens cliniques. Une
source externe ne produit que des brouillons (décision C4 n°11, reprise ici).

## §4 — La proposition d'exploration (le « pendant prescription »)

Le praticien WellNeuro n'est pas médecin : le module ne produit **jamais une
prescription**, il produit une **proposition d'exploration**. La distinction
est portée par le modèle, le vocabulaire et la machine à états.

### Deux régimes strictement séparés

- **Remboursé** (acte à la NABM) : la réalisation exige une prescription
  médicale. Matérialisation : **courrier au médecin traitant** via le fil C3
  existant — texte seul, mur HDS respecté ; le médecin seul prescrit.
- **Non remboursé** (biologie fonctionnelle spécialisée : acides organiques
  urinaires, zonuline, profils d'acides gras, microbiote…) : conseil direct,
  payé par le patient ; **document remis au patient systématiquement**
  (décision F) — y compris quand le laboratoire n'exige rien, pour que le
  patient reparte toujours avec la trace écrite de ce qui lui a été proposé et
  pourquoi. Le document signale le cas échéant qu'une ordonnance reste requise
  par le laboratoire choisi.

### Machine à états (append-only, patron de la chaîne clinique)

`BiologyExplorationProposal` : `brouillon_moteur` (candidats produits par le
moteur, rien de diffusé) → `en_edition_praticien` (le praticien retient, écarte,
reformule) → `signee` (figée, signature praticien) → selon le régime :
`courrier_medecin_genere → transmise_medecin` **ou**
`document_patient_genere → remise_patient` → `retour_consigne` → états
terminaux `realisee | declinee | expiree`.

Chaque item (`BiologyExplorationItem` : analyte, panel ou ratio) porte sa
priorité, son niveau, son objectif clinique, ses besoins visés et ses `motifs[]`
`{ regleId, conditions, claims }` — **`claims` jamais vide**. La proposition
porte la *demande*, jamais le *résultat* : aucune valeur biologique n'y entre,
à l'étage 1 comme à l'étage 2 (le résultat sera une entité distincte, §7).

### Vocabulaire imposé

Jamais « prescription », « ordonnance », « diagnostic » en surface praticien ou
patient. Formules sanctionnées : « proposition d'exploration », « explorations
à discuter avec le médecin traitant ». La chaîne de diffusion reprend
Relu → Validé → Envoyé.

## §5 — Le moteur d'exploration biologique hiérarchisé (« module intelligent »)

### Architecture : extension, pas moteur frère

Le moteur d'orientation existant est étendu (décision B) : l'union
`CibleExploration` gagne deux variantes —

```ts
| { type: 'analyse'; analyteCode: string }
| { type: 'panel_bio'; panelCode: string }
```

— et `OrientationSuggestion` les champs correspondants. Tout le reste est
hérité tel quel : déclencheurs zone/comparaison sur les scores stockés,
`justificationClaims` jamais vide, niveau le plus fondamental gagnant, tri
déterministe, filtre dur, jamais d'auto-assignation.

### Table de règles biologie séparée

Fichier propre (ex. `orientationBiologieRulesV1.ts`), sha-256 propre,
métadonnées et **signature praticien indépendantes** de la table NNPP2 de la
certification (décision C). Compilée hors-ligne par un outil dédié
(`tools/corpus/biologie/compile.mjs`, miroir du lot 9 certification) à partir
des seuls claims **VALIDÉS**, régénérée par PR revue. Double verrou fail-closed
propre : `WN_CB_ENABLED` **et** table signée. (La mention « en voie lente » a
été retirée le 2026-07-27 : le régime de validation est le régime commun, cf.
[décision 8](../2026-07-27-arbitrages-praticien/README.md). L'exigence de fond
est inchangée — **VALIDÉS**, jamais `EN_ATTENTE_VALIDATION`.)

### Hiérarchisation et priorisation (le cœur « intelligent » — et déterministe)

- **Niveaux** : `socle` (biologie courante de première intention, largement
  NABM) → `approfondissement` (deuxième intention, ratios, explorations
  ciblées) → `specialise` (biologie fonctionnelle de laboratoire spécialisé).
  À cible partagée, le niveau le plus fondamental l'emporte — on ne propose pas
  un profil d'acides gras avant une ferritine.
- **Entrées** : scores et sous-scores questionnaires (`scoresJson`), protocole
  actif (les actions `biological_exploration` déjà posées par le praticien),
  jalon de momentum (T0/J21/J42/J90) et fondations critiques.
- **Priorisation contextuelle** : les besoins en fondation critique remontent ;
  un jalon J21/J42 sans amélioration du momentum sur un besoin renforce la
  priorité d'objectiver ce besoin par la biologie (« du présumé au mesuré ») ;
  le régime (remboursé d'abord quand un équivalent existe) départage à priorité
  égale.
- **Sorties** : candidats hiérarchisés, chacun traçable réponse patient → score
  → règle → claims → chunk → PDF source.

### La place de l'IA

En **aval uniquement** : rédaction de l'argumentaire du courrier médecin et du
document patient, **bornée aux candidats retenus et signés par le praticien**
(patron du lot 11 certification — le LLM ne reçoit que les candidats du moteur,
jamais l'inverse). L'IA ne choisit aucune analyse, ne fixe aucune priorité, ne
génère jamais un artefact ressemblant à une ordonnance.

## §6 — Parcours et UI

- Remplacement **progressif** du placeholder `dashboard/biologie` : d'abord le
  rayon documentaire (catalogue consultable, fiches d'analytes avec les deux
  référentiels et leurs sources), le bandeau HDS restant sur tout ce qui touche
  aux résultats.
- Encart « explorations biologiques suggérées » sur la fiche patient, pendant
  de l'encart questionnaires du lot 10 certification — instrument à tiroir
  ouvert depuis la zone focale du protocole, jamais écran de classement
  autonome ; **aucun score global, justification à un clic**.
- Fil du jour : cartes de suivi des propositions (signée, transmise, retour à
  consigner) — projection recalculée, comme les cartes existantes.
- `EstimeMesurePanel` reste en « second temps » jusqu'à l'étage 2.

## §7 — Étage 2 post-HDS (esquisse de contrat, hors périmètre)

Posé ici uniquement pour ne pas peindre le catalogue dans un coin :

- `BiologyResult` (⚠️ donnée de santé) : `idPatient`, `analyteId`, valeur,
  unité, date de prélèvement, source (`saisie_praticien | import_labo`).
  **Entité distincte, jamais un champ de la proposition.** N'existe que
  derrière `WN_CB_RESULTS_ENABLED` + attestation HDS.
- Interprétation fonctionnelle : confrontation estimé ↔ mesuré (jamais
  fusionnés en un chiffre), ré-alimentation du moteur d'orientation et du
  momentum (« le mesuré confirme ou infirme le présumé »).
- Le courrier C3 ne transporte toujours pas de pièce biologique tant que la
  frontière n'est pas rouverte explicitement, HDS acquis.

Rien de ce paragraphe n'est planifié : il borne le contrat, il ne l'ouvre pas.

## §8 — Lots, dépendances, gates

Conventions du dépôt : migration = **acte gaté** (revue adversariale
`wn-reviewer` avant, vérification base après merge) ; ingestion prod = acte
gaté ; HDS = **gate dur** ; tout l'aval applicatif derrière `WN_CB_ENABLED`
fail-closed ; un fragment `changelog.d/` et un worktree par lot.

| Lot | Contenu | Dépendances | Gates |
| --- | --- | --- | --- |
| CB-00 | Ce cadrage + décisions 0/A→G actées + **audit de la source NABM fait** ([AUDIT-SOURCE-NABM.md](AUDIT-SOURCE-NABM.md)) | — | aucun |
| CB-01 | **Fait** — migration catalogue CB-A : onze tables (analytes, `biology_nabm_actes`, correspondance `BiologyAnalyteNabm`, deux référentiels de plages, préanalytique, panels, ratios, liens, pointeur de version) + vocabulaires fermés + les **deux flags** déclarés fail-closed | CB-00 | **migration** |
| CB-02a | **Fait** — import **NABM complet** (**987** actes, six appels anonymes) : logique pure + CLI dry-run/apply, snapshot canonique des 1050 concepts, pointeur de version. Migration additive `code_incompatible` / `regle_applicable` / `biology_source_snapshots` | CB-01 | ingestion + **migration** |
| CB-02b | **Fait le 2026-07-27** — corpus notebook 08 « Biologie fonctionnelle » : 27 sources / 891 pages en triple lecture, **135 chunks** et **758 claims** ingérés en production (`LOT_007_2026-07-26`), tous `EN_ATTENTE_VALIDATION` | décision G **levée par le praticien le 2026-07-27** (cf. §10) | **ingestion prod** ; coût API |
| CB-03 | Extension moteur : variantes de cible `analyse`/`panel_bio` + table biologie **séparée**, vide, signée-sha + double verrou + route | CB-02b ; après les lots 8-9 certification | flag ; table signée |
| CB-04 | Compilateur `tools/corpus/biologie/compile.mjs` → table régénérée par PR revue | CB-03 + claims validés | **signature praticien** |
| CB-05 | Migration + machine à états `BiologyExplorationProposal`/`Item`, génération depuis les candidats | CB-01, CB-03 | **migration** |
| CB-06 | Régimes : courrier médecin (fil C3, texte) / **document patient systématique** ; IA en aval bornée ; Relu→Validé→Envoyé | CB-05 | validation praticien avant diffusion |
| CB-07 | Contrat protocole **V4 `BiologyCatalogRef`** sur `biological_exploration` (décision D actée) | CB-05 | revue adversariale (contrat clinique) |
| CB-08 | UI : rayon dans la bibliothèque, fiche analyte, encart fiche patient, cartes du fil | CB-05/06 | flag |
| CB-09 | Étage 2 : `BiologyResult`, saisie/import, estimé↔mesuré, ré-alimentation | **HDS obtenu** | **GATE DUR HDS** + `WN_CB_RESULTS_ENABLED` |

Ordre après arbitrage : **CB-00 → CB-01 → CB-02a** est le chemin démarrable
immédiatement — il ne dépend ni du notebook ni de la certification, puisque le
catalogue NABM se remplit par import et non par claims. **CB-02b était
subordonné à la certification** (décision G) ; le praticien a levé ce gate le
2026-07-27 et le lot est passé. CB-03/04 restent en aval : pas de table de
règles biologie avant que la table NNPP2 soit stabilisée et signée. Puis
CB-05 → 06 → 07/08. CB-09 seulement après HDS.

Conséquence pratique : les plages fonctionnelles (`BiologyFunctionalRange`) et
les liens cliniques restent **vides** — et le sont toujours après CB-02b. Ce
n'est pas l'ingestion du corpus qui les ouvre, c'est la **validation** des
claims dans l'Atelier, puis leur compilation en CB-04. Le catalogue servi
n'expose jusque-là que les valeurs de référence laboratoire et les métadonnées
d'analyse — ce qui est cohérent avec l'invariant : une plage fonctionnelle sans
claim **validé** n'est jamais servie.

L'audit de la source ajoute une nuance de poids : **le cœur de la biologie
fonctionnelle est absent de la nomenclature** (sélénium, homocystéine,
coenzyme Q10, acides gras érythrocytaires, glutathion peroxydase, mélatonine…).
CB-02a livre donc le socle remboursable et la matière administrative ; ce qui
distingue le rayon d'un bilan de routine arrive par le corpus — présent depuis
CB-02b, mais servi seulement une fois les claims validés. Le lot d'import n'est
pas le lot qui donne sa valeur au rayon.

**Deux points de ce tableau ont été corrigés par la réalisation de CB-02a**
(2026-07-26), et il vaut mieux les lire ici que les redécouvrir :

- **L'import ne crée AUCUNE fiche d'analyte en brouillon.** La rédaction
  initiale du lot annonçait « 988 actes en brouillons `importee` » ; c'était
  écrit avant que l'audit n'établisse que la NABM est l'axe de remboursement et
  non l'ossature du catalogue. Les 987 actes peuplent `biology_nabm_actes`,
  table administrative et verbatim ; `biology_analytes` reste **vide**. Une
  fiche d'analyte naît d'un claim ou de la saisie praticien, jamais d'un
  intitulé de facturation — l'audit §5 montre que le rapprochement par libellé
  produit des faux négatifs silencieux. La file de revue porte donc sur les
  **correspondances** analyte ↔ acte, et elle n'a pas d'objet tant qu'il
  n'existe pas d'analyte : c'est le lot CB-02c, en aval de CB-02b.
- **CB-02a a finalement porté une migration.** Le lot était annoncé sans, sa
  table de destination existant déjà. La mesure de la source a montré que CB-01
  ne prévoyait de colonne ni pour `codeIncompatible` (438 actes sur 987, jusqu'à
  17 valeurs) ni pour `regleApplicable` (25 actes), et que le snapshot exigé par
  l'audit §10 n'avait qu'une colonne d'empreinte — on gardait la preuve d'un
  contenu qu'on ne gardait pas. Migration additive sur tables vides.

**Ce que la réalisation de CB-02b a établi** (2026-07-27), y compris contre ce
qui était écrit ici :

- **La chaîne d'ingestion ne produit pas `metadata.rayon` — et ce champ existe
  bel et bien ailleurs.** Le tableau annonçait des claims marqués
  `metadata.rayon:'biologie'`. Le rédacteur de claims n'écrit en réalité que
  `{source_chunk, section, page}` ([draft.mjs](../../../../tools/corpus/claims/draft.mjs)),
  et **aucun claim d'aucun lot n'en porte** : vérifié en production le
  2026-07-27, **0 sur 2 993**. Or `metadata.rayon` est la clé de filtrage du
  rayon corpus C4 ([rayonCorpus.ts:69](../../../../web/src/lib/supplement-library/rayonCorpus.ts#L69)),
  qui filtre donc **à zéro en permanence**. Ce n'est pas un détail de CB : c'est
  un chemin de code livré qui ne peut rien restituer, quel que soit le rayon.
  **Tranché le 2026-07-27** ([dossier d'arbitrage, décision 7](../2026-07-27-arbitrages-praticien/README.md)) :
  le filtre bascule sur le **notebook**, via
  [notebooks.ts](../../../../web/src/lib/rag/claims/notebooks.ts). Vérification
  en base le même jour : `match_wellneuro_rag_claims` **retourne déjà
  `source_id`**, les 2 993 claims le portent tous, et les 658 chunks portent
  tous un `notebook`. Le correctif est donc **sans migration ni backfill**, et
  rend au rayon micronutrition les **305 claims validés** du notebook 10.
- **Ce n'est pas l'ingestion qui ouvre les plages fonctionnelles, c'est la
  validation.** Les 758 claims sont entrés en `EN_ATTENTE_VALIDATION`, donc
  inertes. Tant que le praticien ne les a pas validés dans l'Atelier, la colonne
  fonctionnelle reste vide exactement comme avant — l'invariant « pas de plage
  fonctionnelle sans claim **validé** » n'a pas bougé d'un cran.
- **La voie lente existe — mais pas celle que ce cadrage présupposait.**
  L'allowlist de [revue.ts](../../../../web/src/lib/rag/claims/revue.ts) est clée
  sur la **typologie** (`interprété` et `vécu` en voie lente, une typologie
  inconnue tombe du côté prudent), redondée par un trigger d'insertion ; elle ne
  connaît simplement ni notebook ni rayon. Ce qui est infirmé, c'est la
  **prémisse** posée ici : les claims biologiques ne se sont pas révélés
  majoritairement prescriptifs ou interprétés — **563 des 758 (74 %)** sont
  étiquetés `déclaré`/`observé` non prescriptifs, donc éligibles à la voie
  rapide. **Tranché le 2026-07-27**
  ([décision 8](../2026-07-27-arbitrages-praticien/README.md)) : régime commun,
  et **audit d'une trentaine de ces claims** avant d'en conclure quoi que ce
  soit — l'étiquetage est produit par le LLM rédacteur lui-même, et « 74 % non
  prescriptifs » peut aussi vouloir dire « sous-étiquetés ».

**Contrôle en base après ingestion** (2026-07-27, lecture `execute_sql`) :
lot `LOT_007_2026-07-26` = **135 chunks / 27 sources / 758 claims**, dont
**758 `EN_ATTENTE_VALIDATION` et 0 `VALIDE`** — la barrière D-003 tient,
l'ingestion ne valide rien. Total du corpus : 658 chunks sur 7 lots,
2 993 claims dont **2 375 en file de revue** et 618 validés.

Deux chiffres du lot méritent d'être conservés. Le corpus a retenu **758 claims
sur 906 rédigés** : 148 sont tombés par désaccord entre le rédacteur (Sonnet 5)
et le contre-vérificateur (GPT-5.4), la règle de la chaîne étant que le
désaccord exclut. Et **121 chunks sur 135 seulement ont produit un claim**. La
répartition des 14 restants importe plus que leur nombre : **12 sont stériles**
par nature — titres, sommaires, planches de figures — mais **2 ne le sont pas**.
`WN-CH-0049-002` et `WN-CH-0049-006` (source `WN-SRC-0049`, exploration
dimensionnelle des neurotransmetteurs) ont produit 7 claims chacun, **tous
exclus pour infidélité** : le rédacteur transformait des intitulés de sections
de questionnaire (« SEROTONINE », « DOPAMINE ») en énoncés de causalité que la
source ne formule pas. Du contenu clinique réel n'est donc pas entré dans le
corpus, et c'est le contre-vérificateur qui l'a retenu — à relire si ce
matériel manque plus tard. Les 135 chunks ont été ingérés quoi qu'il en soit :
le verbatim est le corpus, les claims n'en sont que la dérivation, et un chunk
manquant ferait un trou dans la récupération.

**Une décision d'exploitation, tranchée par la revue adversariale du
2026-07-26 :** le **millésime servi ne change jamais implicitement**. Un import
qui n'apporte aucune donnée nouvelle mais déplacerait le pointeur est refusé
tant que l'opérateur n'a pas nommé la version qu'il quitte
(`--remplace-pointeur <version>`). Le garde est **symétrique** — il ne
reconnaît pas la direction, aucun ordre n'étant garanti entre numéros de
version — mais un premier import reste sans friction.

Ce n'est pas de la prudence de principe. La revue a reproduit la séquence :
rejouer un millésime déjà remplacé ramenait le pointeur en arrière **sans un
mot**, un acte désactivé au millésime récent redevenait actif, et
`deriverRemboursement` le rendait de nouveau `remboursable` — donc
`regimeDocumentaire` basculait sur `courrier_medecin`. **Un courrier serait
parti au médecin traitant en citant un acte que la nomenclature a retiré.**
Même logique pour les correspondances signées : un import qui priverait l'une
d'elles de son acte est refusé, parce qu'il écrirait sans le dire un état que
le contrat du dépôt déclare invalide.

### L'import passe par le build Vercel (2026-07-26)

La première des questions ouvertes ci-dessous est **tranchée** : l'import
s'exécute depuis `web/scripts/vercel-build.sh`, après `migrate deploy`, sur le
patron de l'import C5 CIQUAL. Le geste manuel reste possible et inchangé, mais
il n'est plus le chemin nominal.

**Pourquoi le build plutôt que le Mac.** L'écriture exige `MIGRATE_DATABASE_URL`,
qui n'existe sur aucun poste et ne doit pas y exister. La faire transiter pour
un import manuel reviendrait à sortir la connexion de production de son coffre
pour une opération qui n'a lieu qu'une fois. Dans le build, elle est déjà là,
déjà scopée `Production`, et n'a jamais quitté Vercel.

**Ce qui arme l'import — deux variables Vercel, scope Production :**

| Variable | Rôle |
| --- | --- |
| `WN_CB_NABM_IMPORT_CONFIRMATION` | vaut le jeton `CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1`. Absente, aucun import n'a lieu et le build ne change pas de comportement. |
| `WN_CB_NABM_IMPORT_BASE` | **nomme l'hôte** de `MIGRATE_DATABASE_URL`. L'import refuse si les deux ne concordent pas. |

La seconde n'est pas une redondance : elle oblige la personne qui arme l'import
à savoir sur quelle base il va écrire, et elle ne dépend d'aucune variable de
plateforme — elle vaudra donc encore quand cette connexion changera d'hôte.

**Ce qui est épinglé dans le script, donc modifiable seulement par une PR
relue :** le jeton, le millésime attendu (`V105`) et l'empreinte SHA-256 de son
contenu canonique (987 actes sur 1050 concepts, mesurée le 2026-07-26 ;
empreinte complète et commande de reproduction dans `AUDIT-SOURCE-NABM.md` §2).

Ces deux dernières épingles sont la vraie raison d'être du câblage : **elles
rendent la variable inoffensive si on l'oublie en place.** Sans elles, un
déploiement quelconque, des mois plus tard, importerait le millésime que l'ANS
aura publié entre-temps — sans relecture, en déplaçant le catalogue servi, donc
ce qui est proposé au patient et ce qui part au médecin traitant.

**Le jeton porte lui aussi le millésime**, et c'est le second verrou : sans
cela, une PR ultérieure qui bump `V105` en `V106` suffirait à relancer l'import
sur sa seule autorité, si la variable était restée posée. Le modèle annonce
deux clés indépendantes — il en faut donc deux qui bougent.

Enfin, quand la base sert **déjà** le millésime épinglé avec l'empreinte
épinglée, l'import **sort sans appeler la source**. Sans cette sortie anticipée,
une variable oubliée ferait interroger l'ANS à chaque déploiement de production,
et — la source publiant un millésime tous les un à deux mois — ferait échouer
**tous** les déploiements dès la version suivante, y compris un correctif urgent
sans rapport.

Ne sont **pas** câblés, et ne doivent pas l'être : `--remplace-pointeur`,
`--accepte-orphelines`, `--allow-shrink`. Ce sont des forçages qui demandent un
jugement humain ; s'ils deviennent nécessaires, le build doit échouer.

Le build rejoue enfin, juste après l'import, le contrat
`prisma/checks/cb_biologie_catalogue_v1.sql`. **C'est sa première exécution là
où il existe des données** : en CI il ne rencontre qu'une base vide, où ses
invariants de données sont muets. Ce n'est pas pour autant un garde permanent —
il ne s'exécute que tant que la variable d'armement est posée, donc une fois.

**Marche à suivre :** poser les deux variables → redéployer `main` → lire le
rapport dans les logs de build → vérifier la base par `execute_sql` (attendus à
figer *avant* d'armer : 987 lignes en `version_source = 'V105'`, pointeur à
987 entrées, un snapshot à l'empreinte épinglée) → **retirer les deux
variables**. L'import est transactionnel et idempotent : un échec n'écrit rien
et laisse la production sur le déploiement précédent — **à une exception près**,
le contrat s'exécutant après le commit de l'import, un build rouge à cette
étape-là signifie que l'import, lui, est bien écrit.

**Trois questions soulevées par la revue, toutes tranchées le 2026-07-27**
(détail et motifs : [dossier d'arbitrage, décisions 9 à 11](../2026-07-27-arbitrages-praticien/README.md)) :

1. Que devient une correspondance signée dont l'acte disparaît ?
   → **Statut « signature orpheline » et file de reprise**, à poser **avant
   CB-02c**. Le silence de `hors_nomenclature` ferait porter la signature sur
   autre chose que ce qui est servi, sans le signaler.
2. Entre `signee` et `courrier_medecin_genere`, le régime documentaire est-il
   figé ? → **Figé à la signature, et génération interrompue si le pointeur a
   bougé** : la proposition revient au praticien plutôt que de se matérialiser
   sur un état périmé.
3. `biology_source_snapshots` accueillera-t-elle un jour une source `labo` ?
   → **Le CHECK reste fermé** à `nabm_smt_ans` ; l'élargir restera une migration
   relue. `contenu` est un texte libre que le verrou HDS, qui raisonne sur des
   noms de colonnes, ne peut pas inspecter.

## §9 — Invariants réglementaires

- **MDCG 2019-11** (qualification logiciel dispositif médical) : mitigation par
  conception — le moteur **signale des candidats sourcés**, le praticien
  décide, l'IA rédige en aval avec validation systématique avant diffusion.
  La finalité revendiquée reste l'aide à la préparation d'une discussion
  praticien/médecin, pas le diagnostic. Une analyse dédiée est due si ce
  périmètre bouge.
- **Exercice illégal de la médecine** : vocabulaire contrôlé (§4), jamais
  d'artefact ressemblant à une ordonnance, le remboursé passe toujours par le
  médecin. Les diplômes de l'opérateur ne changent pas la finalité revendiquée
  du logiciel.
- **Mur HDS** : aucune valeur biologique patient à l'étage 1 ; fil C3 texte
  seul ; deux flags distincts ; chaque table de l'étage 2 = acte gaté HDS.
- **D-003** : plages fonctionnelles, liens cliniques et règles du moteur ne
  sortent que de claims VALIDÉS signés ; la barrière vit dans le SQL, pas dans
  l'UI.
- **Pas de score global, pas de score de risque chiffré** : dimensions nommées,
  justification toujours visible, tri neutre.

## §10 — Décisions actées (praticien, 2026-07-25)

Les huit décisions structurantes ont été tranchées le 2026-07-25. Elles sont
**fermées** : toute réouverture passe par une entrée datée sous ce tableau.

| # | Question | Décision actée |
| --- | --- | --- |
| 0 | Nommage du rayon | **CB** (« Catalogue Biologie »), flag `WN_CB_ENABLED`, scission CB-A / CB-B. Évite C4 (compléments) et C5 (food-compass). |
| A | Séparation documentaire / résultats patient | **Deux flags distincts** : `WN_CB_ENABLED` (étage 1) et `WN_CB_RESULTS_ENABLED` (étage 2, fail-closed, jamais activé avant attestation HDS). |
| B | Construction du moteur | **Étendre** le moteur d'orientation existant (variantes de cible `analyse` / `panel_bio`), pas de moteur frère. |
| C | Table de règles | **Séparée** de la table NNPP2 : sha-256 et signature praticien propres, campagnes indépendantes. |
| D | Lien au protocole | **Contrat V4 `BiologyCatalogRef`** sur l'action `biological_exploration`, miroir de `SupplementCatalogRef` V3. |
| E | Périmètre catalogue V1 | **NABM complet** en brouillons `importee`, vérification praticien au fil de l'eau (précédent C4/DGCCRF). |
| F | Matérialisation des régimes | Remboursé : **courrier texte au médecin traitant via le fil C3**. Non remboursé : **document patient systématique**, même sans exigence du laboratoire. |
| G | Calendrier du notebook biologie | **Après stabilisation de la campagne certification** — ne pas empiler deux files de validation en voie lente. **Levée le 2026-07-27** : le praticien a demandé d'implanter le reste de la biologie sans attendre la fin de la certification, et a donné le go d'ingestion de CB-02b. La file de revue passe donc bien à deux campagnes empilées (2 375 claims en attente) — c'est le coût accepté par cette levée. |

Conséquences directes : CB-07 (contrat V4) n'est plus conditionnel ; le second
flag est nommé et gelé dès CB-01. La subordination de CB-02b à la certification
a tenu du 2026-07-25 au 2026-07-27, date à laquelle le praticien l'a levée.

## §11 — Risques et points de vigilance

Les décisions du §10 en avaient refermé deux (charge de validation, télescopage
avec la certification) par le séquencement de la décision G. **La levée de G le
2026-07-27 les rouvre tous les deux** : les deux files coexistent désormais.
Restent donc, celles-là comprises :

- ~~**Licence et format NABM/AMELI**~~ — **refermé le 2026-07-25** par
  [l'audit de la source](AUDIT-SOURCE-NABM.md) : LOv2, API FHIR anonyme,
  988 actes en six appels. Le risque résiduel a changé de nature : la source est
  **pauvre en clinique** (ni unité, ni préanalytique, ni valeur de référence) et
  ignore le cœur de la biologie fonctionnelle. L'import remplit la moitié
  administrative d'une fiche — ce que `donneesManquantes[]` doit rendre visible
  plutôt que masquer.
- **Rapprochement analyte ↔ acte NABM** : ni automatisable par libellé (le
  filtre du serveur produit des faux négatifs silencieux), ni bijectif (TSH se
  cote de trois façons). C'est une table de correspondance revue à la main,
  charge à ne pas sous-estimer dans CB-02a.
- **Fusion accidentelle des deux référentiels de valeurs** : le risque de
  conception n°1 — deux tables, deux affichages, jamais une colonne « normes ».
  Le garde naturel est l'invariant « pas de plage fonctionnelle sans claim
  validé » : tant qu'aucun claim biologie n'est validé, la colonne fonctionnelle
  est vide — l'ingestion de CB-02b n'y change rien — et cela doit se voir plutôt
  que se combler par défaut avec les bornes labo.
- **Charge de validation praticien** : c'est le goulot réel du rayon, et la
  levée de la décision G l'a aggravé volontairement. Au 2026-07-27 la file de
  revue compte **2 375 claims `EN_ATTENTE_VALIDATION`** tous lots confondus, dont
  les 758 de la biologie. Le rayon peut rester longtemps à l'état « catalogue
  sans plages fonctionnelles », utile mais muet côté moteur.
- **Le rayon corpus C4 filtrait à zéro — tranché, plus un risque mais un lot.**
  `servirRayonCorpus` sélectionnait sur `metadata.rayon`, qu'aucun claim ne
  porte (0 sur 2 993 en production au 2026-07-27) : la fonctionnalité était
  livrée et inerte, pour tous les rayons. Le filtre bascule sur le **notebook**
  ([décision 7](../2026-07-27-arbitrages-praticien/README.md)), sans migration
  ni backfill — la fonction SQL retourne déjà `source_id`. À faire avant de
  s'appuyer dessus en CB-08.
- **La prémisse de ce cadrage sur la nature des claims biologiques est
  infirmée** — le garde, lui, existe. 563 des 758 claims (74 %) sont éligibles à
  la voie rapide, l'allowlist de `revue.ts` étant clée sur la typologie et non
  sur le notebook. Régime commun retenu, **assorti d'un audit d'échantillon**
  ([décision 8](../2026-07-27-arbitrages-praticien/README.md)) : l'étiquetage
  `prescriptif`/typologie est produit par le LLM rédacteur, et ces 74 % ne
  disent pas encore si les claims ne sont pas prescriptifs ou s'ils sont
  sous-étiquetés. **Le risque ouvert** : ces claims alimenteront les seuils de
  `orientationBiologieRulesV1.ts`, derrière une signature de lot échantillonnée
  à 20 %. Leçon de rédaction à retenir au passage — j'avais d'abord écrit que
  ce garde n'existait pas ; décrire comme absente une protection en place est
  une manière de la démonter.
- **Séquencement restant** : CB-03 reste suspendu à la stabilisation de la
  certification. Le risque n'est plus le télescopage, désormais assumé, mais
  l'oubli.
- **Collision de nommage** : `web/src/lib/protocol/` (suivi patient) et
  l'atelier de règles C4 (`api/praticien/regles`) sont des homonymes à éviter —
  le domaine s'appellera `biology-library`, le concept « exploration
  biologique ».
- **Périmètre réglementaire** : la décision D (contrat V4) fait entrer une
  référence catalogue biologie dans le protocole. C'est le point où une analyse
  MDCG 2019-11 dédiée devra être refaite si la finalité revendiquée évolue vers
  l'aide au diagnostic.

## Annexe — correspondances

- Rayon modèle : `docs/claude/propositions/2026-07-24-rayon-complements-bibliotheque/PROPOSITION_RAYON_COMPLEMENTS.md`
- Campagne certification (prioritaire, moteur d'orientation) : `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md`
- Corpus 5.0 (chaîne d'ingestion, deux couches verbatim/claims) : `docs/claude/propositions/2026-07-21-corpus-wellneuro-5-0/README.md`
- Validation à deux vitesses : `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`
- Audit HDS et échéance : `docs/claude/propositions/2026-07-24-audit-migration-hds/`
- Code : `web/src/lib/clinical/orientationEngine.ts` (l.43, `CibleExploration`),
  `web/src/lib/clinical/orientationRulesV1.ts`,
  `web/src/lib/clinical-engine/types.ts` (l.277, `biological_exploration`),
  `web/src/lib/supplement-library/`, `web/src/app/dashboard/biologie/page.tsx`,
  `web/src/components/patient-cockpit/EstimeMesurePanel.tsx`
