# Handoff — 2026-10-07 — BIO-INGEST LOT-04 : migration de la transmission patient

## Git

Branche `feat/bio-ingest-lot04-migration`, issue de main 0596d16a. La PR
est à ouvrir. Lot : 2026-09-30-bio-ingest / LOT-04.

## Objectif

Migration `bio_ingest_transmission_patient_v1`, seule dans sa PR (`D-087`),
confirmée par le responsable le 2026-10-07.

## Décisions

- `origine` (`praticien` par défaut | `patient`) ; `depose_par` nullable ;
  la base tient « praticien ⇔ auteur ».
- Écart (`ecarte_le`, `ecarte_par`, `motif_ecart` fermé), jugé par le
  trigger de purge étendu, motif de purge `ecarte` :
  - seul un document patient s'écarte ;
  - jamais avec une ligne validée, même d'une extraction plus ancienne ;
  - jamais pendant une extraction ;
  - l'écart est daté par la base.
- Réciproque (P1 de `wn-reviewer`) : le trigger des lignes refuse une
  validation après l'écart. La ligne s'écarte encore. Un `FOR SHARE` sur le
  compte rendu sérialise l'écart et la validation.
- Un document déjà purgé ne s'écarte pas : sans document, rien à juger.

## Fichiers

- La migration.
- `schema.prisma`, édité à la main.
- Le contrat neuf `bio_ingest_transmission_patient_v1_negatif.sql`.
- Le contrat de staging : colonnes et index.
- `ci.yml`.
- `lecture.ts` : `deposePar` devient `string | null`.
- La fiche LOT-04, le changelog et le SESSION_LOG.

## Validations

- Contrat neuf vert 3 fois ; il mord sur la mutation de l'ancienne fonction
  des lignes.
- Les 5 autres contrats biologiques sont verts.
- `migrate diff` : No difference.
- T1 vert.
- T3 complet vert, en 4 min 21 s.

## Ouvert

- **À confirmer par le responsable** : un document patient purgé sans écart
  (échéance, ou lignes toutes écartées) s'afficherait « reçu », et le
  plafond de 3 ne compterait que les documents non purgés.
- PR 3 : refuser le retrait d'un document d'origine patient
  (`retrait.ts`).

## Prochaine action exacte

1. PR, CI, lecture des commentaires, merge, à une heure choisie.
2. `release-db` : approbation par le responsable dans la foulée,
   sentinelle du run.
3. Constat par conteneur (`migrate status`), puis première ligne de
   `deployments` = la tête de main.
4. PR 3 : code sous `WN_BIO_PORTAIL_ENABLED` éteint, avec les textes v6 et
   v13.

## Interdits actifs

- Pas de code consommateur avant le constat.
- Pas de `prisma format`.
- Aucune écriture SQL en production.
- Aucun nom de patient dans le dépôt.
