# Handoff — BIO-INGEST LOT-04, PR 1 : D-269 et registre RGPD

## Git

- Branche : `docs/bio-ingest-lot04-registre`, PR #1350 ouverte (CI vert sur
  4a7c8990, corrections Copilot poussées ensuite).
- Lot : 2026-09-30-bio-ingest / LOT-04 (`active_lot` posé à la main).

## Objectif

Le patient transmet son compte rendu depuis son portail et suit son statut.
Aucun résultat n'est écrit sans validation du praticien. Aucune extraction
ne part au dépôt.

## Décisions (D-269, arbitrages du 2026-10-07)

- Origine portée par `comptes_rendus_biologiques` (`praticien` | `patient`).
  Pas de table de transmission.
- Geste « Écarter » : motif fermé `illisible` | `document_non_conforme`,
  purge immédiate (motif `ecarte`). Il est irréversible et refusé si une
  ligne est validée ou si une extraction est en cours. Le retrait est
  refusé sur un document d'origine patient.
- Statut patient dérivé : en attente, reçu, validé, refusé, illisible.
  Jamais une valeur.
- Bornes : 3 documents « en attente » ou « reçus », 10 dépôts par 24 h,
  mêmes types et taille que le praticien.
- Accusé `usage_ia` v6 courant exigé côté serveur.
- Carte du Fil seule.
- Précondition `D-266` §15 consignée (BP-10 en production).

## Fichiers

`docs/DECISIONS.md`, `docs/DOSSIER_RGPD.md` (§2 ter, rubriques 5 et 8),
`CAMPAGNE.md`, fiche LOT-04, fiche LOT-10 (BIO-PARCOURS), `.wn/state.json`,
`ACTIVE_CAMPAIGN.md`, changelog, SESSION_LOG.

## Validations

T1 complet vert. CI de #1350 vert. Revue Copilot : 4 corrections faites
(quota « ou reçus », date de la campagne) et la clôture ajoutée.

## Ouvert

- Textes v6 et v13 **validés par le responsable le 2026-10-07**
  (`DOSSIER_RGPD.md` §2 ter).

## Prochaine action

1. CI, puis merge de #1350.
2. Ensuite la PR 2, la migration `bio_ingest_transmission_patient_v1`
   (plan : `D-269` §8, fiche LOT-04), **seule dans sa PR, sur confirmation
   distincte** :
   - colonnes `origine` et `ecarte_*` ;
   - `depose_par` nullable ;
   - trigger d'UPDATE étendu ;
   - contrat SQL négatif.
3. Puis `release-db` approuvée et constat par conteneur. Ensuite seulement
   la PR 3, le code sous `WN_BIO_PORTAIL_ENABLED` éteint, avec les textes
   v6 et v13.

## Interdits actifs

Aucune migration sans confirmation distincte. Pas de `prisma format`.
Aucune extraction au dépôt patient. Aucune valeur montrée au patient.
Aucune écriture dans `resultats_biologiques` sans validation. Aucune donnée
patient réelle.
