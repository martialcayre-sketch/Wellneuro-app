# Rayon « Biologie fonctionnelle » de la bibliothèque — cadrage CB-00

Date : 2026-07-25. Statut : **proposition à relire par le praticien**. Aucun
code, aucune migration, aucune ingestion dans cette campagne de cadrage : le
présent document est le seul livrable (même nature que le LOT-00 de la
certification, PR #359, et que la proposition du rayon compléments C4).

## §0 — Nature de la campagne

Campagne **additive**, pendant biologie du rayon compléments C4. Code proposé :
**CB** (« Catalogue Biologie »), scindé comme C4 en **CB-A** (catalogue
intrinsèque, data-first, aucune donnée patient) et **CB-B** (lecture
contextuelle du dossier). Le code C4 étant déjà pris (flag `WN_C4_ENABLED`,
migration `20260724133000_c4_supplement_product_catalogue` en base), CB évite
toute collision — décision 0 à confirmer.

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
(plages, interprétations) sont prescriptifs/interprétés : **voie lente
obligatoire** (revue individuelle, `VALIDATION_CLAIMS_DEUX_VITESSES.md`).

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

`BiologyAnalyte` : `code` interne stable (ex. `BIO_FERRITINE`), libellé,
`nomenclatureNabm?` et `codeRemboursement?` (nuls si hors nomenclature),
`remboursable` (dérivé de la présence NABM, jamais inféré), `unite`
(vocabulaire **fermé**), `typePrelevement` (sang, urine, selles, salive… —
fermé), `delaiRenduIndicatif?`, `sourceProvenance` (fermé :
`nabm_ameli | labo | saisie_praticien`), `statutFiche`
(`importee | verifiee | inactive`, défaut `importee`), `contenuSha256`
(idempotence, patron C4), `niveauCompletude`, `donneesManquantes[]`
(abstention honnête), `verifiePar?/verifieLe?`. Le coût indicatif est différé
(comme la dimension coût de C4).

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

Deux voies, comme C4 : import de la nomenclature (NABM/AMELI — licence et
format à auditer en CB-00bis) en **brouillons** `importee` avec file de revue
praticien, et corpus (notebook « analyses biologiques ») pour les plages
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
  payé par le patient ; **document remis au patient** (certains laboratoires
  exigeant néanmoins une ordonnance, le document le signale le cas échéant).

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
des seuls claims **VALIDÉS** en voie lente, régénérée par PR revue. Double
verrou fail-closed propre : `WN_CB_ENABLED` **et** table signée.

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
|---|---|---|---|
| CB-00 | Ce cadrage + décisions 0/A→G + audit source NABM/AMELI (licence, format, volumétrie) + calendrier notebook | — | aucun |
| CB-01 | Migration catalogue CB-A (analytes, deux référentiels de plages, préanalytique, panels, ratios, liens, pointeur de version) + vocabulaires fermés | CB-00 | **migration** |
| CB-02a | Domaine `web/src/lib/biology-library/` cloné de `supplement-library/` + import NABM en brouillons + file de revue | CB-01 | ingestion (secret dédié) |
| CB-02b | Corpus notebook « analyses biologiques » : extract → chunk → claims (`metadata.rayon:'biologie'`) → Atelier, **voie lente** | notebook fourni ; parallélisable | **ingestion prod** ; coût API |
| CB-03 | Extension moteur : variantes de cible `analyse`/`panel_bio` + table biologie vide signée-sha + double verrou + route | coordonné avec lots 7-9 certification | flag ; table signée |
| CB-04 | Compilateur `tools/corpus/biologie/compile.mjs` → table régénérée par PR revue | CB-03 + claims validés | **signature praticien** |
| CB-05 | Migration + machine à états `BiologyExplorationProposal`/`Item`, génération depuis les candidats | CB-01, CB-03 | **migration** |
| CB-06 | Régimes remboursé/non-remboursé : courrier médecin (C3, texte) / document patient ; IA en aval bornée ; Relu→Validé→Envoyé | CB-05 | validation praticien avant diffusion |
| CB-07 | Contrat protocole V4 `BiologyCatalogRef` sur `biological_exploration` (si décision D = V4) | CB-05 | revue adversariale (contrat clinique) |
| CB-08 | UI : rayon dans la bibliothèque, fiche analyte, encart fiche patient, cartes du fil | CB-05/06 | flag |
| CB-09 | Étage 2 : `BiologyResult`, saisie/import, estimé↔mesuré, ré-alimentation | **HDS obtenu** | **GATE DUR HDS** + `WN_CB_RESULTS_ENABLED` |

Ordre : CB-00 → {CB-01, CB-02b} tôt (CB-02b dès le notebook disponible,
indépendant du schéma) ; CB-02a après CB-01 ; CB-03/04 **après ou en parallèle
contrôlé** des lots 8-9 de la certification — jamais une table de règles
concurrente avant que la table NNPP2 soit stabilisée ; CB-05 → 06 → 07/08 ;
CB-09 seulement après HDS. La certification reste prioritaire sur la file de
validation praticien.

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

## §10 — Décisions à trancher par le praticien

| # | Question | Recommandation |
|---|---|---|
| 0 | Nommage : code **CB**, flag `WN_CB_ENABLED` ? | CB |
| A | Deux étages, **deux flags distincts** (`WN_CB_ENABLED` / `WN_CB_RESULTS_ENABLED` jamais activé avant HDS) ? | oui |
| B | **Étendre** le moteur d'orientation (variantes de cible) plutôt qu'un moteur frère ? | étendre |
| C | Table de règles biologie **séparée** de la table NNPP2 (signatures indépendantes) ? | séparée |
| D | Protocole : contrat **V4 `BiologyCatalogRef`** sur `biological_exploration`, ou rester au niveau intention ? | V4 (miroir de l'option 1 C4, retenue) |
| E | Catalogue V1 : import NABM **complet** en brouillons, ou pilote restreint (2-3 axes : fer, thyroïde, inflammation) ? | complet (précédent C4) |
| F | Matérialisation : courrier médecin via **fil C3** (texte) ; document patient systématique pour le non-remboursé ? | C3 + document systématique |
| G | Notebook « analyses biologiques » : disponibilité et calendrier d'ingestion vis-à-vis de la certification en cours ? | à dater |

## §11 — Risques et questions ouvertes

- **Charge de validation praticien** : la file D-003 est déjà chargée
  (certification lots 2-4 et 8 ; 811 + 658 claims 09/10 en attente). Les claims
  biologie s'empilent dessus, en voie lente. → étaler CB-02b, la certification
  d'abord.
- **Licence et format NABM/AMELI** : à auditer en CB-00bis avant tout import
  (comme l'open data DGCCRF le fut pour C4).
- **Disponibilité du notebook analyses biologiques** : tout l'étage « plages
  fonctionnelles + moteur » en dépend (décision G).
- **Fusion accidentelle des deux référentiels de valeurs** : le risque de
  conception n°1 — deux tables, deux affichages, jamais une colonne « normes ».
- **Télescopage avec la certification** : le moteur d'orientation appartient
  aux lots 7-9 de la certification ; CB-03/04 s'y coordonnent (table séparée,
  séquencement) au lieu de créer une seconde source de vérité.
- **Collision de nommage** : `web/src/lib/protocol/` (suivi patient) et
  l'atelier de règles C4 (`api/praticien/regles`) sont des homonymes à éviter —
  le domaine s'appellera `biology-library`, le concept « exploration
  biologique ».

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
