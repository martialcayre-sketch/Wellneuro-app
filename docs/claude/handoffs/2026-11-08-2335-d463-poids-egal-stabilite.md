# Handoff — 2026-11-08 — D-463 : motif du poids égal de la stabilité métabolique (c, F59)

## Branche et état du dépôt

- Branche `docs/d463-poids-egal-stabilite`, créée depuis `origin/main` à `25f3cb9a` (#1925).
- Worktree `.claude/worktrees/d463-poids-egal` : session concurrente, cycle en `git`/`gh` direct.
- PR de décision seule : `docs/decisions/D-463.md`, un fragment `changelog.d/` et ce handoff. Ni code, ni `schema.prisma`, ni migration.
- Numéro réservé par `wn-reserver-decision` (`refs/tags/reserve/D-463`).
- **Pas de release-db attendue** : aucun chemin déclencheur n'est touché.
- La #1933 (constat F59 et correction du fragment du 2026-11-01) est déclarée prête et attend l'intégrateur. Les deux PR ne touchent aucun fichier en commun.
- D-454 : la PR est déclarée « prête @<sha> » ; l'intégrateur la merge, puis passe à `close` les questions `20261108-2327-c` et `20261108-2328-c`.

## Objectif

Acter le geste du responsable : le motif du poids égal de Q_INF_01 et Q_INF_02, dette laissée ouverte par la #1933.

## Décisions prises

- Motif : la phrase de D-403 §1, reprise mot pour mot et appliquée explicitement à Q_INF_01 + Q_INF_02. Il est déclaré, sans source, et n'établit ni une égale importance clinique ni une validation de la moyenne (`20261108-2327-c`).
- D-333 §3 est amendé pour ce seul objet : l'exigence « avec source » est levée, et la tolérance prend fin.
- Libellé validé mot pour mot (`20261108-2328-c`) : « Poids égal : motif déclaré, sans source (D-463) ». Les noms des sources restent affichés.

## Fichiers modifiés

- `docs/decisions/D-463.md` (neuf).
- `changelog.d/2026-11-08-d463-poids-egal-stabilite.md` (neuf).
- Ce handoff.
- Hors dépôt : les questions `20261108-2327-c` et `20261108-2328-c` (page « Suivi de la file D »).

## Validations exécutées

- T1 complet (`npm --prefix web run check`, après `npm ci` et `prisma:generate`), qui comprend `decisions-check` : voir la PR.
- CI et revue : voir la PR.

## Problèmes ouverts

- Le lot de code (D-463 §4), file A, part après le merge de cette PR :
  - remplacer `MENTION_POIDS_NON_MOTIVE` par le libellé validé, dans `mentionStabiliteMetabolique.ts` et `FichePatientPanel.tsx` ;
  - mettre à jour les bancs (`mentionStabiliteMetabolique.test.ts`, `natureIndiceGlobal.guard.test.ts`, `FichePatientPanel.test.tsx`) et les commentaires « jusqu'à la levée de la porte 4 » ;
  - poser un fragment F59 de clôture de la dette (rang compté sur `origin/main` après la #1933) ;
  - jouer T2, avec la revue P1 de `docs/claude/POLITIQUE_REVUE.md`.

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>` (seul le code 0 compte). Revue : CodeRabbit demandée à la main, sinon `wn-reviewer`. Un verdict par remarque, puis « prête @<sha> ».
2. Après le merge : le lot de code ci-dessus, sur une branche neuve depuis `origin/main`.

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ; le calcul de la stabilité métabolique ne change pas ; ni migration ni `schema.prisma`.
- Le libellé ne se modifie pas : il est validé mot pour mot. Aucun autre objet ne reçoit ce motif.
- Pas de merge par cette session (D-454). Pas de pull, de merge ni de rebase sans arbitrage.
- Ne pas reposer les arbitrages `20261108-2302-c`, `-2327-c` et `-2328-c`.
