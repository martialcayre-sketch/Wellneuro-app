# Handoff — H23 amendée : la clôture par le handoff seul (D-372)

## Branche et état du dépôt

- Branche `lot/h23-cloture-handoff-seul`, worktree `h23-cloture`, partie
  d'`origin/main` 78edfba9. Aucune migration, aucun schéma, aucun chemin
  clinique.

## Objectif

Appliquer D-372 en un seul lot : le contrôle de clôture n'exige plus que le
fragment de handoff créé par la PR ; l'entrée `SESSION_LOG.md` redevient un
résumé sur demande ; les lecteurs du journal lisent le dernier handoff de la
branche. Préalable de H89 (intégrateur).

## Décisions prises

- Aucune décision nouvelle : D-372 fait foi.
- `verdictCloture({ crees })` : seul paramètre, les fichiers créés (A, ou R
  sous leur nouveau nom). `fichiersPresents` et `lignesAjoutees`, qui ne
  servaient qu'à l'entrée du journal, sont retirés.
- `wn-cycle.mjs` : `cloture` réduite à `{ handoff }`, jugée sur les seuls
  fichiers CRÉÉS (`fichiersCrees` : diff `--diff-filter=AR` et porcelain `??`,
  `A`, `R`), même régime que le CI ; la ligne « SESSION_LOG.md » disparaît du
  rendu. Une PR mergée n'embarque la clôture que par un fichier `ADDED` ou
  `RENAMED` (`fichiersCreesDeLaPr`), et l'étape 7 de `/wn-merge` lit le même
  `changeType` (revue CodeRabbit).
- `wn-context-pack.mjs` : `sessionTail` remplacé par `handoff` (chemin,
  origine, « Prochaine action exacte » bornée à 32 lignes), lu depuis la racine
  du dépôt. Le lot repris « désigné par la tâche » (D-372 §2) se lit à la main :
  un script ne peut pas le deviner.
- Skills `wn`, `wn-docs`, `wn-hygiene` : leur bloc `!` qui lisait la queue du
  journal charge le context-pack, avec la commande déjà autorisée dans
  `.claude/settings.json` ; aucune règle de permission nouvelle.
- Écarté : un mode `--handoff` du context-pack (il aurait demandé une règle de
  permission nouvelle) ; toute retouche de `wn-compact-sessionlog` (gelé).

## Fichiers modifiés

- Scripts et bancs : `scripts/wn-controle-cloture.mjs` et `.test.mjs`,
  `scripts/wn-cycle.mjs` et `.test.mjs`, `scripts/wn-context-pack.mjs`,
  `tests/wellneuro/evals/context-pack-density.test.mjs`.
- CI et revue : `.github/workflows/ci.yml` (étape renommée « Contrôle de
  clôture (fragment de handoff) »), `.coderabbit.yaml` (contrôle « Clôture de
  la PR »).
- Consignes : `CLAUDE.md` § Début de session ; `.claude/rules/docs-changelog.md`,
  `.claude/rules/pr-revue-et-release-db.md` §1.9 ; skills `wn`, `wn-finish`,
  `wn-lot`, `wn-pr`, `wn-merge`, `wn-handoff`, `wn-docs`, `wn-hygiene` ; agent
  `wn-fable` ; prompt `.github/prompts/wn-finish.prompt.md` ;
  `docs/claude/handoffs/README.md`.
- Clôture : `docs/claude/PLAN_WELLNEURO.md` (H23, mise à jour datée),
  `changelog.d/2026-10-27-h23-cloture-handoff-seul.md`, ce handoff. L'entrée
  `SESSION_LOG.md` demandée par la consigne a été posée puis retirée : sur
  GitHub (sans le pilote `merge=union`), elle entrait en conflit avec celle de
  #1727, et la consigne interdit toute fusion de `main`. Sur un
  `pull_request`, le CI joue le script de la PR, qui ne l'exige plus.

## Validations exécutées

- `node --test scripts/wn-controle-cloture.test.mjs` : 8/8, dont le script
  réel qui refuse une PR de code portant une entrée du journal et un handoff
  passé retouché (sortie 1), et accepte un handoff au nom accentué sans entrée
  du journal. Mutation jouée : un script qui lit tous les fichiers présents au
  lieu des créés rougit ce cas.
- `node --test scripts/wn-cycle.test.mjs` : 47/47 (handoff passé retouché :
  pas de clôture, sur la branche comme dans une PR mergée ;
  `creesDuPorcelain`, `fichiersCreesDeLaPr`). T1 complet `npm run check` vert.
- `context-pack-density.test.mjs` branché dans `bancs-outillage-check` (il ne
  tournait nulle part) : `npm run bancs-outillage-check` 536/536.
- Bancs du context-pack (`context-pack-corpus`, `source-of-truth`,
  `source-of-truth-campaign`) et `skill-bang-cwd` : verts.
- `wn-context-pack.mjs` lancé depuis `web/` : le dernier handoff est trouvé.
- T1 `npm run check:rapide` : vert (17 étapes) ; T1 complet avant commit.
- Revue `wn-reviewer` (P1, `.coderabbit.yaml`) : aucun affaiblissement de la
  revue, aucun défaut bloquant ; trois points corrigés dans le lot (régime de
  `wn-cycle`, test du script réel, banc non branché), mineurs corrigés ou
  consignés ci-dessous.

## Problèmes ouverts

- Le handoff du lot repris, quand la tâche le désigne, n'est pas lu par le
  context-pack : la session le lit à la main.
- `docs/claude/CLAUDE_MD_MINIMAL_WELLNEURO.md:17` (gabarit ancien, Next 14 et
  Supabase) dit encore de lire le journal au début d'un lot : hors domaine de
  D-372, non touché.
- `wn-context-pack.mjs` prend `origin/main` comme base, là où `wn-cycle` lit la
  branche par défaut : identiques dans ce dépôt.
- La condition `if:` de l'étape « Contrôle de clôture » n'est figée par aucun
  banc (défaut antérieur, inchangée ici).

## Prochaine action exacte

CI, CodeRabbit sur la tête, un verdict par remarque, merge (aucun run
`release-db` en cours) ; la PR touche `.coderabbit.yaml` : suivre jusqu'au
constat du déploiement (D-373 §1). Puis H88, dernier préalable de H89.

## Interdits encore actifs

- Compaction du journal gelée (`/wn-compact-sessionlog`, D-372 §2).
- `SESSION_LOG.md` reste append-only ; aucune entrée passée réécrite.
- Gel intégral D-374 §5 : aucun merge tant qu'un run `release-db` n'est pas
  conclu.
- Dépôt public : aucun lien d'artefact, aucune identité réelle.
