# Handoff — 2026-10-29 — BP-13 : allumage de `WN_PHYSIO_TRAITEMENTS` consigné

## Branche et état du dépôt

- Branche `docs/bp13-allumage-constat`, partie de `origin/main` a4bb77ee
  (avance `--ff-only` depuis 195e532f). Worktree
  `.claude/worktrees/bp13-pr2-export-lignes` (session concurrente, cycle en
  `git` et `gh` directs).
- PR de documentation seule : ni code, ni migration, ni `schema.prisma`, ni
  chemin clinique, ni texte patient.

## Objectif

Consigner l'allumage de `WN_PHYSIO_TRAITEMENTS` ([[D-335]] §9, [[D-391]]) et
son constat, après la PR 3 de D-391 (#1770, 195e532f).

## Décisions prises

- Aucune décision neuve. Allumage : geste du responsable le 2026-10-28, puis
  restart ; la v22 et les conditions v5 étaient servies en production depuis
  46798be1.
- Constat du 2026-10-29 : `api/praticien/physio-traitements` et
  `api/portail/physio-traitements` répondent `401` sans session (`503`
  avant) ; production sur a4bb77ee.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (ligne `WN_PHYSIO_TRAITEMENTS` : allumé, constaté,
  restes au responsable).
- `docs/claude/campagnes/2026-10-04-bio-parcours/lots/LOT-13-physio-traitements.md`
  (puce « Allumé, constaté »).
- `docs/claude/plan-journal/F07/2026-10-29-01-allumage-constate.md`.
- `changelog.d/2026-10-29-bp13-allumage-constat.md`.
- Ce handoff.

## Validations exécutées

- T1 `check:rapide` puis `npm run check`, verts avant la PR.
- Aucune lecture de base : le constat est celui des deux routes, sans
  session.

## Problèmes ouverts

- **À faire par le responsable**, non constatés : l'e-mail
  `conditions_utilisation@5` aux patients suivis ; le passage de bout en bout
  de [[D-345]] §8 (« non » à grossesse et à allaitement sur un dossier de
  test).
- Questions du lot 2 (historique dans l'export, discordance anamnèse ↔
  ligne) : toujours ouvertes, hors de ce lot.

## Prochaine action exacte

1. CI en fond : `node scripts/wn-attendre-ci.mjs <N>` ; revue de bot
   ([[D-393]]) sur la tête.
2. Essai [[D-373]] : ne pas merger ; déclarer « prête @<sha de tête> » avec
   le chemin de ce handoff, puis `/clear`.

## Interdits encore actifs

- `WN_COURRIER_COMPLEMENT` reste éteint ; l'assistant n'y touche pas.
- Aucune migration, aucun `schema.prisma`, jamais `prisma format`.
- Aucun texte patient modifié ; aucun seuil ni règle clinique.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seules.
