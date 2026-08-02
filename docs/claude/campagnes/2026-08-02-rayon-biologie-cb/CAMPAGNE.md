---
id: "2026-08-02-rayon-biologie-cb"
titre: "Rayon biologie fonctionnelle — achever CB-03 à CB-09"
statut: "cadrée"
créée_le: "2026-08-02"
mise_à_jour: "2026-08-03"
lot_courant: "CB-03"
branche_campagne: "campaign/2026-08-02-rayon-biologie-cb/integration"
branche_lot_courant: "campaign/2026-08-02-rayon-biologie-cb/cb-03"
cible_pr_lot: "campaign/2026-08-02-rayon-biologie-cb/integration"
cible_pr_campagne: "main"
---

# Rayon biologie fonctionnelle — achever CB-03 à CB-09

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

- BRIEF_COMPILED.md : synthèse structurée des sources.
- CAMPAIGN_DRAFT.md : canevas R0→R6.
- Cadrage source :
  `docs/claude/propositions/2026-07-25-rayon-biologie-fonctionnelle/README.md`
  (§8, tableau des lots CB-00→CB-09).

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| CB-00 | Cadrage + décisions 0/A→G + audit source NABM | **fait** (PR #364) | — |
| CB-01 | Migration catalogue CB-A (11 tables) + deux flags | **fait** (PR #369) | CB-00 |
| CB-02a | Import NABM (987 actes) + migration additive | **fait** (PR #374, #381, #433) | CB-01 |
| CB-02b | Corpus notebook biologie (135 chunks, 758 claims) | **fait** (PR #394) | décision G levée |
| CB-03 | Extension moteur (cibles analyse/panel_bio) + table de règles vide signée-sha | **bloqué** — attend lots 8-9 certification | CB-02b |
| CB-04 | Compilateur `tools/corpus/biologie/compile.mjs` | à_faire | CB-03 + claims validés |
| CB-05 | Migration + machine à états `BiologyExplorationProposal`/`Item` | à_faire — **confirmation obligatoire (migration)** | CB-01, CB-03 |
| CB-06 | Régimes de diffusion (courrier médecin / document patient) | à_faire | CB-05 |
| CB-07 | Contrat protocole V4 `BiologyCatalogRef` | à_faire — revue adversariale requise | CB-05 |
| CB-08 | UI : rayon bibliothèque, fiche analyte, encart patient, cartes du fil | à_faire | CB-05, CB-06 |
| CB-09 | Étage 2 : `BiologyResult`, saisie/import, estimé↔mesuré | **hors périmètre — gate dur HDS** | HDS obtenu |

## Done de campagne

- [ ] Tous les lots requis sont terminés.
- [ ] Les validations sont documentées.
- [ ] La documentation canonique est à jour.
- [ ] Le handoff final est produit.
