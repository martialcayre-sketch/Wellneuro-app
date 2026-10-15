# Handoff — 2026-10-15 — D-281 §5 : l'avis verrouille son signalement (migration corrective)

## Branche et état Git

- Branche `d281-avis-course-verrou`, depuis `origin/main` à `7a5969c3`
  (#1471), worktree `d281-lot3-portail`.
- PR de migration seule : migration, banc à deux sessions, ligne CI, pas T3,
  fragment changelog, ligne §8 du plan, ce handoff.

## Objectif

Fermer la course trouvée par la passe Codex de #1474 (P1) : un avis posé
pendant qu'une autre transaction délie le signalement (programme supprimé) et
change son patient passait, et l'avis portait un autre patient que son
signalement. Reproduite en local à deux sessions. Migration corrective
demandée par le responsable le 2026-10-15.

## Décisions prises

- `trust_aev_avant_insertion` remplacée : corps identique à
  `20261014230000_saf_ei_verdict_formulaire_avant_v1`, la lecture du
  signalement prend `FOR SHARE`. Aucune colonne, table ni index ;
  `schema.prisma` inchangé ; aucun code.
- `FOR SHARE` plutôt que `FOR UPDATE` : en READ COMMITTED (l'isolation de
  l'application), il suffit contre toute modification de la ligne (y compris
  `ON DELETE SET NULL` et `ON UPDATE CASCADE`) et laisse deux avis
  concurrents ne pas s'attendre par ce verrou. Sous REPEATABLE READ, la
  transaction qui modifie lit les avis avec son instantané : non couvert,
  aucun chemin applicatif.
- Le patient verrouillé d'abord (`FOR KEY SHARE`), dans l'ordre de
  l'effacement IDP2 : revue `wn-reviewer` (P2-1), un avis arrivé pendant un
  effacement l'interbloquait avec le seul `FOR SHARE` — reproduit par la
  course 5 du banc.
- Revue `wn-reviewer` : GO ; P2-1 corrigé (ci-dessus), P2-2 corrigé (texte
  qualifié « en READ COMMITTED »), P2-3 corrigé (le banc ne laisse plus de
  rejet sans gestionnaire).
- Preuve par banc à deux sessions (modèle `banc-masquage-purge`), pas par
  contrat mono-session.

## Fichiers modifiés

- `web/prisma/migrations/20261015130000_saf_ei_avis_verrou_signalement_v1/migration.sql`
- `web/scripts/banc-avis-signalement-deux-sessions.test.mjs`
- `.github/workflows/ci.yml` (pas du banc)
- `scripts/wn-test-worktree.sh` (pas du banc)
- `changelog.d/2026-10-15-d281-avis-verrou-signalement-migration.md`
- `docs/claude/PLAN_WELLNEURO.md` (§8 : #1474 constatée, correctif)

## Validations exécutées

- Reproduction de la course avec la fonction en production : signalement au
  patient B, avis au patient A.
- Base locale : fonction neuve, trois contrats SAF-EI verts, banc 5/5 vert.
- Contre-épreuves : fonction d'origine, banc 0/5 (aucune attente de verrou) ;
  `FOR SHARE` sans verrou du patient, course 5 en interblocage ; fonction
  neuve remise.
- T1 vert ; T3 vert sur la version sans verrou du patient, rejoué sur la
  version finale (voir la PR).

## Problèmes ouverts

- Fil du jour et prévol comptés par statut ; désignation illisible à trancher
  (plan §8).

## Prochaine action exacte

1. CI vert, revue CodeRabbit sur la tête, passe Codex (P0), merge.
2. Responsable : créneau, approbation `release-db` ; sentinelle liée au run ;
   constat par conteneur ; première ligne de `scalingo deployments` = tête de
   `main`.
3. Suite avant signature : Fil du jour et prévol par l'attente d'avis.

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant l'étape 5 et ses préalables.
- Production en lecture seule par conteneur ; aucune identité réelle au dépôt.
