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
- **Arbitrages du responsable sur la revue (2026-10-13)** :
  - l'import ne s'ouvre qu'à la **réclamation**, jamais à la demande. Sinon
    sa péremption de 5 min, comptée depuis sa création, mangerait le temps
    passé dans la file (P1 de `wn-reviewer`, confirmé dans
    `lancerExtraction.ts:104-106`). `id_import_courant` est nul en attente
    et requis en cours et terminé ; un import posé ne se retire pas ;
  - le motif d'échec est une **liste fermée** : les quatre refus de
    l'ouverture et `tentatives_epuisees`.

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
- T1 complet vert (`npm run check`). T3 complet vert sur la première forme, puis
  rejoué vert après la correction (base neuve, contrat joué, *No
  difference detected*).
- Revue `wn-reviewer` : P1 corrigé (arbitrage) ; P2-1 à P2-3 corrigés, le
  contrat couvre chaque branche de la cohérence, `termine` figé, la relance
  après un échec, de vrais `DELETE` sous `RESTRICT` et les quatre index ;
  P2-4 corrigé (liste fermée).

## Problèmes ouverts

Routés au lot 3, constats de la revue :

- P2-5 : le retrait d'un document échouera dès qu'un travail existe, même
  terminé. La suppression des travaux arrive dans la même PR que le premier
  code qui écrit la table.
- P2-6 : écrire `reserve_jusqua` et `termine_le` en SQL
  (`clock_timestamp() AT TIME ZONE 'UTC'`) et jouer le banc sous
  Europe/Paris.
- Une reprise ouvre l'import puis met le travail à jour : le worker doit le
  faire dans UNE transaction, sinon l'import neuf bloque la relance
  pendant 5 min.
- Possible interblocage entre l'effacement et le worker : le banc à deux
  sessions doit le jouer.
- À la création d'un travail, pas d'`upsert` : intercepter `P2002`
  (l'unicité partielle n'est pas au schéma).
- La base de dev locale garde la première forme de la migration : la garde
  refuse le `DROP`. Base neuve à prendre avant le lot 3.

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
