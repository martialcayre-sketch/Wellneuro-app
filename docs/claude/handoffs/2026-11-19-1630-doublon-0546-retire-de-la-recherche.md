# Handoff — 2026-11-19 — doublon WN-SRC-0546 / 0564 retiré de la recherche (migration), lot de la file B

## Branche et état Git

- Branche `db/retire-recherche-doublon-wn-src-0546`, créée sur `origin/main` 4a415c14 puis avancée en `--ff-only` (D-518) jusqu'à la tête de `main` relue avant d'écrire. Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. La migration est portée par cette file jusqu'au constat par conteneur (`D-373` §1).

## Objectif

Réponse A du responsable (2026-11-19) à la question `20261119-1311-b` : retirer de la recherche les claims et passages du manuscrit soumis `WN-SRC-0546`, doublon de la version publiée `WN-SRC-0564`, sans suppression, par le mécanisme d'exclusion existant, sans nouvelle colonne.

## Décisions prises

- Le mécanisme existe sans changement de schéma : `exclu_recherche` pour les claims (`D-490`, journal `exclusion_recherche`), `active = false` pour les passages (seul drapeau de retrait, lu par la recherche). Les passages n'ont pas de marque d'exclusion propre : `active` est donc la voie, et `store.ts` compte les liens vers des passages inactifs comme dérive normale, jamais comme faute.
- La migration journalise comme l'écrivain de l'atelier (UPDATE et INSERT du journal dans une transaction), au nom du signataire de chaque claim lu sur sa ligne : aucune adresse en dur. Motif : le doublon, l'arbitrage et la question nommés, sans texte clinique.
- Gardes de la migration : refus si la version publiée n'a ni claim visible ni passage actif ; contrôle de sortie. Sans effet sur une base vide.
- Preuve par un banc qui rejoue le fichier SQL sur des fixtures de mêmes identifiants dans une transaction annulée, ajouté au CI et à `test:worktree` ; rejoué en local sur la base du worktree (sept étapes vertes, migration appliquée à vide sans erreur).
- Registre : `0546` dit son retrait de la recherche ; `0564` ne dit plus « claims en attente de signature » (ils sont signés).
- Rang du journal H15 : `10`.

## Fichiers modifiés

- `web/prisma/migrations/20261119170000_rag_retire_recherche_doublon_wn_src_0546_v1/migration.sql` ; `web/scripts/banc-retire-doublon-0546-prisma.test.ts` ; `.github/workflows/ci.yml` et `scripts/wn-test-worktree.sh` (ligne du banc) ; `docs/claude/corpus/source_registry.json` et `README.md` ; `docs/claude/plan-journal/H15/2026-11-19-10-doublon-0546-retire-de-la-recherche.md` ; `changelog.d/2026-11-19-doublon-0546-retire-de-la-recherche.md` ; ce handoff.
- Hors dépôt : avis Codex P0 déposé sur la PR, registre des messages.
- `schema.prisma` inchangé : les deux tables sont externes.

## Validations exécutées

- Base locale du worktree migrée (`wn-dev-db.sh --migrate`) : toutes les migrations appliquées, dont celle-ci, à vide.
- Banc de la migration sur fixtures : sept étapes vertes (exclusion, signature intacte, journal, passages, recherche, rejeu, garde).
- Résultats du CI, de Codex P0, de `wn-reviewer` et de PR-Agent : dans la PR.

## Problèmes ouverts

- Après le merge : `release-db` à suivre jusqu'au constat par conteneur (huit claims exclus et huit actes, six passages inactifs, version publiée intacte), puis ligne `WN_CONSTAT_RELEASE_DB run=<id>` sur la PR ; un merge à la fois, sonde `wn-sonde-release-db.mjs`.
- Les compteurs de santé des claims (`sourcesSupersedees`) augmentent de huit liens à l'application : attendu.

## Prochaine action exacte

1. Contre-revue Codex P0 (`node scripts/wn-codex-avis.mjs`, paquet sans donnée privée), GO de `wn-reviewer` sur la tête, `wn-attendre-ci` = 0, PR-Agent = 0, boîte B relue.
2. « prête @<sha> » (migration : la file la garde), sonde release-db = 0, merge, suivi du run jusqu'au constat.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucun seuil au dépôt (`D-251` §4, `D-325` §5).
- Aucune suppression, aucun rejet, aucun changement de statut de claim ; aucune autre migration ; `WN-SRC-0564` intact.
- Production lue seulement par `scalingo run -d`, écrite seulement par `release-db` ; un merge de migration à la fois.
