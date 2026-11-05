# Handoff — 2026-11-05 — t58 : le registre des décisions, un fichier par décision (D-418)

## Branche et état Git

- Branche `t58-registre-un-fichier`, worktree
  `.claude/worktrees/t58-registre-un-fichier`, partie de `origin/main`
  88bbfa9c, puis `origin/main` 028039a2 fusionné (arbitrage du responsable,
  « Fusionner main » : #1874 avait ajouté D-443 au registre unique).
- Commits : e96f29a4 (bascule), 93f3302f (fusion de `main`, rejeu du script),
  2aa35ada (correctifs de la revue `wn-reviewer`), 22815954 (ce handoff),
  puis fusion de `main` f3e1bc99 après #1875 (arbitrage « #1875 d'abord ») et
  rejeu : D-444 créée.
- PR #1876, CI vert sur 22815954 ; revue bot impossible (CodeRabbit : 488
  fichiers > 100 ; PR-Agent rogné, « Review coverage ») ⇒ **dérogation du
  responsable pour #1876 seule** (2026-11-05), consignée dans la PR.

## Objectif

Lot t58 de la file A : bascule de D-418 §1 à §6 en une PR — migration par
script rejouable, banc de découpage, page fixe, lecture par commande,
outillage du §5 en trois catégories, aucun garde retiré.

## Décisions prises

- Les lignes vides entre deux entrées ne sont pas reprises (0, 1 ou 2 au
  registre) : chaque fichier finit par un seul saut de ligne ; le banc compare
  chaque entrée sans ses lignes vides finales. Écart signalé dans la PR.
- `changelog.d/…` est une cible écrite depuis la racine (revue A1) : inchangée ;
  26 liens rebasés (`../web/…` 22, `claude/…` 4).
- Le « désordre » de D-370 §3 disparaît du garde (un fichier n'a pas de
  rang) ; « titre accordé au nom » le remplace (D-418 §5).
- La base d'avant la bascule reste lisible par le garde et l'accompagnement
  (`numerosA` : `docs/decisions/`, sinon titres `###` de l'ancien registre) —
  nécessaire à cette PR même (`HEAD^1` = `main` monolithique).
- `textesCourrierComplement.test.ts` relit tout le registre, comme avant : ses
  textes sont dans D-362, pas dans D-345 que cite son commentaire ; resserrer
  aurait changé ce que le banc affirme.
- Deux commentaires de code applicatif citant `docs/DECISIONS.md`
  (`trust/contenus/registre.ts:1748`, `api/praticien/agenda-alimentaire/route.ts:25`)
  laissés : interdit « aucun code applicatif » ; la page fixe y renvoie.
- Revue R2 (verrouiller tout diff de la page fixe) écartée avec motif dans la
  PR ; R5, R6 sans suite.

## Fichiers modifiés

- `docs/decisions/D-001.md` à `D-443.md` (créés) ; `docs/DECISIONS.md` (page
  fixe).
- Neufs : `scripts/lib/registre-decisions.mjs`, `scripts/wn-decisions.mjs`
  (+ banc), `scripts/wn-decisions-decouper.mjs` (+ banc),
  `web/src/lib/doctrine/lireDecision.ts` (+ banc), fragment
  `changelog.d/2026-11-05-t58-registre-un-fichier-par-decision.md`.
- Réécrits : `scripts/lib/decisions-numerotation.mjs` (+ banc),
  `scripts/wn-reserver-decision.mjs` (+ banc), `scripts/wn-cycle.mjs` (+ banc),
  `scripts/wn-ancres-doctrine.mjs` (+ banc),
  `scripts/version-prompt-documents.test.mjs`,
  `scripts/wn-controle-fusion.test.mjs`, `scripts/wn-kit-doctor.mjs`, dix tests
  web (portail ×5, trust ×2, clinical-engine, doctrine, courrier-complement).
- Textes : `.github/workflows/ci.yml` (commentaires + étape « bancs du
  découpage et de la lecture »), `web/package.json` (`bancs-outillage-check`),
  `.gitattributes`, `.coderabbit.yaml` (une `path_instructions`, texte seul),
  `.wn/documentation.yml`, skills `wn-merge`, `wn-finish`, `wn-lot`,
  `AGENTS.md`, `REGLES_PR_MERGE.md`, `PROJET_CONTEXTE.md`,
  `doctrine/README.md`, `CONSTITUTION_CLINIQUE.md`, ligne §8 du plan (soldée).

## Validations exécutées

- Découpage : `node scripts/wn-decisions-decouper.mjs --depuis origin/main` →
  444 entrées, 26 liens, banc OK ; contre-vérification indépendante en shell
  (recomposition, `cat -s`, diff) sur `main` 028039a2 puis f3e1bc99 : 9 lignes
  diffèrent, toutes porteuses de liens rebasés, rien d'autre.
- Garde réel : `node scripts/lib/decisions-numerotation.mjs` → OK (443) ;
  `--pr` → OK ; `wn-ancres-doctrine` → 4 ancres, 308 héritées, identique au
  `main` d'avant (arbre `git archive` de 88bbfa9c).
- Bancs de scripts touchés : 273/273 (numérotation, découpage, lecture,
  réservation, cycle, ancres, version de consigne, contrôle de fusion,
  parité) ; dix tests web + aide : 121/121.
- T1 complet (`npm run check`) vert sur 2aa35ada (Vitest 1716, bancs 790).
- T3 (`npm run test:worktree`) vert sur e96f29a4 (8 min 38 s) et sur 2aa35ada
  (8 min 12 s ; 16 149 tests, 331 E2E).
- Revue `wn-reviewer` sur e96f29a4 : go ; A1, R1, R3, R4 corrigés en 2aa35ada.

## Problèmes ouverts

- Toute PR qui ajoute une décision dans `docs/DECISIONS.md` avant le merge :
  rejouer `node scripts/wn-decisions-decouper.mjs --depuis origin/main` après
  fusion de `main` (la page fixe gagne le conflit).
- Après merge : t58 → fait sur la page de la file A et dans la mémoire
  `suivi-file-a-artefact` (prochain identifiant de dette : t61) ; mémoire
  `d418` à mettre à jour ; rappel t60 (synthèse IA et règles non évaluées).

## Prochaine action exacte

CI de #1876 sur la nouvelle tête (`wn-attendre-ci` en fond) ; avant de
déclarer, rejouer le script sur le `main` du moment et vérifier qu'aucune PR
ouverte ne touche `docs/DECISIONS.md` ; déclarer « prête @<sha> » sans
merger ; suivre jusqu'au merge et au premier CI vert de `main` (PR qui touche
`.coderabbit.yaml` et des skills : pas de `/clear` dès « prête »).

## Interdits encore actifs

- Aucun mot changé dans le texte d'une décision hors les deux exceptions du §3.
- Aucun document daté réécrit ; aucun code applicatif ; aucune migration ni
  `schema.prisma` ; aucun garde retiré ou affaibli ; WN-SRC (§7) hors lot.
- Ne pas merger (essai D-373 : déclarer « prête @<sha> »).
