# Handoff — H90, PR 1 : journal du plan en fragments, outillage sans bascule

## Branche et état Git

`lot/h90-journal-plan-outillage`, depuis `origin/main` 1293b4cd. Copie
principale. H89 est portée par une autre session, dans son worktree.

## Objectif

Fiche H90, PR 1 sur 2 (D-371) : script de bascule, commande de lecture d'une
fiche avec son journal, garde en avertissement, bancs câblés. La bascule
n'est pas jouée. Aucune décision neuve.

## Décisions prises

- Les fragments se nomment `<date>-<nn>-<slug>.md`, où `nn` est le rang parmi
  les mises à jour du même jour dans la fiche. La lecture exige ce rang, et le
  journal se lit dans l'ordre des noms (points de code).
- La ligne de renvoi se pose à la place des mises à jour. Dans une fiche qui
  n'en a pas, elle se pose après la dernière puce de tête.
- Une fiche irrégulière est écartée et laissée intacte, jamais réordonnée.
  Cas d'écart : mises à jour non contiguës, date en recul, mise à jour hors de
  la suite des puces de tête, plus de 99 mises à jour le même jour.
- `--ecrire` exige un journal vierge et des chemins `--plan` et `--journal`
  tous deux dans le dépôt ou tous deux hors de lui. L'aller-retour se juge
  d'abord en mémoire, puis se rejoue depuis le disque.

## Fichiers modifiés

`scripts/lib/plan-journal.mjs`, `scripts/wn-plan-bascule.mjs`,
`scripts/wn-plan-fiche.mjs`, `scripts/wn-plan-journal-garde.mjs` et leurs
trois bancs (`scripts/lib/plan-journal.test.mjs`,
`scripts/wn-plan-fiche.test.mjs`, `scripts/wn-plan-journal-garde.test.mjs`) ;
`.github/workflows/ci.yml` (job `controles`, avant `setup-node`) ;
`web/package.json` (`check`, `plan-journal-check`) ; fiche H90 du plan ;
`changelog.d/2026-10-27-h90-journal-plan-outillage.md` ; ce handoff.

## Validations exécutées

- Bancs : 23, 4 et 7 cas verts. Mutations vérifiées : sans la suite sur ligne
  vide, ou sans le contrôle de date, le banc rougit.
- À blanc sur le plan réel : 251 fragments sur 103 fiches, plan de 542 448 à
  394 342 octets, aller-retour exact. Quatre fiches sont écartées : F44 et
  H26 (date en recul), H49 et F79 (mises à jour non contiguës).
- Parité `check`/CI et `ci-invariants` : 51 sur 51.
- T1 complet vert (rc 0), sur le commit 2314556b.
- Revue `wn-reviewer` : GO avec réserves.
  - P1-1, journal présent pour une fiche sans fragment : corrigé.
  - P2-1 (mise à jour de groupe), P2-2 (rang), P2-3 (reprise documentée) et
    P2-4 (chemins incohérents) : corrigés, avec leurs bancs.
  - P2-5 (puces « Constat », « Clôture », « Correction » sous le renvoi) :
    routé à la PR 2, dans la fiche H90.
  - P2-6 : deux mutations restent non vues, le retrait de `wx` (masqué par le
    refus du journal présent) et le retrait de la relecture depuis le disque.
    Acceptées, défense en profondeur.

## Problèmes ouverts

À trancher pour la PR 2, tout est dans la fiche H90 :

- le créneau de la bascule ;
- le sort des quatre fiches écartées ;
- les puces datées autres que « Mise à jour » dans sept fiches ;
- la règle de rang des fragments écrits ensuite ;
- la règle d'écriture du geste de clôture.

Le banc « plan réel » rougit le CI si une fiche est en double : c'est voulu.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`), puis `wn-attendre-ci` en fond.
2. Revue CodeRabbit sur la tête, un verdict par remarque.
3. Relire la tête de `main` ; fusionner `main` si une migration a mergé.
4. Jouer `wn-sonde-release-db <N>`, puis merger avec `--squash
   --delete-branch --match-head-commit --subject`.
5. `/clear`.

## Interdits encore actifs

- Ne pas jouer `--ecrire` sur le dépôt : c'est la PR 2, dans un créneau à
  demander.
- Ne pas toucher le plan hors de la fiche H90.
- Hors lot : la clôture de la semaine de H86 et le temps 2 de H91, tous deux
  à partir du 2026-11-03.
