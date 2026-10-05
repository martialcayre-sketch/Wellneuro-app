# Handoff — 2026-10-05 — BIO-INGEST LOT-07 : migration du signal « fait non transcrit »

## Branche et état Git

`feat/bio-ingest-lot07-faits-laboratoire`, depuis `main` 9d47e9d6. **Migration
seule**, sans code consommateur.

## Objectif

Tenir l'arbitrage du responsable (`D-267` §10) : au-delà de sa borne
technique, un intervalle (300 caractères) ou un marquage (50) reste NULL, et
la ligne le dit à la validation.

## Décisions prises

- Choix du responsable, en session : une colonne booléenne (option
  recommandée), plutôt qu'une trace serveur seule.
- Deux booléens `NOT NULL DEFAULT false`. Une CHECK impose « vrai ⇒ fait
  NULL ». La fonction de la ligne est reprise de
  `bio_ingest_faits_laboratoire_v1` : seuls les deux booléens s'ajoutent à la
  liste figée.
- Le signal se pose seulement sur un dépassement de borne (`D-267` §10).
- Aucune nouvelle version TRUST : la v5 reste vraie, et un booléen ne recopie
  rien du document (revue `wn-reviewer`).

## Fichiers modifiés

`migration.sql` (20261005210000), `schema.prisma`, contrat
`bio_ingest_faits_non_transcrits_v1_negatif.sql` (+ étape CI), liste blanche
du contrat staging, `D-267` §10, dossier RGPD (table santé), fiche LOT-07,
changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- `prisma validate` ; T3 complet vert deux fois (avant et après les
  compléments du contrat) : dérive « No difference detected », contrat joué.
- `wn-reviewer` : GO, ni P0 ni P1. P2 de cette PR corrigés (fiche, sémantique
  du §10, symétrie du contrat).
- Prémisse « lignes existantes toutes `bio-extraction-v1` » constatée en
  production (BP-02, bloc 06).

## Prochaine action exacte

1. Passe Codex sur cette PR (geste du responsable, bloc dans la PR).
2. Merge, puis `release-db` approuvée **dans la foulée** (fenêtre de panne :
   `ADD COLUMN` déclaré au schéma). Sentinelle liée au run, constat par
   conteneur.
3. Code du LOT-07, seconde PR, avec les reports de la revue :
   - liste blanche BP-01 étendue aux faits et aux deux booléens ;
   - longueur mesurée en points de code (`[...s].length`) après le rognage
     du parseur ;
   - aucune `maxLength` dans le schéma envoyé au modèle ;
   - un test qui prouve que tout dépassement pose le signal ;
   - la décision « validée » éprouvée côté code.

## Interdits encore actifs

- Aucun code consommateur avant la migration constatée (`D-087`).
- Passe Codex obligatoire, sur la migration comme sur le code (`D-267` §9).
- Rien sur `ResultatBiologique` ; aucun intervalle recalculé ni citable.
