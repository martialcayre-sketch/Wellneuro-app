# Handoff — 2026-10-13 — G3 de BioFlow : la migration (D-282, lot 2)

## Branche et état Git

`feat/g3-travaux-extraction-migration`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, rebasée sur `origin/main`
(`36f82cf1`, merge de `D-283`). Migration seule. PR ouverte avec ce handoff.

## Objectif

Lot 2 du G3 (`D-282` §6) : la table de travaux, son contrat SQL, son
effacement IDP2 et sa déclaration RGPD — sans code consommateur.

## Décisions prises

- Table `travaux_extraction_biologique` (11 colonnes), statut
  `en_attente` / `en_cours` / `termine` / `echec`, tentatives 0 à 2.
- Cohérence en `CASE` (piège du CHECK à NULL, contrat de `D-281`).
- Unicité partielle d'un travail ouvert par compte rendu et index de file
  partiel, portés par le SQL seul — jamais redéclarés au schéma.
- Trigger : import courant du même compte rendu, identité figée, travail
  terminé figé, tentatives qui ne reculent pas. La purge (`DELETE`) reste
  admise.
- Clés `RESTRICT` : le lot 3 supprime les travaux avant tout retrait de
  document.

## Fichiers modifiés

- `web/prisma/schema.prisma` (modèle et trois relations inverses).
- `web/prisma/migrations/20261013120000_g3_travaux_extraction_biologique_v1/`.
- `web/prisma/checks/g3_travaux_extraction_biologique_v1_negatif.sql` et
  `.github/workflows/ci.yml`.
- `web/src/lib/patient/effacement.ts` (+ test d'ordre).
- `docs/DOSSIER_RGPD.md` (rubrique 5), changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- `npx prisma validate` ; migration appliquée en local ; contrat vert ;
  `prisma migrate diff` : *No difference detected*.
- La base locale portait l'ancienne version de la migration `D-281` (sans
  `trust_aev_patient_idx`) : index recréé en local seulement. La production a
  ses cinq index (constat du lot 2 de `D-281`).
- T1 complet vert (`npm run check`).

## Problèmes ouverts

- Relance manuelle entre 5 et 6 min : la route dira « reprise en cours » au
  lot 3.

## Prochaine action exacte

CI, revue, merge au créneau choisi par le responsable, `release-db`
approuvée par lui, constat par conteneur (table, 5 index, trigger, RLS, 0
ligne). Puis lot 3 : `web/scripts/bioExtractionWorker.ts`, route sous
`WN_BIO_EXTRACTION_ASYNC` éteint, retrait des travaux avant le retrait d'un
document, purge à 30 jours, bancs à deux sessions.

## Interdits encore actifs

- Aucun code consommateur avant le constat de la `release-db`.
- Ne pas toucher à la borne d'extraction (LOT-08) ni aux refus de relance
  (LOT-09).
- `scale worker`, pose du drapeau et approbation `release-db` : gestes du
  responsable.
