# Handoff — 2026-10-28 — H89, PR (b) : `wn-merge` porte les sondes et le contrôle (D-373 §2, §4 et §7)

## Branche et état du dépôt

- Branche `outillage/h89-pr-b-wn-merge`, worktree
  `.claude/worktrees/h89-integrateur-b` (session concurrente, cycle en `git`
  et `gh` directs). Partie de `origin/main` e86538b3 (#1755).
- Ni migration, ni chemin clinique, ni authentification, ni
  `.coderabbit.yaml` : PR ordinaire, libération dès le merge.

## Objectif

Livrer la PR (b) de la fiche H89 : `wn-merge` appelle, avant chaque merge,
les sondes (release-db, déploiement, CI de la PR) et le contrôle sur l'arbre
fusionné livré par la PR (a), #1753. Les PR (c), (d) et l'essai relèvent des
sessions suivantes.

## Décisions prises

Aucune décision nouvelle. Lectures de mise en œuvre :
- **Inventaire.** `wn-merge` portait déjà `wn-attendre-ci` (CI de la PR),
  la sonde release-db et `--match-head-commit` : rien n'est refait. La sonde
  release-db passe de 7 bis à 7 ter et reste juste avant le merge.
- **Sonde du déploiement.** Elle passe par `scripts/wn-deploiement-observation.mjs`,
  en lecture seule. Aucun script nouveau ; le déployeur écrit, il n'est pas
  une sonde. `1` recul et `2` illisible : arrêt et question.
- **Retenue de migration.** Une migration de `main` pas encore en service
  arrête le merge, sauf si un run release-db attend l'approbation sur un
  commit qui la contient : c'est la phase 1, et les PR non gelées mergent
  (D-374, « Effet sur le plan »). Hors phase 1, arrêt et question avec
  l'état lu, jamais un gel muet. Les chemins cliniques ne retiennent rien
  ici : leur phase 2 est gelée par la sonde release-db.
- **Code 2 du contrôle** : arrêt et question au responsable. C'est la
  lecture par défaut annoncée dans le texte de lancement, faute d'arbitrage.
  `1` renvoie la PR à sa file (D-373 §3).
- **Tête et base.** Le `tete=` du contrôle (8 caractères) est le préfixe du
  sha passé à `--match-head-commit`. `main` est revérifié par `git ls-remote`
  juste avant la sonde release-db ; s'il a bougé, toute l'étape 7 bis se
  rejoue, puis 7 ter. La course entre cette lecture et `gh pr merge` est
  assumée et écrite.
- **Registre.** Le diff de `docs/DECISIONS.md` depuis la base de la PR se lit
  en entier : titres nouveaux et textes amendés.

## Fichiers modifiés

- `.claude/skills/wn-merge/SKILL.md` : étape 7 bis neuve, release-db en
  7 ter, conditions de l'étape 9, sortie.
- `scripts/wn-controle-fusion.test.mjs` : deux bancs du câblage.
- `scripts/wn-deploiement-observation.test.mjs` : un banc (ligne
  « En service », codes, retenue).
- Clôture : `changelog.d/2026-10-28-h89-b-wn-merge-sondes-controle.md`,
  `docs/claude/plan-journal/H89/2026-10-28-02-pr-b.md`, ce handoff.

## Validations exécutées

- Bancs `node --test` des cinq fichiers touchés ou voisins (observation,
  contrôle, chevauchement, sonde release-db, `skill-cross-invocation`) :
  143 sur 143 avant la revue. Après correctifs : observation et contrôle,
  62 sur 62.
- Mutations du skill : dix-sept jouées, dix-sept tuées. Une neuvième, d'abord
  survivante (« illisible permis »), a resserré son motif. Cinq autres ont
  été ajoutées depuis les survivants signalés par la revue.
- Sonde réelle `wn-deploiement-observation.mjs` : code `0`, état « retard ».
- T1 `npm run check:rapide` : vert, 17 étapes. T1 complet `npm run check`
  joué avant les correctifs de la revue, puis rejoué avant le commit.
- Revue `wn-reviewer` : GO sous réserve.
  - Corrigés : C1, retenue sans sortie (gel muet sur un run rejeté) ;
    C2, rejeux incomplets quand `main` bouge ; C3, 7 bis dépendant de 7 ter
    sans le dire.
  - Mineurs corrigés : M4, diff du registre lu en entier ; M6, retenue
    bornée aux migrations, écrite.
  - Acceptés sans changement : M5, liaison sur 8 caractères ; M7,
    `REGLES_PR_MERGE.md` ne nomme pas encore les nouveaux gestes, à reprendre
    en PR (c).
- Contrôle et signal réels sur #1756 : non requis en 1,5 s (`tete=` égale
  à la tête de la PR), aucun chevauchement.
- CodeRabbit (473ecc17) : deux remarques, toutes deux corrigées.
  - L'exception de phase 1 ne vaut que tant que son run attend : si la
    sonde de 7 ter ne le montre plus en attente, 7 bis se rejoue.
  - La tête lue par la sonde du déploiement est comparée au `main=` du
    contrôle, comme `ls-remote`.

## Problèmes ouverts

- **`main` rouge sur e86538b3 (#1755).** `typage-tests` échoue sur une erreur
  non gérée de jsdom, sans aucun test en échec. Elle vient d'une minuterie
  de `@radix-ui/react-focus-scope`, levée après la fin d'un test. La tête
  n'est donc pas livrée : en service, d0626e05. Instabilité sans lien avec ce
  lot. Un rejeu du CI de `main` relève du responsable ou de la session
  concernée.
- **Question de la revue, non tranchée** : le run release-db déploie-t-il
  le commit approuvé quand le CI de `main` est rouge ? Si non, la retenue de
  migration arrête souvent le merge sur un `main` rouge. Le skill pose alors
  la question, sans geler en silence.
- Pour la PR (c) : `REGLES_PR_MERGE.md` (« Cycle PR complet »),
  `pr-revue-et-release-db.md` §1.10 et §2, `CLAUDE.md` et
  `ROLES_MACHINES.md` doivent nommer les gestes de l'étape 7 bis.

## Prochaine action exacte

1. Ouvrir la PR (`--body-file`).
2. CI en fond : `node scripts/wn-attendre-ci.mjs <N>`.
3. CodeRabbit sur la tête, un verdict par remarque.
4. `node scripts/wn-sonde-release-db.mjs <N>` à 0.
5. Merge : `gh pr merge <N> --squash --delete-branch --match-head-commit <sha>`,
   hors du dépôt, puis `git checkout --detach origin/main` dans le worktree.

Puis H89 PR (c) dans une session neuve.

## Interdits encore actifs

- Aucun merge sans la sonde release-db à 0.
- Jamais d'auto-merge.
- Approbation et déclenchement de release-db : gestes humains.
- Aucune migration sans demande.
- Production en lecture seule, par conteneur.
- Dépôt public : aucun lien d'artefact, aucun identifiant interne de page,
  aucune identité réelle.
- Jamais de rebase ni de `git stash` nu dans ce worktree. Une fusion de
  `origin/main` est permise si `main` avance.
