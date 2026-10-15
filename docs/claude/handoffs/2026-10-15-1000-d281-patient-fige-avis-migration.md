# Handoff — 2026-10-15 — D-281 §5 : patient figé dès qu'un avis existe (migration seule)

## Branche et état Git

- Branche `d281-gel-patient-migration`, depuis `origin/main` à `21c9632c`
  (#1470), worktree `d281-lot3-portail`.
- PR de migration seule : migration, contrat SQL, ligne CI, fragment
  changelog, ligne §8 du plan, ce handoff.

## Objectif

Dernier correctif base avant la signature de SAF-EI-01 (M-1), routé par la
revue CodeRabbit de #1464 et arbitré par le responsable le 2026-10-15 :
l'effacement IDP2 remet `protocol_draft_id` à NULL, et le patient d'un
signalement du formulaire d'avant redevenait modifiable alors qu'il porte des
avis. Migration demandée explicitement par le responsable le 2026-10-15.

## Décisions prises

- Une fonction de trigger remplacée (`trust_aer_rattachement_garde`), sans
  colonne, table ni index ; `schema.prisma` inchangé. Corps repris à
  l'identique de `20261014230000_saf_ei_verdict_formulaire_avant_v1`, plus
  une garde : patient figé dès qu'un avis porte sur le signalement.
- Message propre à la garde neuve (« qui porte un avis ») : les gardes
  existantes et le motif qu'éprouve le contrat précédent sont inchangés.
- Aucun code consommateur : aucun écrivain ne change le patient d'un
  signalement.
- Revue `wn-reviewer` : GO, aucun P0/P1. P2 pris : le trou n'est pas ouvert
  en production (l'effacement IDP2 supprime avis et signalements dans la même
  transaction) — texte reformulé en défense en profondeur ; « désormais »
  retiré pour le renommage en cascade, déjà refusé par le figement des
  verdicts. P2 laissé, limite connue : comme les gardes existantes, la garde
  lit une table sous RLS sans `SECURITY DEFINER` ; elle vaut pour le
  propriétaire, et aucune table n'est en `FORCE ROW LEVEL SECURITY`.

## Fichiers modifiés

- `web/prisma/migrations/20261015090000_saf_ei_patient_fige_verdict_v1/migration.sql`
- `web/prisma/checks/trust_aer_patient_fige_verdict_v1_negatif.sql`
- `.github/workflows/ci.yml` (ligne du contrat)
- `changelog.d/2026-10-15-d281-patient-fige-avis-migration.md`
- `docs/claude/PLAN_WELLNEURO.md` (§8, ligne « D-281, formulaire d'avant »)

## Validations exécutées

- Base locale du worktree migrée ; contrats du lot 2, du formulaire d'avant
  et neuf : verts.
- Contre-épreuve : ancienne fonction remise dans une transaction annulée, le
  contrat neuf échoue sur « patient changé, signalement délié qui porte un
  avis ».
- T1 (`check:rapide`) vert. T3 : voir la PR.

## Problèmes ouverts

- Fil du jour et prévol comptés par statut ; désignation illisible à trancher
  (plan §8).

## Prochaine action exacte

1. CI vert, revue CodeRabbit sur la tête, merge.
2. Responsable : choisir le créneau, approuver `release-db` ; sentinelle
   `WN_RELEASE_DB_OK id=<run>` ; constat par conteneur (`migrate status`) ;
   première ligne de `scalingo deployments` = tête de `main`.
3. Suite avant signature : Fil du jour et prévol par l'attente d'avis.

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant l'étape 5 et ses préalables.
- Production en lecture seule par conteneur ; aucune identité réelle au dépôt.
