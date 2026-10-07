# Handoff — BIO-INGEST LOT-10 : décimales exactes de bout en bout (2026-10-07)

## Git

Branche `feat/bio-ingest-lot10-decimales` depuis `origin/main` (cd5c7353),
copie principale. PR à ouvrir après T2 vert.

## Objectif

La valeur d'un résultat biologique ne passe plus par un `number` entre la
saisie ou la ligne lue et la colonne `numeric` ; relue à l'identique.

## Décisions

- Pas de migration : colonne `DECIMAL(65,30)`. Refus au-delà de 30 décimales
  (Postgres arrondissait en silence) ou de 35 chiffres entiers.
- « À l'identique » = forme canonique (point, sans zéro de tête ni de queue) :
  l'échelle fixe ne garde pas les zéros de queue.
- Module pur `lib/biology-library/valeurDecimale.ts`, partagé écran/serveur.
- La route n'accepte qu'une chaîne ; un `number` JSON = `valeur_invalide`
  (un onglet resté ouvert sur l'ancien client doit être rechargé).
- Restitution par `Decimal#toFixed()` (`toString()` passe en exponentielle).
- `portesBiologiquesService.ts` (clinique, D-122) non touché.
- Garde BP-01 : `EstimeMesurePanel` et `SaisieBilan` inscrits, motif
  « `valeurDecimale` seul ».

## Fichiers

`valeurDecimale.ts` (+test), `resultats.ts`, `saisieMessages.ts`,
`import/valeurLue.ts`, `import/decisions.ts`, routes `resultats` et
`resultats/bilan`, `SaisieBilan`, `EstimeMesurePanel`,
`ImportCompteRenduPanel`, tests associés, garde BP-01, fiche LOT-10,
CAMPAGNE.md, fragment changelog.

## Validations

- T1 `check:rapide` vert.
- Vitest ciblé vert ; aller-retour exact par voie (Decimal passé à `create`,
  GET en notation normale, corps POST des écrans).
- Aller-retour en base locale réelle (client Prisma + adaptateur pg), 8
  valeurs limites, transaction annulée, 0 résidu.
- `/code-review medium` : aucun défaut.
- T2 `test:worktree -- --fast` : première passe rouge sur le seul garde
  BP-01 (corrigé), seconde passe verte (Vitest, build, E2E).

## Ouvert

Rien sur le lot. Suite de campagne : LOT-04 (constat d'usage, clôture),
LOT-05 en attente de la réponse du laboratoire.

## Prochaine action

`npm run check` → commit → PR → `wn-attendre-ci` en fond.

## Interdits actifs

Pas de conversion d'unité, pas de qualification, pas de migration, aucune
écriture dans `resultats_biologiques` sans validation humaine.
