# Handoff — BIO-INGEST LOT-02, PR 1 : migration du staging

## Branche et état Git

- Branche `feat/bio-ingest-lot02-migration-staging`, partie de `64a34bac`
  (après le merge de #1279).
- Commits : `b88bd15a` (migration), `dde2deba` (première revue et
  arbitrages), `b0784090` (instants en UTC), puis la clôture.
- PR à ouvrir.

## Objectif

Créer, dans une migration seule (D-087), le staging de D-256 A2/A5 :
`comptes_rendus_biologiques`, `imports_biologiques` et
`lignes_biologiques_candidates`. Le code consommateur vient en PR 2.

## Décisions (plan et arbitrages du 2026-10-01)

- Types acceptés : PDF, JPEG, PNG, WebP. Taille : 10 Mo au plus. Le resolver
  libellé → analyte sera un module TS signé (PR 2), et il pose seul
  `analyte_propose`.
- Le résultat validé garde `source = saisie_praticien` et doit être saisi
  après la fin de l'extraction (garde en base). `import_labo` reste réservé
  au LOT-05.
- Le retrait d'un dépôt erroné viendra en PR 2, sans changement de migration.
  La purge du document attend la rubrique 8.
- Les écarts sont confirmés par le praticien, jamais posés par le système.
- `laboratoire_lu` est ajouté : NULL à la création, posé à la terminaison.
- Les instants posés par la base sont en UTC explicite (base locale en
  Europe/Paris).

## Fichiers modifiés

- Migration `20261001210000_bio_ingest_staging_v1`.
- `schema.prisma`.
- Contrat `bio_ingest_staging_v1_negatif.sql` et son step dans `ci.yml`.
- `effacement.ts` et son test.
- `staging.guard.test.ts`.
- `rubrique5.modeles.test.ts`.
- `DOSSIER_RGPD.md` (rubrique 5).
- Fiche LOT-02 (consignes pour la PR 2).
- Fragment de changelog.

## Validations

- Parité schéma ↔ migration : *No difference detected*.
- Contrat vert en fuseau Paris ; 77 mutants tués sur 77.
- T1 complet vert.
- T3 vert sur `b88bd15a`, sur `dde2deba` et sur `b0784090` (E2E Chromium et
  WebKit compris).
- Deux passes `wn-reviewer` : GO, sans P0.

## Problèmes ouverts

- Rubrique 8 : la durée de conservation du document.
- Bases locales jetables laissées en place (`wellneuro_mutants_staging`,
  `wellneuro_bio_parite`, `wellneuro_bio_utc`) : un `DROP` attend l'accord
  de l'utilisateur.

## Prochaine action exacte

1. Ouvrir la PR (`--body-file`), attendre le CI avec `wn-attendre-ci`, lire
   les commentaires en ligne, puis merger.
2. **`release-db` approuvé par le responsable** dans la foulée du merge.
3. Constat par conteneur : migrations agrégées par nom, trois tables,
   `relrowsecurity`.
4. Ensuite seulement, la PR 2, selon les consignes de la fiche.

## Interdits actifs

- Aucun code consommateur avant le constat.
- Aucun masquage d'identité.
- Aucune donnée réelle.
- Jamais `prisma format`.
