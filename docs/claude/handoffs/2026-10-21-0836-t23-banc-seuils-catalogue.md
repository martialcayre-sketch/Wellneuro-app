# Handoff — t23 : les seuils du catalogue sous instantané

## Branche et état du dépôt

- Branche `lot/t23-banc-seuils-catalogue`, worktree `d281-lot3-portail`,
  partie de `origin/main`, main fusionnée (a89ab28c, après #1619). Sans
  migration, sans drapeau.

## Objectif

Dernier reste codable de t23 (LOT-11) : les seuils du catalogue n'étaient
gardés par aucun banc de forme (`seuilsLitterauxMotives` exempte tout
`questions.ts`).

## Décisions prises

- Arbitrages du responsable, 2026-10-21 : instantané + D-xxx exigée, jamais
  un verrou ; puis, après la première contre-revue (les « 33 seuils » vivent
  surtout dans le moteur), portée = blocs + MOTEUR ENTIER, refactoring compris.
- Moteur = tout `questions.ts` hors du littéral `QUESTIONNAIRE_CATALOGUE`
  (imports compris : rediriger `BANDES_PSQI` rougit). `note` incluse dans
  l'empreinte des blocs (elle voyage dans le résultat du score).
- Historique append-only ; décision postérieure à `D-335` exigée ; pose figée
  par un littéral qui couvre sa date, sa dernière décision et les étapes sans
  décision ; retrait par étape `retire: true`.
- `Q_ALI_01` a deux variantes servies selon `WN_ALI_01_SIIN57` : chacune a son
  historique (`Q_ALI_01_COURT_14`, `Q_ALI_01_SIIN_57`), le banc vérifie que
  `Q_ALI_01` sert l'une des deux ; vert dans les deux positions, donc inscrit à
  l'allowlist motivée de `scripts/specs-drapeau-ali01.test.mjs`.
- Une ligne ajoutée à `.claude/rules/clinique-scoring.md` pour les sessions
  qui retouchent le scoring. Aucune décision `D-xxx` neuve.

## Fichiers modifiés

- `web/src/lib/doctrine/empreinteScoring.ts`, `seuilsCatalogue.guard.test.ts`,
  `seuilsCatalogue.instantane.json` (neufs) ;
  `seuilsLitterauxMotives.guard.test.ts` (commentaire de limite).
- `.claude/rules/clinique-scoring.md`, `scripts/specs-drapeau-ali01.test.mjs`
  (allowlist), `changelog.d/2026-10-21-t23-banc-seuils-catalogue.md`, SESSION_LOG.

## Validations exécutées

- Bancs `seuilsCatalogue` et `seuilsLitterauxMotives` verts (28 tests) ;
  mutations sur le vrai fichier : seuil Horne `<= 41` → `<= 42` rougit,
  commentaire retouché ne rougit pas. Deux contre-revues `wn-reviewer`
  (NO-GO P1 sur un commentaire faux, puis GO ; P2 appliqués). Banc vert
  drapeau éteint et allumé ; T1 complet vert. T2 non joué : aucun code UI ni
  API, le CI joue la suite entière.

## Problèmes ouverts

- Hors empreinte, déclaré : valeurs d'options (`sections`), contenu des
  modules importés par `questions.ts`. Un reformatage autour d'un opérateur
  rougit (faux positif, côté sûr).

## Prochaine action exacte

CI, CodeRabbit, merge, déploiement ; t23 → « fait » au suivi ; puis t30
(surface des libellés), puis grille E67.

## Interdits encore actifs

- Un merge à la fois ; aucune image antérieure à 257807e3 redéployée ; rien
  de clinique sans D-xxx.
