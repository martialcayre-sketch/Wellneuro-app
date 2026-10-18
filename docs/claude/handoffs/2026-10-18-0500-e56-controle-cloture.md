# Handoff — 2026-10-18 — E56 : contrôle de clôture en CI

## Branche et état Git

- Branche `e56-controle-cloture`, depuis `origin/main` b357fa9e, worktree
  `d281-lot3-portail` (session concurrente, cycle en git/gh direct).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan, fiche H23 (E56) : rendre la clôture d'une PR opposable en CI, l'auto-merge
et le changement de relecteur l'ayant laissée sans garde.

## Décisions prises

- Arbitrage du responsable du 2026-10-18 : SESSION_LOG **et** handoff restent
  exigés, comme avant le 2026-10-14.
- Périmètre : toute PR qui touche du code, au sens de l'étape « Périmètre du
  diff » de `ci.yml` (`docs_only=false`). Une PR de doc, rattrapage compris, est
  dispensée.
- SESSION_LOG : au moins une ligne ajoutée (append-only). Handoff : fragment daté,
  reconnu par `estFragmentDeHandoff` de `wn-cycle.mjs`, sans seconde définition.
- L'étape est placée après `setup-node`, car elle dépend de la base de la PR.
  Son banc est placé avant et câblé dans `check` (parité).
- CodeRabbit : `pre_merge_checks.custom_checks`, mode `warning`. Le garde
  bloquant est le CI.

## Fichiers modifiés

- `scripts/wn-controle-cloture.mjs` et `.test.mjs` (neufs) ;
  `.github/workflows/ci.yml` ; `web/package.json` (`bancs-outillage-check`) ;
  `.coderabbit.yaml`.
- `.claude/rules/docs-changelog.md`, `.claude/rules/pr-revue-et-release-db.md`,
  `.claude/skills/wn-merge/SKILL.md` : une phrase chacun.
- `docs/claude/PLAN_WELLNEURO.md` (H23) ; `docs/claude/SESSION_LOG.md`
  (rattrapage et entrée de session) ;
  `changelog.d/2026-10-18-e56-controle-cloture.md`.

## Validations exécutées

- Banc du contrôle : 7 cas verts. Contre-épreuve en ligne de commande sur le
  diff de #1535 (sans SESSION_LOG) : refus, code 1.
- Bancs d'invariants et de parité de `ci.yml` : verts.
- T1 complet vert.
- Revue `wn-reviewer` (P1, D-291) : go, la revue CodeRabbit n'est pas
  affaiblie. Trois P2 corrigés : un handoff supprimé ne compte plus
  (`--name-status`, banc), une base introuvable donne un message clair, la
  consigne CodeRabbit suit la liste « code » du périmètre du diff. P2 acceptés :
  une retouche d'une ligne du SESSION_LOG compte comme entrée (l'avertissement
  CodeRabbit couvre « à la fin ») ; un revert fait depuis GitHub doit porter
  sa clôture comme toute PR de code.
- Revue CodeRabbit : deux remarques corrigées. `git -c core.quotePath=false`
  pour qu'un handoff au nom accentué soit reconnu (banc sur un vrai dépôt
  temporaire) ; le handoff doit être CRÉÉ par la PR (statut A ou R), un
  fragment seulement retouché ne clôt pas (aligné sur « un fragment est posé,
  jamais réécrit »).

## Problèmes ouverts

- Les PR ouvertes par d'autres sessions (#1530) devront ajouter leur entrée
  SESSION_LOG pour passer, après le merge.

## Prochaine action exacte

PR, CI (le contrôle se juge sur cette PR même), revue CodeRabbit et revue
`wn-reviewer`, merge. Page de la file A : r1_06 passe à fait.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord du responsable.
- Aucune règle clinique ni seuil touchés.
