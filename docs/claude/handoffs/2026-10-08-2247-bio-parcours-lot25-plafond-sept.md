# Handoff — 2026-10-08 — BIO-PARCOURS LOT-25 : plafond d'actions porté à sept (D-273)

## Branche et état Git

- Worktree `.claude/worktrees/bp25-plafond-sept`, branche `feat/bp25-plafond-sept`,
  un seul commit rebasé sur `origin/main` (810bcadf), poussé en force (la branche
  existait déjà, sans PR). PR du lot ouverte avec ce handoff.
- La décision s'appelait D-271 jusqu'au rebase : `main` avait pris D-271 et D-272
  (agenda du sommeil). Renumérotée **D-273** partout.

## Objectif

BP-25 : `MAX_ACTIONS_PROTOCOLE_21J` de 3 à 7, barème de charge et table du repli
réécrits et re-signés, `D-xxx` amendant `D-105`.

## Décisions prises

- `D-273` (amende `D-105`, `D-198` §1 et §3, `D-223` §1 et §5).
- Barème, échelle B : `CHARGE-01` ≤ 1 léger, `CHARGE-02` 2 à 3 modéré,
  `CHARGE-03` 4 à 7 chargé. SHA `7848189d…`.
- Table du repli **en proportion** : terme `etendueSansRepli` (0 aucune, 1 une
  partie, 2 chacune), lignes `REPLI-01`/`REPLI-04`/`REPLI-05`, SHA `3d2e5f0d…`.
  `REPLI-02` et `REPLI-03` retirées, identifiants non réutilisés.
- Correctif du comptage du constructeur dans ce lot ; texte « ne compte pas dans
  la limite de sept actions ».
- Deux déclarations de conformité du responsable le 2026-10-08 : « Je déclare
  conforme » (barème + table à deux lignes), puis, après avoir redemandé les
  questions avec leurs enjeux, « Conforme » sur la table en proportion. La
  version à deux lignes (`f6593020…`) est rangée, jamais mergée.

## Fichiers modifiés

- Code : `clinical-engine/types.ts`, `protocolDraft.ts` (message),
  `contenuPatientProtocole.ts` (message), `ProtocolMiniBuilder.tsx`,
  `clinical/baremeChargePur.ts`, `baremeChargeV1.ts`, `tableRepliPur.ts`,
  `tableRepliV1.ts`, et leurs bancs ; `doctrine/seuilsLitterauxMotives.guard.test.ts`.
- Docs : `DECISIONS.md` (D-273), `changelog.d/2026-10-08-bp25-plafond-sept-actions.md`,
  `SURFACE_RELECTURE_BP25.md`, fiche LOT-25 et `CAMPAGNE.md`, `FEATURE_FLAGS.md`,
  `RELATION_PRATICIEN_PATIENT_SOURCE.md`, `checklist_tests_end_to_end.md`,
  `ARCHITECTURE_CLINIQUE_3_2.md`, `REGISTRE_FRONTIERES.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert ; T1 rapide vert après les corrections de revue.
- T3 complet (`npm run test:worktree`) vert en 4 min 22 s : 12 020 + 1 625 tests
  unitaires, 243 E2E Chromium + WebKit, « No difference detected ».
- SHA du repli calculé deux fois (module, et table recopiée à la main) : identiques.
- Revue `wn-reviewer` : GO, aucun P0/P1. P2 corrigés : commentaires périmés
  (`ProtocolMiniBuilder.tsx`, `tableRepliPur.ts`), phrase de D-273 sur la
  première surface ; référence de ligne de la surface (`:809` → `:816`)
  consignée dans D-273 sans retoucher la surface déclarée.

## Problèmes ouverts

- **Passe Codex obligatoire** (module clinique signé) : geste du responsable.
- « Reprendre cette charge » cliqué sur un brouillon gonflé d'actions vierges
  fige `loaded` dans le champ ; supprimer les vierges ne le fait pas redescendre.
  Comportement antérieur au lot, rendu plus probable par le plafond à 7 ; aucune
  version enregistrée n'est touchée.
- Tests manquants signalés par la revue, non bloquants : rendu patient et route
  portail à 7 actions ; E2E du plafond (7 ajouts puis bouton désactivé).
- La table du repli n'est lue par aucun écran (`D-223` §5) : le branchement est
  un lot à part.

## Prochaine action exacte

Attendre le CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`, en fond), lire
les commentaires en ligne, faire passer la revue Codex par le responsable, puis
merger. Ensuite : reprise de BP-26 à tête reposée (session à part, copie
principale, branche `docs/bp26-relecture-mdcg`, commit `ed5594b3` local non poussé).

## Interdits encore actifs

- Une signature clinique ne se pose jamais par l'outil : tout texte de table
  réécrit exige une nouvelle surface et une nouvelle déclaration (`D-195`).
- Ne pas réutiliser `REPLI-02`, `REPLI-03`, ni les SHA rangés.
- Pas d'auto-merge sur une PR de lot ; un merge à la fois, déploiement constaté.
- Jamais de rebase sans arbitrage humain ; pas de `git add -A` (lien
  `web/node_modules` non suivi dans le worktree).
