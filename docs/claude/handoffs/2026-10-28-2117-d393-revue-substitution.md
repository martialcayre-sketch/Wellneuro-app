# Handoff — 2026-10-28 — D-393 : revue de substitution, PR-Agent remplace CodeRabbit sur la tête

## Branche et état du dépôt

- Branche `gouvernance/d393-revue-substitution`, worktree
  `.claude/worktrees/h89-integrateur-c` (session concurrente, cycle en `git`
  et `gh` directs). Partie de `origin/main` 7e78c0ea (#1760).
- Texte seul : ni code applicatif, ni migration, ni chemin clinique, ni
  authentification. PR ordinaire, mais elle précède #1766, qui est gardée
  par sa file (D-393 §6).
- La même session a repris #1766 (branche `outillage-pr-agent`, tête
  e9bd57fa), sur demande du responsable. Elle l'a fait depuis une branche
  locale `reprise-pr-agent`.

## Objectif

Inscrire PR-Agent dans la condition de merge (amende D-290 §1 et §3) avant
l'essai de H89. Fiche H93.

## Décisions prises

D-393, numéro réservé par `wn-reserver-decision.mjs`. Arbitrages du
responsable du 2026-10-28 :
- Q1 : CodeRabbit sur la tête ; s'il saute la PR ou bute sur son quota,
  PR-Agent sur la tête le remplace. Une seule revue de bot est exigée.
- Q2 : Copilot écarté.
- Q3 : une PR de clôture seule reçoit CodeRabbit demandé à la main.
- Q4 : pendant l'essai, l'attente du bot se compte à part.
- Q5, après le constat : revue complète à chaque push, plus `-i`.

La preuve (D-393 §2) vient du constat sur #1766 et de la revue
`wn-reviewer` sur les sources de v0.49.0 :
- un run `pull_request` conclu `success` sur la tête ;
- un journal qui dit « returning full diff » ;
- un bloc d'état unique, avec `head_sha` = tête et `excluded_files` vide,
  ou aucun bloc pour une revue sans remarque.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-393, et quatre lignes datées sous D-290 §1 et
  §3, D-373 §3 et D-291 §4.
- `CLAUDE.md` (une puce), `docs/claude/REGLES_PR_MERGE.md`,
  `.claude/rules/pr-revue-et-release-db.md` (§1.6, §1.10, tableau du §2),
  `docs/claude/POLITIQUE_REVUE.md`, `.claude/skills/wn-merge/SKILL.md`
  (étape 6), `docs/claude/PLAN_WELLNEURO.md` (fiche H93 et sa ligne au
  tableau).
- `docs/claude/plan-journal/H89/2026-10-28-04-d393-attente-bot.md` (D-393
  §5 dans la fiche H89).
- Clôture : `changelog.d/2026-10-28-d393-revue-substitution.md`, ce
  handoff.

## Validations exécutées

- Constats sur #1766 :
  - Premier run : clé non rattachée à un workspace. Le responsable l'a
    changée.
  - Run relancé : revue Sonnet publiée, mais description en échec
    (`temperature` refusée par Haiku 5.5).
  - Push e3df16c0 : `-i` ne nomme pas la tête et relit `main` après la
    fusion.
  - Push e9bd57fa : run 40761020742 `success`, « returning full diff »,
    bloc unique avec `head_sha` = e9bd57fa et `excluded_files` vide.
- `/security-review` sur #1766 : aucun constat. `wn-reviewer` sur #1766 :
  GO sous réserve. Les réserves sont corrigées dans e9bd57fa ou portées par
  D-393 §2 et §3.
- `wn-reviewer` sur la décision et les textes : GO sous réserve.
  - À corriger, corrigé : le cas « aucun bloc » n'était pas borné (une
    revue « non autoritative » publiée à part laissait un commentaire
    persistant périmé). D'où les conditions (c) et (d) : écriture pendant
    le run, aucune autre revue de PR-Agent, aucun run sur commentaire
    après lui. Les textes disaient autre chose que le §2(c) ; ils sont
    alignés.
  - Mineurs, corrigés : une PR faite seulement de fichiers exclus du
    modèle reçoit CodeRabbit à la main ; lignes datées sous D-373 §3 et
    D-291 §4 ; fragment au journal de H89.
- Bancs : `wn-controle-fusion`, `wn-sonde-release-db`,
  `wn-deploiement-observation`, `plan-journal` : 113 sur 113. T1 complet
  `npm run check` : vert.
- La commande `gh run list --workflow pr_agent.yml --event pull_request
  --commit <tête>` de la règle 1.6 a été vérifiée sur e9bd57fa.

## Problèmes ouverts

- H89 (d) n'est pas ouverte. Elle touchera aussi `REGLES_PR_MERGE.md` :
  qui merge le second fusionne `main`.
- D-392 est réservée par #1763, encore ouverte : le registre a un trou
  réservé, que le garde tolère.
- À constater sur de vraies PR (fiche H93) :
  - une revue sans remarque, sans bloc d'état ;
  - une PR au-delà du plafond ;
  - un `/review` en commentaire, après le merge de #1766 ;
  - le coût réel d'une revue.
- Non construit : un lecteur scripté des trois conditions, avec banc.

## Prochaine action exacte

1. Revue `wn-reviewer` de cette PR, puis CI par `wn-attendre-ci` en fond.
   Revue de bot sur la tête : jusqu'au merge de D-393, D-290 s'applique,
   donc `@coderabbitai full review`, au quota d'une revue par heure.
2. Merger cette PR : étape 7 bis de `wn-merge`, sonde release-db à 0, puis
   `--squash --delete-branch --match-head-commit`.
3. Puis #1766, par sa file : fusion de `main`, revue de bot sur la tête
   (D-393), 7 bis, sonde, merge.

## Interdits encore actifs

- Aucun merge sans revue de bot sur la tête ni sonde release-db à 0 ;
  jamais d'auto-merge.
- #1766 se merge après cette PR, par sa file, jamais par l'intégrateur.
- Limite de dépense mensuelle de la console Anthropic : geste du
  responsable.
- Dépôt public : aucun lien d'artefact, aucun identifiant interne de page,
  aucune identité réelle.
- Jamais de rebase ni de `git stash` nu dans ce worktree.
