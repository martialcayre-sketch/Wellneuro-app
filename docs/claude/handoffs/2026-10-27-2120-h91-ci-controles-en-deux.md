# Handoff — H91, temps 1 : le job `controles` coupé en deux

## Branche et état Git

`lot/h91-ci-controles-en-deux`, depuis `origin/main` 07027127, sans retard.
Copie principale. H88 (#1742) est portée par une autre session, dans son
worktree.

## Objectif

Fiche H91, temps 1 : couper `controles` en deux jobs, mesurer le chemin
critique avant et après, publier les mesures dans la fiche. Aucune décision
neuve.

## Décisions prises

- `controles` garde, dans leur ordre, les bancs node avant `setup-node`, la
  certification, la base, les contrats SQL et le seed. Il reste le premier
  job : c'est lui que lit le banc de parité.
- Nouveau job `typage-tests` : checkout, `*perimetre`, setup-node, npm ci,
  prisma generate, puis type-check, artefact, Vitest court14, Vitest siin57 et
  lint, dans l'ordre d'avant. Il prend `env: *env` mais aucun service
  PostgreSQL : seuls les trois `*.pg.test.ts` ouvrent une base, sur variable
  explicite, et ils sont joués dans `controles`.
- `verify` : `needs: [controles, typage-tests, e2e]`, chacun testé. Les bancs
  `ci-invariants` et `parite-check-ci` sont inchangés.
- Mesure « avant » publiée dans la fiche H91 : `e2e` tient déjà le chemin
  critique sur 8 runs de `main` sur 10. Le p90 vient de l'étape « Install
  Playwright browsers » (de 910 à 3 181 s), hors du lot.

## Fichiers modifiés

`.github/workflows/ci.yml` ; `docs/claude/PLAN_WELLNEURO.md` (fiche H91
seule) ; `changelog.d/2026-10-27-h91-ci-controles-en-deux.md` ; ce handoff.

## Validations exécutées

- Bancs `ci-invariants` et `parite-check-ci` : 47 sur 47.
- Comparaison YAML entre `main` et la branche : aucune étape perdue ni
  modifiée, ordre conservé, `e2e` identique.
- T1 complet vert (rc 0).
- Revue `wn-reviewer` : GO avec une réserve. P0 et P1 : aucun. P2-2 (un
  commentaire inexact) est corrigé. P2-1 (le trou de parité couvre
  désormais deux jobs) est routé au temps 2 de la fiche H91.

## Problèmes ouverts

- Réserve de la revue : au premier run de la PR, comparer les totaux Vitest
  de `typage-tests` (fichiers, passés, sautés, pour court14 et siin57) à ceux
  du dernier run vert de `main`.
- Mesure « après » sur `main` : elle demande des runs postérieurs au merge.
  Elle sera publiée au temps 2.

## Prochaine action exacte

Commit, push, PR (`--body-file`). Lancer `wn-attendre-ci` en fond. Mesurer
les runs de la PR et publier la mesure « après » dans la fiche H91. Revue
CodeRabbit sur la tête, un verdict par remarque. Vérifier le gel (H88 et
`release-db`), fusionner `main` si une migration ou H88 a mergé, puis merger
avec `--squash --delete-branch --match-head-commit --subject`, et `/clear`.

## Interdits encore actifs

- Pas de checkout dans le worktree de H88.
- Ne pas toucher `release-db.yml`, la sonde, `wn-merge`, ni le §5 des règles
  de revue.
- Gel intégral tant que H88 n'est pas mergée.
- Pas de rebase ni de force-push.
