# Handoff — 2026-11-16 — Autonomie des sessions, pièges restants (4) : crochet zsh conscient des citations, worktree neuf arrêté avant Vitest

## Branche et état Git

- Branche `chore/autonomie-pieges-partie4`, créée depuis `origin/main` (`7edaeda6`, après #2194), dans le
  worktree `.claude/worktrees/orch-ci` (session Orchestration, file D). Commit tardif, juste avant le push
  (D-518).
- Lot `autonomie-pieges-restes` (ordre 35), toujours `pris` par Orchestration. La partie 3, #2192, est
  mergée en `021deae8`.
  - Le `merge_fait` de l'intégrateur (`20261116-2251-integrateur-d-2192`) est lu et passé à `traite`.
  - Le carnet porte la branche de la partie 4.
  - La ligne `20261116-2241-a` (File A, D/33) reste `lu` : elle est hors lot et attend la question
    `20261116-2244-d`.

## Objectif

Partie 4 du lot :
1. d'abord, les quatre points routés de #2192 (champ `motif` du carnet) ;
2. ensuite, les pièges suivants du titre, avec un contrôle par piège.

## Décisions prises

- Aucune D-xxx. Le lot n'ajoute que des contrôles. Il ne touche ni au clinique, ni aux migrations, ni au
  schéma, ni à un écran.
- **Crochet zsh.** `lireHeredocs` et `sansLitterauxInertes` sont remplacés par `lireCommande`. Ce lecteur
  fait un seul passage, avec une pile de contextes : code, `$(…)`, accent grave, guillemets doubles,
  apostrophes, `$'…'`, arithmétique.
  - Un `<<` n'ouvre un heredoc qu'en contexte de code, `$(…)` compris.
  - Une apostrophe n'est inerte qu'en contexte de code.
  - Un commentaire est lu tel quel : rien n'y est masqué, ce qui est le choix prudent.
  - Dans un corps nu, un `\` en fin de ligne joint la ligne suivante. Constaté par `zsh -f` :
    - `$NEW\` puis `:refs` donne `abc123efs` ;
    - `foo\` puis `F` donne `fooF`, qui ne clôt pas le heredoc.
- **Flux SDK de `tools/corpus/`.** Ils sont routés à la boîte B (F05), par la ligne `20261116-2341-d`.
  Aucun code n'est modifié : `rediger.mjs` est en cours chez F05, et `certify.mjs` est laissé à la même
  décision.
- **Worktree neuf.** Le contrôle est posé dans `web/vitest.config.ts`. Il couvre le vert trompeur de
  Vitest, qui est le piège silencieux. Vérifié : chaque job CI qui lance Vitest exécute
  `prisma generate` avant.

## Fichiers modifiés

- `.claude/hooks/block-risky-commands.mjs` et `.claude/hooks/block-risky-commands.test.mjs` (+13 cas).
- `.claude/rules/hooks-garde-fous.md` (une phrase).
- `web/vitest.config.ts`.
- `web/src/lib/worktreePret.ts` et `web/src/lib/worktreePret.guard.test.ts` (neufs).
- `changelog.d/2026-11-16-autonomie-pieges-restes-p5.md` et ce handoff.

## Validations exécutées

- `block-risky-commands.test` : vert.
- Suite des crochets (`node --test .claude/hooks/*.test.mjs`) : 639/639.
- Témoin sur le crochet de `origin/main`, avec les 13 nouveaux cas :
  - 6 faux négatifs de `main` sont désormais refusés ;
  - 3 faux refus de `main` passent ;
  - les 4 autres cas ont le même verdict sur les deux crochets.
- `worktreePret.guard` : 4/4.
- Témoin sur la configuration Vitest : client Prisma renommé un instant, Vitest sort en code 1 avec le
  remède, puis le client est restauré.
- `wn-reviewer` (P0, diff local avant push) : NO-GO, levé à la correction du P2. Aucun P0.
  - Ce qui est vérifié et tient :
    - chaque job CI lance `prisma generate` avant Vitest ;
    - `wn-controle-fusion` et `specs-drapeau-ali01` ne sont pas touchés ;
    - les autres motifs du crochet ne dépendent pas du lecteur.
  - **P2.** Le `#` était reconnu d'après le caractère brut qui le précède. Après un `\x` échappé, ou après
    le `)` qui ferme `$(…)` ou `$((…))`, il ouvrait donc un faux commentaire. Quatre faux négatifs face à
    `main`, constatés par `zsh -f`. Corrigé par un indicateur de début de mot, tenu au fil des
    caractères. Les quatre cas sont au banc, plus `(echo a)# l'a`, qui est un gain face à `main`.
  - Fuzz différentiel du relecteur, rejoué sur le correctif : 60 000 commandes départagées par zsh. Il
    reste un faux négatif face à `main`, un délimiteur coupé par une continuation (`<<-E\` + saut de ligne
    + `$#`). Il est artificiel et assumé en P3.
  - Après correction : crochets 644/644 ; T1 complet `code=0` (après l'avance `--ff-only` sur
    `1e97979a`, puis sur `3332d627`, qui ne touche que de la documentation).
- Contre-revue Codex P0 sur le diff poussé `53336617` : avis conforme (code 0), aucun P0 ni P1. Trois
  P2, chacun constaté par `zsh -f`, corrigés dans le commit suivant et ajoutés au banc :
  - les parenthèses écrites dans une chaîne, à l'intérieur d'une arithmétique, étaient comptées :
    `$(( $(printf '))') ))` fermait trop tôt. Citations et substitutions s'y lisent désormais comme
    ailleurs ;
  - le début de mot était remis à zéro à chaque ligne physique. Avec `echo x\` puis `#"`, le `#` fait
    partie du mot `x#`. Une ligne continuée garde désormais le début de mot de la précédente ;
  - un délimiteur était recopié dans la structure. Or `<<'$NEW:r'` est inerte : un délimiteur n'est
    jamais développé, il est désormais blanchi.
  - Après correction : crochets 648/648 ; fuzz différentiel de 60 000 commandes, 0 faux négatif face à
    `main` ; T1 complet `code=0`.

## Problèmes ouverts

- Routé à la boîte B : `tools/corpus/certify/certify.mjs:117` et `tools/corpus/fiches-usage/rediger.mjs:92`.
- P3 assumés dans le crochet :
  - un `)` de `case … in a)` dans un `$(…)` referme le contexte trop tôt (identique sur `main`) ;
  - `${x:-"l'a"}` n'est pas suivi (identique sur `main`) ;
  - sous accents graves, le lecteur honore `'`, `$'` et `"`, alors que zsh n'y honore que `\`. zsh
    échoue en pratique sur ces formes, mais deux cas artificiels développent ;
  - un délimiteur de heredoc coupé par une continuation `\` ;
  - un commentaire n'est pas masqué : un `$VAR:x` cité en commentaire reste refusé.
- Restent au lot, pour les parties suivantes :
  - les quatre pièges E2E ;
  - un lot d'ingestion de plus de 10 claims ;
  - les listes jumelles ;
  - release-db sur 504 ;
  - un one-off Scalingo recyclé ;
  - la réservation WN-SRC ;
  - les focus areas de PR-Agent ;
  - le SESSION_LOG réordonné ;
  - les sessions concurrentes sur la copie principale ;
  - les crochets de la copie principale en retard ;
  - `echo code=$?` en fond ;
  - `wn-attendre-ci` (tête périmée, e2e lent) ;
  - le statut « transféré » (décision requise) ;
  - la règle de lint « objet d'erreur brut ».

## Prochaine action exacte

1. Commit, push, puis contre-revue Codex P0 sur le diff poussé, avis déposé sur la PR.
2. PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, puis PR-Agent sur la tête.
3. Relire la boîte D, puis déclarer « prête @<sha> » en commentaire sur la PR **et** au registre.
4. Partie 5 du lot : les pièges suivants.

## Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs` : il est chez F05.
- Un refus de crochet ne s'élargit pas à de la prose : apostrophes et heredocs cités restent libres.
- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Horodater en lisant l'heure système, jamais à l'estime.
