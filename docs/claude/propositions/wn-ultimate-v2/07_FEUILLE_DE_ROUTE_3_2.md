---
id: "wellneuro-feuille-route-3-2"
version: "3.2"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Feuille de route WellNeuro 3.2

> Cette séquence décrit la cible restante, pas l'ordre historique déjà
> exécuté. HC-F LOT-00 à LOT-04 ont été livrés avant la correction
> d'orchestration proposée en phase 0.

## Phase 0 — sécuriser l’orchestration

- corriger `wn-campaign.mjs` ;
- lire explicitement `ACTIVE_CAMPAIGN.md` ;
- ajouter `_prepared` ;
- commandes activate/deactivate ;
- dépendances et gates ;
- tests.

Aucune campagne préparée ne doit devenir active implicitement.

## Phase 1 — terminer HC-F

- LOT-05 gouvernance et handoff ;
- figer la grammaire UX ;
- arrêter les refontes cosmétiques globales.

État réconcilié au 2026-07-13 : LOT-04 est terminé. LOT-05 reste le prochain
lot à clôturer avant promotion de cette feuille de route.

## Phase 2 — réalignement documentaire

- déposer la source maître ;
- mettre à jour programme et frontières ;
- intégrer le présent pack ;
- importer C1B sous `_prepared` ;
- versionner le manifeste de sources ;
- archiver les documents remplacés.

La présente branche réalise uniquement l'intégration en espace de
propositions. La promotion canonique et tout archivage restent soumis à une
validation distincte.

## Phase 3 — C1 contrats et snapshot

### C1-00

- audit réel ;
- décisions cliniques ;
- cartographie des données.

### C1-01A

- contrats `AssessmentEpisode`, `BalanceAssessment`, `ClinicalSnapshot` ;
- adaptateur questionnaires ;
- adaptateur Mon équilibre ;
- registre des objets cliniques.

### C1-01B

- signaux ;
- données manquantes ;
- discordances ;
- sécurité ;
- abstention.

### C1-02

- DecisionCard ;
- contre-factuels ;
- provenance.

### C1-03

- ProtocolDraft ;
- trois actions ;
- charge ;
- plans.

### C1-04

- cockpit ;
- TwoLevelReading ;
- ModeConsultation ;
- aperçu patient.

### C1-05

- validation ;
- synthèse ;
- tests ;
- handoff.

## Phase 4 — chantiers parallèles sans migration

### C1B documentaire

- audit droits ;
- contrats ;
- manifeste ;
- pilote en fichiers ;
- outillage read-only.

### QX

- pilotes certifiés uniquement.

### C4A

- catalogue intrinsèque ;
- ingrédients, formes, excipients, sécurité.

### C5A

- profils alimentaires intrinsèques ;
- taxonomie et sources.

### JA-01

- domaine TypeScript pur du journal corrigé ;
- aucun branchement DB.

## Phase 5 — C3 documents

Après stabilisation de DecisionCard et ProtocolDraft :

- blocs multi-audience ;
- provenance ;
- templates ;
- booklet ;
- courrier médecin ;
- résumé patient.

## Phase 6 — C2A et persistance

Après confirmation explicite de migration :

- protocole actif ;
- check-ins ;
- événements ;
- timeline ;
- AssessmentEpisode ;
- journal ;
- PhaseReview.

## Phase 7 — journal et Boussole contextuelle

- portail journal ;
- analyse ;
- action alimentaire ;
- vue praticien ;
- résumé J21 ;
- Boussole contextuelle.

## Phase 8 — C2B

Après données longitudinales réelles :

- momentum explicable ;
- comparateur ;
- aide à l’ajustement ;
- détection déterministe de décrochage, uniquement si validée.

## Phase 9 — runtime corpus

Après G0–G4 :

- ingestion pilote ;
- build candidat ;
- recherche bornée ;
- intégration C1/C3/C4/C5 ;
- G5 migration séparée ;
- G6 go/no-go.

## Phase 10 — différés

- biologie réelle HDS ;
- OCR ;
- scan produit ;
- photo repas assistée ;
- panier ;
- messagerie ;
- notifications ;
- copilotes.

## Critères de passage

Chaque phase exige :

- tests ;
- documentation ;
- provenance ;
- absence de terme banni ;
- fixtures fictives ;
- pas de migration implicite ;
- handoff ;
- go/no-go.
