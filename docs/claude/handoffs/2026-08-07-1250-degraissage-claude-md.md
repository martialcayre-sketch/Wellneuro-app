# Handoff — 2026-08-07 — Dégraissage de CLAUDE.md : la gouvernance PR/merge sort du fichier toujours chargé

## Branche et état Git

- Branche `claude/wellneuro-workflow-tokens-5x6jyy`, repartie de `origin/main`
  (`bd413ff`, PR #607 mergée) — jamais de la branche squashée.
- Diff docs/skills/scripts uniquement, aucun fichier `web/src/`.

## Objectif

Réduire le seul coût payé à chaque requête de chaque session : `CLAUDE.md`,
26 722 o (~7 000 tokens), relu ~37 fois par session avant tout travail.

## Décisions prises

- **Déplacer plutôt que compresser** pour la gouvernance PR/merge (7 417 o,
  27,8 %) : elle ne sert qu'au moment de merger et était *déjà* rechargée là par
  `/wn-merge`. Sortie dans `docs/claude/REGLES_PR_MERGE.md`, texte verbatim,
  `CLAUDE.md` gardant la décision non négociable et le renvoi.
- **`cat` plutôt que `sed`** dans `/wn-merge` : le couplage par ancres de titres
  s'était rompu en silence le matin même ; il n'existe plus.
- **Volet délégation abandonné** : `/wn-plan`, `/wn-debug` et `/wn-review`
  portent déjà `context: fork`. Y ajouter une étape de délégation aurait été de
  la cérémonie. Remplacé par 4 lignes de documentation dans « Économie de
  contexte ».
- Deux erreurs corrigées au passage : l'audit du matin affirmait à tort « zéro
  prescription de délégation dans les skills » (`wn-lot` la prescrit
  impérativement) ; `CLAUDE.md` nommait `patient/[idAssignation]` comme portail
  patient alors que le courant est `portail/[token]`.

## Fichiers modifiés

- `CLAUDE.md` — 26 722 → 19 586 o (−26,7 %).
- `docs/claude/REGLES_PR_MERGE.md` — créé (8 153 o).
- `.claude/skills/wn-merge/SKILL.md` (deux blocs `!` → un `cat`),
  `wn-pr/SKILL.md` (renvoi).
- `scripts/wn-check-automation.sh` — garde d'ancres → garde d'existence.

## Validations exécutées

- Bloc `!` de `/wn-merge` rejoué : 6 codes de sortie + section Copilot rendus.
- Aucun renvoi orphelin vers une section disparue (`grep` hors archives).
- `wn-check-automation.sh` : vert. `wn-kit-doctor` : 0 consigne morte.
- `node --test scripts/wn-cycle.test.mjs` : 38/38.
- T1 (`npm run check`) : vert. Diff des titres : seules les 3 sections déplacées
  ont disparu ; 8 règles non négociables intactes.

## Problèmes ouverts

- `main` local ahead 50 / behind 51 d'`origin/main` : arbitrage humain, lot
  séparé, signalé à chaque `wn-cycle`.
- Re-mesure de la consommation : impossible depuis ce conteneur (transcripts sans
  compteurs), nécessite un export console.

## Prochaine action exacte

Ouvrir la PR, lire `verify`, merger selon le régime courant.

## Interdits encore actifs

- Ne pas réécrire les sections adossées aux hooks (« Lire la base de
  production », « Garde-fous d'écriture »).
- Pas de `pull`/`merge`/`rebase` automatique sur le `main` divergent.
