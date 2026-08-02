---
id: "LOT-02"
titre: "machine-etats-proposition-cb05"
statut: "à_faire"
dépend_de: "CB-01 (fait) ; LOT-00 (CB-03)"
---

# LOT-02 (CB-05) — Machine à états de la proposition d'exploration

## But

Créer `BiologyExplorationProposal` / `BiologyExplorationItem` (migration) et
la machine à états append-only qui transforme les candidats du moteur (CB-03)
en proposition figée signée par le praticien.

## Résultat observable

- Migration Prisma additive : tables `BiologyExplorationProposal` (états
  `brouillon_moteur → en_edition_praticien → signee → …`) et
  `BiologyExplorationItem` (analyte, panel ou ratio ; priorité ; niveau ;
  objectif clinique ; besoins visés ; `motifs[] = { regleId, conditions,
  claims }`, `claims` jamais vide).
- Génération des candidats depuis les sorties du moteur biologie (CB-03),
  jamais l'inverse.
- Aucune valeur biologique n'entre dans la proposition (elle porte la
  *demande*, jamais le *résultat* — invariant valable aussi après l'étage 2).
- Vocabulaire imposé respecté : jamais « prescription », « ordonnance »,
  « diagnostic » en surface.

## Périmètre

- Migration Prisma (**acte gaté — confirmation obligatoire explicite avant
  exécution**, revue adversariale `wn-reviewer` avant merge, vérification base
  après merge).
- Logique de transition d'état (append-only, patron de la chaîne clinique
  `ClinicalSnapshot → ClinicalReview → DecisionCard`).
- Génération des candidats à partir de `OrientationSuggestion` biologie.

## Hors périmètre

- Génération du courrier médecin / document patient (CB-06).
- Contrat protocole V4 `BiologyCatalogRef` (CB-07).
- UI (CB-08).

## Fichiers probables

- `web/prisma/schema.prisma` (nouvelles tables — **ne pas modifier sans
  confirmation explicite distincte**, cf. règles du dépôt)
- `web/prisma/migrations/<horodatage>_cb_exploration_proposal_v1/migration.sql`
- `web/src/lib/biology-library/proposal/**` (nom indicatif)
- Référence de patron : `web/src/lib/clinical-engine/` (chaîne
  `ClinicalSnapshot`/`DecisionCard`)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- **Aucune migration Prisma sans confirmation explicite distincte de
  l'utilisateur, obtenue avant l'exécution de `prisma migrate` — ce lot est
  marqué CONFIRMATION OBLIGATOIRE.**
- Pas de champ pour une valeur biologique réelle dans ces tables (l'étage 2
  est une entité distincte, CB-09, gate dur HDS).
- Pas de refactor hors lot.

## Étapes

- [ ] **Confirmation explicite de l'utilisateur avant toute migration.**
- [ ] Concevoir le schéma (revue adversariale avant merge).
- [ ] Implémenter la machine à états (append-only, jamais d'édition en place).
- [ ] Générer les candidats depuis le moteur CB-03.
- [ ] Exécuter les validations (T2 minimum, migration ⇒ envisager T3).
- [ ] Vérifier la base après merge (`execute_sql`, lecture seule).
- [ ] Documenter les résultats.

## Tests

- T2 avant tout commit UI/API.
- T3 avant la PR (migration).
- Tests : transition d'état invalide rejetée, `claims` jamais vide à la
  création d'un item, aucune valeur biologique acceptée en entrée.

## Critères de done

- Confirmation de migration obtenue et tracée.
- Revue adversariale faite avant merge.
- Base vérifiée après merge.

## Résultats

À compléter à la clôture.
