# Handoff — 2026-10-18 — F80, PR 2 : composition signée (liste préparée, signature, fiche d'analyte)

## Branche et état Git

- Branche `lot/f80-composition`, depuis `origin/main` 4b8d6cae puis fusion de
  `origin/main` 2de8d456 ; worktree `file-d1-suite` (session concurrente, cycle
  en git/gh direct).
- Lot F80 : PR 0 #1529 (D-323) et PR 1 #1540 (migration) mergées ; release-db
  de #1540 approuvée, sentinelle liée au run, garde anti-recul rouge par
  conception (release appliquée), constat par conteneur consigné sur #1540.

## Objectif

D-323 §1 : la composition d'une analyse groupée ou d'une valeur calculée se
signe par le praticien sur la fiche d'analyte, à partir d'une liste préparée.

## Décisions prises

- D-323 (arbitrages du responsable des 2026-10-17 et 2026-10-18) ; aucune
  décision neuve dans cette PR.
- Le praticien signe la liste préparée ou une partie d'elle, jamais un analyte
  hors liste ; le type vient de la liste, jamais du client.
- Aucun composé n'est composant d'un autre (banc) : pas d'imbrication, pas de
  cycle — la base ne le tient pas, le code le tient.
- Retrait après confirmation, désigné par la date de signature vue.

## Fichiers modifiés

- `web/src/lib/biology-library/compositionsPreparees.ts` (module pur) et
  `compositionsAnalytes.ts` (lecture, signature, retrait) ;
- `web/src/app/api/praticien/biologie/compositions/route.ts` ;
- `web/src/components/biologie/CompositionAnalyteSection.tsx`, montée dans
  `FicheAnalytePanel.tsx` ;
- `candidatsNabm.ts` : 1610 ajouté aux candidats Na, K, Cl ;
- bancs : `compositionsPreparees.test.ts`, `compositionsAnalytes.test.ts`,
  `compositions/route.test.ts`, `CompositionAnalyteSection.test.tsx`,
  `RayonBiologiePanel.test.tsx` (simulacre de la lecture de composition),
  `importeursBiologyLibrary.guard.test.ts` (deux importeurs) ;
- `docs/claude/MATRICE_CONSOMMATION.md` régénérée ; fragment
  `changelog.d/2026-10-18-f80-composition-signature.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert.
- T2 (`npm run test:worktree -- --fast`) : un rouge, la liste blanche des
  importeurs, corrigé ; T2 rejoué après correction (verdict dans la PR).

## Problèmes ouverts

- PR 3 : la proposition, le courrier et le document patient ne lisent pas
  encore la composition (D-323 §2-§4) ; inerte tant qu'aucune composition
  n'est signée.
- Signature des compositions : geste du responsable, à l'écran, après le
  déploiement de cette PR.
- Alias d'import des sept fiches de D-323 §6 : hors F80 (résolveur signé).

## Prochaine action exacte

Après merge et déploiement constaté : PR 3 sur une branche depuis `main` —
`remboursable.ts` (calculé et regroupement héritent du statut le plus faible
de leurs mesures), `statuts.ts` `composerAnalytes` (groupe en une ligne,
constituants dessous ; constituant seul « remboursable seulement accompagné »
remplacé par son groupe, « demandée pour »), rendu du courrier et du document,
bancs inerte/mutation, T3 ; clôture du lot (F80, handoff, SESSION_LOG).

## Interdits encore actifs

Aucune composition, signature ou constat écrits par script ou migration ;
aucune règle d'indication ni bilan gelé modifiés ; aucune identité réelle ;
aucun lien d'artefact dans le dépôt ; jamais de pull ni rebase automatique ;
jamais `prisma format`.
