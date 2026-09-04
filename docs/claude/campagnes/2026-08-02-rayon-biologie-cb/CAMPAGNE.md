---
id: "2026-08-02-rayon-biologie-cb"
titre: "Rayon biologie fonctionnelle — achever CB-03 à CB-09"
statut: "terminée (2026-09-04 — arbitrage du responsable : LOT-05 et LOT-06 livrés ; LOT-00→LOT-04 requalifiés à la clôture, recouverts par la chaîne D-068→D-073 ; seul le contrat V4 (CB-07) reste éventuellement dû, transféré en FILE_ATTENTE avec le producteur d'intentions)"
créée_le: "2026-08-02"
mise_à_jour: "2026-09-04"
lot_courant: "aucun"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# Rayon biologie fonctionnelle — achever CB-03 à CB-09

## Clôture — 2026-09-04, arbitrage du responsable

La campagne est **close sans que ses lots médians aient été construits tels
que cadrés, et c'est la bonne issue** : la chaîne `D-068`→`D-073` (LOT-06 de
la campagne T0, 2026-08-14→18) a livré une biologie opérante par un autre
chemin — proposition **recalculée à la lecture** depuis la table d'indications
signée, sans machine à états ni compilateur — puis `D-122` (2026-09-01) a
ouvert et livré les deux derniers étages (document patient PR #828/#848,
résultats réels PR #838/#854). L'arbitrage pendant de `FILE_ATTENTE.md`
(« sort de la campagne, recouverte par le LOT-06 de la chaîne T0 ») est
tranché ici. Requalification fiche par fiche :

| Lot | Sort à la clôture |
|---|---|
| LOT-00 (CB-03) | **Recouvert** — pas d'extension d'`evaluerOrientation` : les règles vivent dans `indicationsBiologieV1.ts` (D-069), servies par `propositionService`. Faire parler le **mesuré** au moteur reste une frontière fermée (D-122) → future campagne, FILE_ATTENTE. |
| LOT-01 (CB-04) | **Recouvert** — les 15 règles sont nées par transcription signée (D-069, 29 claims), pas par compilation. Un compilateur ne redevient pertinent que si la curation crée le volume ; aucun dû. |
| LOT-02 (CB-05) | **Caduc** — la machine à états n'a jamais existé ; la proposition se recalcule, sa trace remise vit dans `documents_patient_biologie` (D-122 §1). |
| LOT-03 (CB-06) | **Recouvert** — courrier médecin ancré (D-073, PR #710) ; document patient (décision F) livré par D-122 §1 (PR #828/#848). |
| LOT-04 (CB-07) | **Non livré, transféré** — seul contenu encore éventuellement dû ; `BiologyCatalogRef` se réexamine AVEC le producteur d'intentions `conditionnelle_biologie` (entrée « à cadrer » de FILE_ATTENTE). |

La suite du rayon est cadrée le même jour : campagne
`2026-09-04-biologie-exploitee/` (exploitation de l'existant, quatre lots
courts) ; les chantiers à décision (mesuré→moteur, import laboratoire,
producteur d'intentions) entrent en FILE_ATTENTE comme campagnes futures.
État des lieux complet et contre-revue : handoff
`2026-09-04-0040-chantier-d122-etages-biologie.md` et bilan du rayon du
2026-09-04.

## Objectif

Achever le développement du rayon « Biologie fonctionnelle » (code CB) et son
intégration à WellNeuro, en poursuivant le cadrage
`docs/claude/propositions/2026-07-25-rayon-biologie-fonctionnelle/README.md`
à partir de son état d'avancement réel (audité le 2026-08-02) : CB-00
(cadrage), CB-01 (catalogue), CB-02a (import NABM) et CB-02b (corpus) sont
**déjà fusionnés en production**. Il reste CB-03 → CB-09 : moteur
d'orientation biologie, compilateur de règles, machine à états de la
proposition d'exploration, régimes de diffusion (courrier médecin / document
patient), contrat protocole V4, UI du rayon, et — hors périmètre tant que le
gate HDS n'est pas levé — l'étage 2 (résultats réels).

## Résultat observable

- Le praticien reçoit des propositions d'exploration biologique hiérarchisées
  (socle/approfondissement/spécialisé), traçables jusqu'aux claims validés,
  jamais une prescription.
- Chaque proposition signée génère soit un courrier au médecin traitant
  (régime remboursé), soit un document remis au patient (régime non
  remboursé) — jamais les deux mêmes valeurs biologiques, jamais de résultat
  réel stocké avant l'étage 2.
- Le rayon biologie apparaît dans la bibliothèque et sur la fiche patient,
  avec les deux référentiels de valeurs (laboratoire / fonctionnel) toujours
  distincts.
- `WN_CB_RESULTS_ENABLED` reste `false` jusqu'à l'attestation HDS.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel ; exemples limités à Sophie Nicola, Jennifer Martin et
  Michel Dogné.
- Aucune migration Prisma/SQL ou écriture Supabase sans confirmation
  explicite distincte, obtenue **avant** l'exécution (lots CB-05 et
  potentiellement CB-07 concernés).
- Aucune modification de la logique clinique ou des seuils de scoring sans
  demande explicite, source, et fragment `changelog.d/`.
- Le moteur ne décide jamais en runtime avec l'IA : le moteur déterministe
  calcule, l'IA rédige en aval, bornée aux candidats déjà retenus et signés.
- Vocabulaire imposé : jamais « prescription », « ordonnance », « diagnostic »
  en surface praticien ou patient.
- Changements minimaux, un fragment `changelog.d/` par lot.

## Décisions prises

- Décisions 0/A→G du cadrage CB-00 actées (PR #364) : code CB, deux étages
  séparés par le mur HDS, deux flags distincts (`WN_CB_ENABLED` /
  `WN_CB_RESULTS_ENABLED`), régime commun de validation des claims (décision 8
  du 2026-07-27, remplace l'hypothèse initiale de « voie lente obligatoire »
  pour la biologie).
- CB-02a a finalement porté une migration additive (`codeIncompatible`,
  `regleApplicable`, `biology_source_snapshots`) — annoncé sans migration à
  l'origine, corrigé après mesure de la source NABM.
- `metadata.rayon` n'existe pas dans la chaîne de claims ; le filtrage se fait
  par **notebook** (décision 7 du 2026-07-27), déjà en place en base pour le
  corpus biologie.
- Aucune fiche d'analyte n'est créée par l'import NABM (`biology_analytes`
  reste vide) — une fiche naît d'un claim validé ou d'une saisie praticien,
  jamais d'un intitulé de facturation (constat CB-02a).

## Questions ouvertes

- CB-03/CB-04 sont **bloqués** tant que les lots 8-9 de la campagne
  certification-corpus-questionnaires (table NNPP2 stabilisée et signée) ne
  sont pas clos — état au 2026-08-01 : lot 8 en cours (orientation adaptative,
  premier lot Sommeil), lot 9 pas encore atteint. À revérifier avant
  d'ouvrir CB-03.
- Le gate HDS (G-TRUST-04) reste non levé ; l'échéance de la phase de test est
  bornée au 2026-10-21. CB-09 reste fermé tant que ce gate n'est pas explicitement
  levé par le responsable du traitement.

## Dépendances

- Campagne certification-corpus-questionnaires (lots 8-9) : bloquant direct
  pour CB-03/CB-04.
- Gate HDS (G-TRUST-04, suivi dans `.wn/state.json` → `blocking_issues`) :
  bloquant direct pour CB-09 uniquement (CB-03→CB-08 sont l'étage
  documentaire, non concerné par le gate HDS).
- Patron C4 (`web/src/lib/supplement-library/`) réutilisé comme référence
  d'architecture pour CB-08 (UI) et la doctrine d'ingestion.
- Contrat protocole V3 `SupplementCatalogRef` (PR #340) comme patron exact
  pour CB-07.

## Artefacts de préparation

- Cadrage source :
  `docs/claude/propositions/2026-07-25-rayon-biologie-fonctionnelle/README.md`
  (§8, tableau des lots CB-00→CB-09).

## Lots

Les lots de cette campagne (`LOT-00` → `LOT-06`) reprennent la numérotation
métier du cadrage CB (CB-03 → CB-09) ; CB-00 → CB-02b sont déjà en production
et ne sont pas des lots de cette campagne.

| Lot | Objet CB | Statut | Dépend de |
|---|---|---|---|
| — | CB-00 : Cadrage + décisions 0/A→G + audit source NABM | **fait** (PR #364) | — |
| — | CB-01 : Migration catalogue CB-A (11 tables) + deux flags | **fait** (PR #369) | CB-00 |
| — | CB-02a : Import NABM (987 actes) + migration additive | **fait** (PR #374, #381, #433) | CB-01 |
| — | CB-02b : Corpus notebook biologie (135 chunks, 758 claims) | **fait** (PR #394) | décision G levée |
| LOT-00 | CB-03 : Extension moteur (cibles analyse/panel_bio) + table de règles vide signée-sha | **recouvert (clôture 2026-09-04)** — chaîne D-068→D-073 | CB-02b |
| LOT-01 | CB-04 : Compilateur `tools/corpus/biologie/compile.mjs` | **recouvert (clôture 2026-09-04)** — transcription signée D-069 | LOT-00 + claims validés |
| LOT-02 | CB-05 : Migration + machine à états `BiologyExplorationProposal`/`Item` | **caduc (clôture 2026-09-04)** — jamais construite, proposition recalculée | CB-01, LOT-00 |
| LOT-03 | CB-06 : Régimes de diffusion (courrier médecin / document patient) | **recouvert (clôture 2026-09-04)** — D-073 puis D-122 §1 | LOT-02 |
| LOT-04 | CB-07 : Contrat protocole V4 `BiologyCatalogRef` | **non livré, transféré (clôture 2026-09-04)** — FILE_ATTENTE, avec le producteur d'intentions | LOT-02 |
| LOT-05 | CB-08 : UI : rayon bibliothèque, fiche analyte, encart patient, cartes du fil | **terminé (2026-09-01)** — rayon + fiches livrés dans la Bibliothèque ; encart patient et cartes du fil constatés déjà livrés hors campagne (`D-070`/`D-071`), dépendances LOT-02/LOT-03 caduques (CB-05 jamais construite, proposition recalculée — chaîne `D-068`→`D-073`). Détail : `lots/LOT-05-ui-rayon-biologie-cb08.md` | ~~LOT-02, LOT-03~~ caduques |
| LOT-06 | CB-09 : Étage 2 : `BiologyResult`, saisie/import, estimé↔mesuré | **hors périmètre — gate dur HDS** | HDS obtenu |

## Done de campagne

Coché à la clôture du 2026-09-04, sur preuves relues.

- [x] Tous les lots requis sont terminés — LOT-05 (2026-09-01, PR #825) et
      LOT-06 (2026-09-03, PR #838/#854) ; LOT-00→LOT-04 requalifiés non
      requis à la clôture (table ci-dessus), le seul reste éventuel (CB-07)
      étant transféré en FILE_ATTENTE.
- [x] Les validations sont documentées — fiches LOT-05/LOT-06 (revues
      adverses, T1/T2, constats par conteneur des deux migrations).
- [x] La documentation canonique est à jour — FEATURE_FLAGS.md §A/§D,
      DOSSIER_RGPD.md (23ᵉ route), réconciliation ROADMAP_PRODUIT /
      REGISTRE_FRONTIERES / FILE_ATTENTE portée par la PR de clôture.
- [x] Le handoff final est produit —
      `docs/claude/handoffs/2026-09-04-2130-cloture-cb-cadrage-suite.md`
      (s'appuie sur `2026-09-04-0040-chantier-d122-etages-biologie.md`).
