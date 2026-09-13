# Handoff — 2026-09-13 — Écartement d'une proposition d'orientation, et trois défauts de release-db

## Branche et état Git

`suite-campagne`, partie d'`origin/main` à `8788ac90`. Deux lots DÉJÀ mergés dans
la journée : `c306fae1` (geste d'écartement, `D-178`) et `8788ac90` (correctifs
`release-db` + déclaration RGPD). Le troisième — clôture — est sur cette branche,
non commité au moment d'écrire.

## Objectif

Clore la campagne : rendre exprimable « je ne veux plus voir cette proposition »
sans faire taire un axe clinique, puis réparer le workflow qui écrit en production.

## Décisions prises

- **`D-178` mis en service** (la table était appliquée depuis la PR précédente).
  L'écartement porte sur la CIBLE, fige les règles qui la motivaient, et se LÈVE
  dès qu'une règle absente de cette liste vient motiver la même cible. La reprise
  est une ESPÈCE, pas une colonne nullable.
- **L'alternance des espèces se juge sur le VERDICT, pas sur le fil seul.** La
  première rédaction gelait une ligne réveillée — ni ré-écartable, ni reprenable —
  sur le cas même que `D-178` existe pour couvrir. L'en-tête de la migration
  qualifie encore un `ecartement` supplantant un `ecartement` de « sans aucun
  sens » : prémisse fausse, que le réveil falsifie. Le fichier de migration n'est
  PAS touché (appliqué en production, Prisma en garde l'empreinte) ; la correction
  vit dans la route.
- **`WN_SHA_ATTENDU`** remplace la réaffectation `GITHUB_SHA="$TETE"`, qui mourait
  avec son étape. Deux faits distincts, deux noms : le commit approuvé reste
  `GITHUB_SHA`.
- **Le résumé de `release-db` borne sa plage au dernier run RÉUSSI.** Borne exacte,
  pas heuristique. Un run rejeté conclut `cancelled` — CONSTATÉ sur le rejet du
  jour, c'est ce qui rend le filtre `status=success` suffisant.
- **Un invariant de sécurité resserré, pas levé** : `resume` peut voir le
  `GITHUB_TOKEN` (lecture des runs), et seulement lui. Arbitrage du responsable.
- **Le garde de fidélité de restitution de synthèse s'arme sur
  « la table a proposé », pas sur « un bloc est parti »** — sans quoi un dossier
  tout écarté cessait d'être mesuré. L'allowlist compte les cibles écartées, faute
  de quoi armer le garde produirait la fausse accusation que sa propre doctrine
  interdit.
- **Dette RGPD : dix-sept → sept.** Neuf étaient des dettes PÉRIMÉES — déclarées
  depuis `D-167` mais toujours dispensées de vérification, donc plus gardées.

## Fichiers modifiés

Lots mergés : `lib/orientation/ecartements.ts` (module feuille neuf),
`api/praticien/orientation/ecartement/route.ts` (neuf), `orientationService.ts`,
`api/praticien/orientation/route.ts`, `OrientationPanel.tsx`,
`.github/workflows/release-db.yml`, `scripts/release-db-invariants.test.mjs`,
`docs/DOSSIER_RGPD.md`, `rubrique5.modeles.test.ts`.

Lot de clôture : `lib/synthese/generation.ts`, `orientationService.ts`,
`OrientationPanel.tsx`, `rubrique5.modeles.test.ts`, `docs/DOSSIER_RGPD.md`,
`scripts/release-db-comportement.test.mjs` (neuf), `.github/workflows/ci.yml`,
`web/package.json`.

## Validations exécutées

- **T3 complet vert** aux trois lots (`T3-EXIT=0` lu dans le fichier de sortie,
  jamais dans le résumé de tâche) : 9 103 + 1 590 tests unitaires, contrats SQL,
  dérive schéma↔migrations, seed, build, 196 E2E.
- **Revue indépendante à chaque lot.** La première a rendu NO-GO sur deux
  bloquants réels ; la seconde GO sous réserve, quatre réserves levées.
- **Mutation systématique** — une dizaine de mutants tués, chacun restauré par
  `cp` (jamais `git checkout --`). Deux enseignements : un banc statique ne voit
  pas un RÉORDONNANCEMENT, et une garde d'autorisation peut ne rien tenir (retirer
  le filtre d'appartenance laissait 26 tests verts).

## Problèmes ouverts

- **Deux propositions `release-db` en attente** (`c306fae1`, `9d7e61c3`) portent le
  workflow d'AVANT le correctif — un run `push` exécute le fichier de son commit
  déclencheur. Les approuver rejouerait le défaut. Rien n'attend la production :
  aucune migration entre le dernier run réussi et la tête. Arbitrage rendu :
  rejeter avec motif, puis relancer en `workflow_dispatch` sur `main`.
- Hors campagne, inchangés : second `T0`, lettre DPA, trois trous du § 7 RGPD,
  clôture de l'agenda alimentaire (`a_transmettre` sans CTA).
- La qualification **article 9** des deux tables de gestes praticien reste due au
  responsable de traitement (échéance 2026-10-21, table des dettes).
- Neuf fragments `changelog.d/` du jour NON repliés — arbitrage explicite : le
  repliement attend une coupe de version.

## Prochaine action exacte

Merger le lot de clôture, PUIS rejeter les deux runs en attente et déclencher un
`workflow_dispatch` sur `main`. L'ordre compte : tout merge tue un run en attente
d'approbation.

## Interdits encore actifs

Aucune identité patient réelle dans le dépôt. Production en lecture seule
(conteneur `scalingo run -d`) ; écriture par migration relue + `release-db`
approuvée. Pas de force-push. Pas de `npx prisma format`. Pas de modification de
`schema.prisma` ni de migration sans demande explicite. Aucune approbation
`release-db` par l'agent.
