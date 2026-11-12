# Handoff — 2026-11-12 — banc identifiant–rubrique du journal du plan, bloquant en CI (D-502 §4, Q3 bis)

## Branche et état Git

- Branche `feat/banc-journal-identifiant-rubrique`, sur `origin/main` 6e3ac640 (après le merge de #2040, `D-504`),
  dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot 3 des suites des sept questions du 2026-11-12 (Q3 bis, `D-502` §4) : un banc contextuel qui refuse, dans
`docs/claude/plan-journal/`, l'association d'un identifiant de claim et d'un nom de rubrique d'étiquetage
(`D-325` §5, `D-251` §4).

## Décisions prises

- Préalable : `20261112-1241-b` était déjà `close` (pr 2036, posé par l'intégrateur).
- Source des noms : la liste fermée `RUBRIQUES_FICHE_USAGE` de `web/src/lib/fiches-usage/vocabulaire.ts`, lue dans
  son texte source ; aucune copie dans le banc ni dans ses fixtures. Le nom à l'écran (`libelles.ts`) commence par le
  premier mot du code : ce premier mot, au singulier ou au pluriel, suffit.
- Contexte : un identifiant sur la ligne, plus soit un code entre accents graves, soit un nom dans les QUATRE mots
  qui suivent un mot de l'acte (« rubrique », « étiquet… », « sign… », « besoin »). Le critère « même ligne » seul
  ne suffit pas : un fragment tient souvent en une seule ligne-paragraphe, et ce critère seul donnait 4 fausses
  alertes sur l'arbre. Avec la fenêtre, il n'y en a aucune, et les trois lignes d'avant `D-502` (relues dans
  l'historique) sont toutes prises.
- Rapport opaque : chemin et ligne. Sortie 1 (bloquant), annotation `::error` en CI.
- Balayage : 1 écart, `H15/2026-11-12-01-iom-2000-relecture-0649-005.md:2`. Question `20261112-2005-b`, tranchée
  en séance par le responsable sur l'option recommandée : décision d'abord. Le geste a été fait par `D-504` (#2040,
  mergée, question `close`). Le banc entre vert.
- Pas de fragment au journal de H15 pour ce lot : le fragment correctif de `D-504` annonce déjà le banc, et ce lot
  n'ajoute aucun constat sur les claims.

## Fichiers modifiés

- `scripts/lib/plan-journal-rubriques.mjs`, `scripts/wn-plan-journal-rubriques.mjs`,
  `scripts/lib/plan-journal-rubriques.test.mjs` (nouveaux).
- `.github/workflows/ci.yml` : étape bloquante après le garde du journal ; banc de tests ajouté à l'étape des bancs.
- `web/package.json` : `plan-journal-check` lance le banc ; `bancs-outillage-check` lance ses tests (parité de
  `parite-check-ci`).
- `changelog.d/2026-11-12-banc-journal-identifiant-rubrique.md` ; ce handoff.

## Validations exécutées

- `node --test` banc + `parite-check-ci` + `ci-invariants` : 74/74.
- `node scripts/wn-plan-journal-rubriques.mjs` sur l'arbre : `exit=0`.
- T1 (`check:rapide`, puis `npm run check`) : vert.
- T2 (`test:worktree -- --fast`) : vert en 17 min 59 s (Vitest, contrats SQL, bancs à deux sessions, build, E2E).
- Revue PR-Agent sur d150f23d (`wn-revue-pr-agent.mjs` = 0) : une remarque, corrigée. Le test qui lisait trois
  fragments réels de H15 par leur nom est retiré : un retrait d'urgence (`D-371` §3) l'aurait cassé, et l'étape
  bloquante du CI juge déjà l'arbre ; les formes occultées restent couvertes par les fixtures. Avant ce correctif,
  `origin/main` a été fusionné dans la branche, sur arbitrage du responsable (garde de fraîcheur, aucun fichier
  commun).

## Problèmes ouverts

- Le banc lit la prose : une tournure qui nommerait la rubrique à plus de quatre mots d'un mot de l'acte, ou sans
  aucun de ces mots, passerait. La fenêtre est un compromis justifié en tête de module, pas une preuve d'absence.
- L'historique Git n'est pas visé (`D-502` §2, `D-504` §2).

## Prochaine action exacte

1. CI de la tête ; revue PR-Agent prouvée (`wn-revue-pr-agent.mjs` = 0), sinon `wn-reviewer` ; un verdict par
   remarque.
2. Déclarer « prête @<sha> » ; l'intégrateur merge.

## Interdits encore actifs

- Aucun nom de rubrique, texte de claim ni dose au dépôt, ni dans les tests, ni dans les messages de commit.
- Aucune réécriture de fragment du journal (`D-502` et `D-504` sont closes à leurs lignes) ; un écart futur demande
  une décision.
- Aucune migration, aucune écriture en base ; pas de `prisma format`.
