# Handoff — lot `parite-commandes-ci-multilignes` : appel node/bash déguisé refusé par le banc de parité (2026-11-27)

## 1. Branche et état Git

- Branche `claude/clever-mayer-ksl5lm`, tirée d'`origin/main` à afa1965e (passe cloud de l'orchestrateur,
  journal `20261127-0908-orch`).
- Carnet : le lot `parite-commandes-ci-multilignes` (file D, ordre 127, P1, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `parite-commandes-ci-multilignes--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; les lignes `lu` restantes appellent des gestes hors de ce
  lot (responsable, Mac) et n'ont pas été touchées.

## 2. Objectif

`commandesNodeBash` (sens CI → check de `scripts/parite-check-ci.test.mjs`) ne lisait que les `run:` dont
`node` ou `bash` ouvre la ligne. Un garde écrit derrière un préfixe, en `run:` simple ou en bloc,
échappait à la parité sans bruit. Résultat attendu : formes présentes lues, toute autre refusée
bruyamment, contre-épreuve par mutation, écart vide sur `main`, `ci.yml` inchangé.

## 3. Décisions prises

- Une seule forme lue, celle que `ci.yml` emploie : `node …` / `bash …` en tête de ligne de shell.
  Le mot `node`/`bash` ailleurs dans la ligne (après `&&`, `;`, `then`, `$(`, préfixe d'environnement,
  guillemets, chemin absolu) est refusé par assertion (`commandesNodeBash`), et compte comme faute dans
  un job sans `setup-node` (`etapesHorsParite`).
- Non visés : commentaire de shell, `node_modules`, `scripts/node`, `--node`.
- Correctifs de revue (`wn-reviewer`, GO) : en-têtes `run: |2`, `run: | # …` lus comme blocs ;
  valeur de `run:` commençant par `|`, `>` ou un guillemet sans en-tête reconnu refusée ; clés sœurs
  d'un `- run: |` ferment le bloc (indentation du tiret + 2) ; message d'assertion reformulé.
- Aucune liste d'admission : aucune forme présente et illisible dans `ci.yml` aujourd'hui.

## 4. Fichiers modifiés

- `scripts/parite-check-ci.test.mjs` (`lireNodeBash`, `commandesNodeBash`, `etapesHorsParite`, cinq tests)
- `changelog.d/2026-11-27-parite-commandes-ci-multilignes.md`
- `docs/claude/handoffs/2026-11-27-0917-parite-commandes-ci-multilignes.md`

## 5. Validations exécutées

- `node --test scripts/parite-check-ci.test.mjs` → 88/88 (écart vide sur le `ci.yml` réel, contre-épreuve :
  le banc de parité réécrit en bloc derrière `cd .` fait refuser la lecture).
- Mutation par `wn-reviewer` : retirer le refus fait échouer trois des nouveaux tests.
- `npm run check:rapide` → 0 ; `npm run check` (T1 complet) → 0, sur le code final.
- `wn-reviewer` (P1) : GO, constats moyens 1 à 3 et mineurs 4-5 corrigés dans le lot.
- T2/T3 non joués : interdits à la passe cloud, non exigés (banc d'outillage).

## 6. Problèmes ouverts

- Limites connues, documentées dans la JSDoc, aucune forme présente dans `ci.yml` : scalaire simple
  continué sur la ligne suivante ; `shell: node {0}` ; ligne continuée par `\` (`FOO=1 \` puis
  `node x` est lu `node x`, sans préfixe) — mineur 6 de la revue, accepté.

## 7. Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent (`node scripts/wn-revue-pr-agent.mjs <N>` → 0),
un verdict par remarque, « prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur la
ligne du lot. Merge : l'intégrateur.

## 8. Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni T2/T3, ni lot suivant.
- `ci.yml` hors périmètre de ce lot.
