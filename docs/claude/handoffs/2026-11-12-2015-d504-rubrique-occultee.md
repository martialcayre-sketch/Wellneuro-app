# Handoff — 2026-11-12 — D-504 : une quatrième rubrique occultée au journal de H15, avant le banc

## Branche et état Git

- Branche `docs/d504-occultation-rubrique-iom`, créée sur `origin/main` a84e5a69, dans le worktree
  `.claude/worktrees/b-bp17-cadre`.
- Documentation seule. Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Le lot 3 (banc identifiant–rubrique, `D-502` §4, Q3 bis) a trouvé, en balayant l'arbre courant, un quatrième écart
de même nature que ceux de `D-502`. `D-502` §4 exige une nouvelle décision. Cette PR la porte, avant le banc.

## Décisions prises

- Préalable du lot 3 : `20261112-1241-b` était déjà `close` (pr 2036, posé par l'intégrateur) ; rien à écrire.
- Écart : `docs/claude/plan-journal/H15/2026-11-12-01-iom-2000-relecture-0649-005.md`, ligne 2 (un identifiant de
  claim associé au nom de sa rubrique). La structure des fiches d'usage, au dépôt, épingle ce claim à des fiches et
  non à une rubrique : l'association n'était publique nulle part ailleurs.
- Question `20261112-2005-b` (liste commune, nature ordinaire), tranchée en séance par le responsable sur l'option
  recommandée : « décision d'occultation d'abord, banc ensuite ». Statut `repondue`, à passer en `close` au merge.
- `D-504` (numéro réservé par `wn-reserver-decision.mjs`) : exception bornée à cette ligne, au modèle de `D-502` ;
  fragment correctif `H15/2026-11-12-07-…` sans nom de rubrique.

## Fichiers modifiés

- `docs/decisions/D-504.md` (nouveau).
- `docs/claude/plan-journal/H15/2026-11-12-01-iom-2000-relecture-0649-005.md` (une ligne, par `D-504`).
- `docs/claude/plan-journal/H15/2026-11-12-07-correction-rubrique-occultee-d504.md` (nouveau).
- `changelog.d/2026-11-12-d504-rubrique-occultee.md` ; ce handoff.

## Validations exécutées

- T1 (`check:rapide`) : voir la PR.
- Le banc (hors de cette PR, gardé de côté ; 10 tests verts) a été rejoué sur l'arbre de cette branche : `exit=0`,
  aucune ligne signalée. Sur `origin/main` a84e5a69, il signalait la seule ligne de §1 de `D-504` ; il prenait aussi
  les trois lignes d'avant `D-502`, relues dans l'historique.
- Le garde du journal avertira sur le fragment modifié : c'est attendu (exception de `D-504`).

## Problèmes ouverts

- Le banc lui-même (lot 3) n'est pas dans cette PR. Ses trois fichiers (bibliothèque, ligne de commande, banc de
  tests) sont gardés de côté dans le bloc-notes de la session. Il se branche bloquant dans une PR d'outillage,
  APRÈS le merge de celle-ci.

## Prochaine action exacte

1. CI de la tête ; revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer` ; déclarer « prête ».
2. Au merge : `20261112-2005-b` en `close` (pr, `merge_le`).
3. Lot 3 : branche `feat/banc-journal-identifiant-rubrique` sur le nouveau `origin/main`, avec le banc branché dans
   `ci.yml` (étape bloquante à côté du garde du journal) et dans `bancs-outillage-check` / `plan-journal-check`.

## Interdits encore actifs

- Aucun nom de rubrique, texte de claim ni dose au dépôt, ni dans les tests, ni dans les messages de commit.
- Aucune autre réécriture de fragment du journal (`D-502` et `D-504` sont closes à leurs lignes).
- Aucune migration, aucune écriture en base ; pas de `prisma format`.
