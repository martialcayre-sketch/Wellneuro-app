# Handoff — 2026-11-10 — le contrat du catalogue ne compte plus les signatures du praticien

## Branche et état Git

`b-contrat-catalogue-gestes-signes`, session concurrente dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, partie de `origin/main` après le merge de #1963 (`fd65fb24`). PR ordinaire, sans migration : elle se déclare « prête @<sha> » et l'intégrateur la merge.

## Objectif

Le constat de `D-473` a trouvé `cb_catalogue_niveau_1_donnees.sql` rouge en production, hors du périmètre de #1963. Arbitrage du responsable du 2026-11-10 : corriger le contrat dans un lot à part, avant le second lot de `D-473` (résolveur).

## Décisions prises

- Constat de `D-473` vert : migration appliquée, 117 analytes, fiche conforme, rien de rattaché, acte `7302` actif. Il est consigné sur #1963 et dans le journal H15.
- Cause du rouge : le bloc `D-376` comptait 35 lignes, deux compositions signées par le praticien sur les deux rapports et 33 items de composition qui citent les acides gras (F80, 2026-10-26 et 27). Ce rouge est antérieur à #1963 ; la CI, sur base neuve, ne pouvait pas le voir.
- Correctif : les blocs `D-473`, `D-376`, `D-361` et `D-323` ne comptent plus les correspondances NABM signées ni les compositions et leurs items, gestes du praticien. Ils comptent encore plages, liens et items de panel, que seule une migration écrit. Les blocs `D-361` et `D-323`, placés après `D-376`, n'avaient jamais été évalués en production.
- Pas de `D-xxx` : un contrat, aucune donnée, aucun schéma, aucune logique clinique.

## Fichiers modifiés

- `web/prisma/checks/cb_catalogue_niveau_1_donnees.sql`.
- `changelog.d/2026-11-10-contrat-catalogue-gestes-signes.md`.
- `docs/claude/plan-journal/H15/2026-11-10-02-constat-d473-contrat-catalogue.md`.
- Ce handoff.

## Validations exécutées

- Production, conteneurs détachés, lecture seule : constat de `D-473` (one-off-7411) ; détail des 35 lignes (one-off-2888, one-off-2692) ; contrat corrigé rejoué en transaction `READ ONLY` (one-off-7521) : vert.
- Base locale : `cb_catalogue_niveau_1_donnees`, `cb_biologie_catalogue_v1` et son négatif, `biology_liens_axe_v1` verts. Mutation en transaction annulée : un item de panel ajouté sur un acide gras rougit toujours le bloc `D-376`.

## Problèmes ouverts

- Un contrat qui ne tourne qu'en CI sur base neuve ne voit pas l'état de production : le constat par conteneur reste le seul juge des gestes du praticien.
- Restes du besoin 2 inchangés (voir le journal H15).

## Prochaine action exacte

1. CI et revue sur la tête (CodeRabbit, sinon Copilot, sinon PR-Agent prouvé, sinon `wn-reviewer`), verdict de chaque remarque.
2. Déclarer la PR « prête @<sha> » pour l'intégrateur.
3. Puis le second lot de `D-473` §6 : libellés du résolveur, soumis au responsable.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d` ; écriture par la seule release-db approuvée.
- Aucun texte clinique, libellé de claim ou valeur dans le dépôt public (`D-251` §4).
- Pas de pull, merge ni rebase sans arbitrage du responsable.
- Signature d'un contenu clinique et du candidat NABM : gestes du responsable.
