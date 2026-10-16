# Handoff — lettre f : la proposition de bilan lit les remboursements NABM (F54, D-316)

## Branche et état Git

- Branche `feat/nabm-proposition-f54`, depuis `origin/main` 9305022c puis
  avancée sans fusion sur 9377001f (#1506, avance rapide approuvée par le
  responsable, branche encore vide), dans le worktree
  `.claude/worktrees/file-d1-suite` (session concurrente, cycle en git/gh).
- Un commit (code, bancs, docs), puis la PR de ce lot.

## Objectif

Lettre f (file A, rang 2) : brancher les remboursements NABM signés dans la
proposition de bilan, et consigner la clôture de M-3c dans F54. Sans
migration.

## Décisions prises

- D-316 (quatre arbitrages du responsable du 2026-10-17, tous sur la
  recommandation) : document patient « non vérifié à ce jour », « seulement
  s'il est demandé avec d'autres examens », « non remboursé par l'assurance
  maladie », rien pour une analyse remboursable, « resterait à votre charge »
  retiré ; courrier D-309 §2-§3 avancés ; cockpit état par analyse et limite
  nommant les non évaluées.
- Forme fixée sans question, par mesure (D-316 §5) : mentions une fois par
  document, analyses distinctes. Ligne à ligne : 8 759 caractères au banc du
  courrier (borne de consignation 8 000). Catalogue réel relu par conteneur
  (one-off-4229, catalogue seul) : pire cas réaliste 7 348 / 7 691.
- Libellés des quatre états déplacés dans la feuille pure
  `libellesRemboursement.ts` (le cockpit ne tire pas la fiche d'analyte).
- D-309 §1 (code d'acte par ligne, groupe et conditions en mots) et §4
  (retrait de `regimeDocumentaire`) restent au rang 4, avec J3-base.

## Fichiers modifiés

- `web/src/lib/biology-library/{propositionService,documentPatient,courrier,remboursable,catalogue,libellesRemboursement}.ts`
  et leurs bancs ; `web/src/components/patient-cockpit/PropositionBilanPanel.tsx`
  (+ banc) ; `web/src/components/biologie/FicheAnalytePanel.tsx` (réexport).
- `docs/DECISIONS.md` (D-316), `docs/claude/PLAN_WELLNEURO.md` (porte 10,
  ligne M-3c, F54 : clôture de M-3c et lettre f ; F55),
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée : la nomenclature passe de
  4 à 9 surfaces indirectes), `changelog.d/2026-10-17-nabm-proposition-f.md`.

## Validations exécutées

- Vitest ciblé : bibliothèque biologie, cockpit, routes de proposition — vert.
- Contre-épreuve : onze mutations jouées une à une (carte non passée, constat
  sans millésime, limite toujours, limite hors lignes proposées, mentions
  retirées ou « qui paie » remis au patient et au courrier, dédoublonnage,
  cockpit sans état, actes hors millésime) — toutes rougissent.
- T1 `check:rapide` et `check` complets : verts.
- T2 `test:worktree -- --fast` : [à compléter].
- Revue `wn-reviewer` : [à compléter].

## Problèmes ouverts

- Pire cas d'un document patient à 7 691 caractères pour une borne de 8 000 :
  marge mince si le catalogue s'allonge (refus propre, 409, au-delà).
- `consommation_decisions.json` range encore la source `rayon:biologie`
  « dormante (2026-09-01) » alors que la proposition la lit : à revoir au
  prochain arbitrage de la matrice (hors périmètre).

## Prochaine action exacte

CI par `node scripts/wn-attendre-ci.mjs <N>` en fond, revue CodeRabbit sur le
sha de tête et commentaires en ligne lus, merge (D-290), déploiement
constaté. Puis artefacts : r2 (page de la file A) et n08 (BioFlow). Reste à
F54 : constats de `BIO_CAR` et `BIO_AG_ERYTHROCYTAIRES` (geste du
responsable), puis G-3.

## Interdits encore actifs

- Aucune signature ni aucun constat écrit par migration ou script : gestes du
  responsable à l'écran seulement.
- Aucune migration, aucun `schema.prisma` dans ce lot.
- Pas de modification clinique sans D-xxx ; aucune identité réelle au dépôt ;
  lecture de production par conteneur seulement.
