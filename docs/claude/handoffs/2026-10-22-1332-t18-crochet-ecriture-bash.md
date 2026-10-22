# Handoff — t18 : le crochet d'écriture juge les écritures Bash

## Branche et état Git

`lot/t18-crochet-bash-ecritures` (worktree `d281-lot3-portail`, session
concurrente, cycle en git/gh direct), issue d'`origin/main` 8025dd28 (#1640) ;
outillage seul, sans migration, drapeau ni D-xxx.

## Objectif

Fermer la dette t18 (préalable D/41 levé par #1635) : une commande Bash qui
écrit un fichier de la liste refus/demande — ou une table signée par son
marqueur — reçoit le même verdict que par Edit/Write ; banc qui le prouve ;
doc alignée.

## Décisions prises

Arbitrages du responsable du 2026-10-22 : même verdict qu'Edit/Write (refus
compris, infrastructure comprise) ; périmètre « demande sur mention » — un
interpréteur qui cite un chemin protégé demande ; script opaque, chemin par
variable, `xargs`, `find -exec`, `git apply`, opérations Git sur l'arbre
entier et suppressions restent en silence documenté. `rm` hors périmètre
(`rm -rf web/.next` doit rester libre).

## Fichiers modifiés

`.claude/hooks/cibles-ecriture-bash.mjs` (neuf, module pur : lexer shell,
formes reconnues, mentions) ; `.claude/hooks/protect-wellneuro-files.mjs`
(classement en `juger()`, branche Bash, messages Edit/Write inchangés) ;
`.claude/settings.json` (lanceur sur le matcher Bash) ;
`.claude/hooks/protect-wellneuro-files-bash.test.mjs` (neuf) ; `CLAUDE.md`
(« Garde-fous d'écriture ») ; `.claude/rules/hooks-garde-fous.md` ; fragment
`changelog.d/2026-10-22-t18-crochet-ecriture-bash.md`.

## Validations exécutées

Banc des crochets `node --test .claude/hooks/*.test.mjs` : 386 verts (dont
113 du nouveau banc). T1 complet vert. T2 `--fast` vert (14 394 unitaires,
282 E2E). CodeRabbit (#1643), quatre constats corrigés en deux passes :
`$(…)` et backticks entre guillemets doubles analysés, expansion d'accolades
bornée sur la file d'attente ; fermeture de `$(…)` qui saute les guillemets,
mots réservés (`then`, `do`, `{`, `!`…) retirés en tête de commande.
`/code-review medium` : dix constats — sept corrigés (arithmétique `$((<<))`
lue comme heredoc, accolades et glob intermédiaire, `timeout -s/-k`,
`perl -MFile` pris pour `-i`, `cd` de sous-shell, contenu entrant réduit à la
commande de liste, options à argument de `rsync`/`cp`) plus awk resserré ;
deux écartés avec motif (refus sur l'infrastructure, faux positifs de
mention : arbitrages) ; un documenté (Git sur l'arbre entier).

## Problèmes ouverts

Aucun pour le lot. Une écriture par script opaque reste invisible : c'est la
limite dite, pas un oubli.

## Prochaine action exacte

PR, `node scripts/wn-attendre-ci.mjs <N>` en fond, revue CodeRabbit sur la
tête (verdict par commentaire), aucun release-db d'une autre session en
attente, merge `--match-head-commit`, détacher le worktree, déploiement
constaté, ligne t18 du suivi file A → « fait ».

## Interdits encore actifs

Rien de clinique sans D-xxx ; aucune migration ni `schema.prisma` sans
accord ; un merge à la fois, aucun auto-merge ; ne jamais redéployer une
image antérieure à 257807e3 ; les PR et release-db des autres sessions ne
sont pas à cette session ; t39/t40 ne s'ouvrent pas ici ; M-2, t36, m38
restent des gestes du responsable.
