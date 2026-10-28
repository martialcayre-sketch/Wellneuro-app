# Handoff — 2026-10-28 — BP-13, D-391 PR 1 : la vigilance lit les lignes hors drapeau, un point par traitement, et le banc sur vraie base

## Branche et état du dépôt

- Branche `feat/bp13-physio-vigilance`, worktree
  `.claude/worktrees/bp13-physio-vigilance` (session concurrente, cycle en
  `git` et `gh` directs). Partie de `origin/main` e57521c4 (#1757).
- Ni migration, ni `schema.prisma`, ni chemin `web/src/lib/clinical/**`
  modifié, ni authentification, ni `.coderabbit.yaml` : PR ordinaire,
  libération dès le merge.
- `WN_PHYSIO_TRAITEMENTS` et `WN_COURRIER_COMPLEMENT` restent éteints.

## Objectif

Livrer la PR 1 de [[D-391]] §8 : §4 (lecture hors drapeau), §5 (un point
par traitement sous le plafond de 500) et §7 (banc sur vraie base de
`ecriture.ts`). Remplit la condition (2) de l'allumage.

## Décisions prises

Aucune décision nouvelle. Lectures de mise en œuvre :
- **Repère des morceaux de suite** : `[lignes datées du dossier] (suite)`.
  Jamais de la forme `[C-…]`, que `documents/depuisSynthese.ts` arrête au
  praticien : le document du médecin perdrait la fin d'un traitement
  ([[D-391]] §3).
- **Libellé du point inchangé** (« Traitements médicamenteux en cours … »,
  au pluriel, même pour une ligne) : la décision garde source et phrase
  d'avertissement ; aucun texte clinique retouché.
- **Banc de concurrence** : un « même fil » de traitement se joue par deux
  remplacements de la même tête (deux premières poses ouvrent deux fils
  distincts, toutes deux légitimes) ; pour un critère, par deux premières
  poses de grossesse.
- **`schemaStrictRelance.test.ts`** : la lecture désormais inconditionnelle,
  sur son Prisma simulé, journalisait un avertissement avant ceux du schéma
  que ce banc compte ; `lireTraitementsEnVigueur` y est simulée (aucune
  ligne).

## Fichiers modifiés

- `web/src/lib/synthese/generation.ts` : la condition du drapeau et son
  import retirés ; le `try` séparé reste.
- `web/src/lib/consultation/contexteClinique.ts` : un point par ligne,
  `scinderSousPlafond`.
- Bancs : `vigilanceSynthese.guard.test.ts` (épingle amendée, « rien vers
  l'IA » gardée), `contexteClinique.test.ts` (un point par ligne, 547
  caractères scindés sans perte ni `[C-…]`), `schemaStrictRelance.test.ts`
  (mock), `physio-traitements/physioTraitements.pg.test.ts` (neuf).
- `.github/workflows/ci.yml` : étape « Donnees physiologiques et traitements
  real-database bench » après le banc à deux sessions.
- Clôture : `docs/FEATURE_FLAGS.md` (condition (2) remplie), fiche LOT-13,
  `docs/claude/plan-journal/F07/2026-10-28-02-d-391-pr1.md`,
  `changelog.d/2026-10-28-d391-pr1-vigilance-banc.md`, ce handoff.

## Validations exécutées

- Banc pg en local sur la base du worktree (`wn-dev-db.sh --migrate`) :
  3 sur 3 joués. Mutation : `verrouillerTraitements` retiré de
  `ecriture.ts` ⇒ le test de concurrence rougit ; fichier restauré.
- T1 `npm run check:rapide` : vert (17 étapes) après le mock de
  `schemaStrictRelance.test.ts`.
- Revue `wn-reviewer` : GO sous réserve, aucun bloquant.
  - Corrigés : croisement des écritures concurrentes FORCÉ (l'observateur
    tient le verrou jusqu'à deux attentes dans `pg_locks`) ; retour à « non
    renseigné » vérifié par `lireDonneesDuDossier` ; commentaire périmé de
    `lecteursPhysioTraitements.guard.test.ts`.
  - Réserves de livraison (fichier neuf à indexer, handoff) : levées.
  - Plafond de 20 points du brouillon praticien : non atteignable, les
    brouillons naissent vides ; la vigilance du code ne va qu'aux synthèses
    IA, sans plafond de nombre.

## Problèmes ouverts

- **Déduplication de `fusionnerVigilance`** (revue, mineur, laissé) : deux
  traitements de même nom et même dose ne font plus qu'un point (l'ancien
  `join` affichait « X ; X ») ; deux points scindés aux bornes peuvent
  partager un dernier morceau identique, que le second perd. Aucun dossier
  ne porte de ligne ; à reprendre si le cas paraît.
- **Aucun banc de `preparerGeneration` de bout en bout** : la lecture hors
  drapeau n'est épinglée que par la forme du code
  (`vigilanceSynthese.guard.test.ts`). Les autres bancs de synthèse, à
  Prisma simulé, passent en silence par le `catch`.

## Prochaine action exacte

1. PR (`--body-file`), CI en fond : `node scripts/wn-attendre-ci.mjs <N>`.
2. CodeRabbit sur la tête, un verdict par remarque.
3. `node scripts/wn-sonde-release-db.mjs <N>` à 0, puis merge
   `--match-head-commit`.
4. Puis D-391 PR 2 (export du dossier, §2) dans une session neuve.

## Interdits encore actifs

- `WN_PHYSIO_TRAITEMENTS` et `WN_COURRIER_COMPLEMENT` éteints ; allumage :
  geste du responsable, après la PR 3 (v22) mergée le jour même.
- Aucune migration ni `schema.prisma` ; jamais `prisma format`.
- Aucun seuil ni règle clinique ; texte transmis à l'IA inchangé ; garde
  [[D-101]] intouchée.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seules ; traitements
  synthétiques.
