# Handoff — 2026-11-16 — F05 (BP-12a) : plafond de la contre-lecture porté à 16 000 jetons, cause d'un arrêt gardée

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-outil-contre-lecture`, partie d'`origin/main` (`ca9d3499`, qui contient #2169 et #2177). #2183 (journal, rang 04) est ouverte à part : ce lot prend le rang 05.

## Objectif

Appliquer l'arbitrage `20261116-1518-b` : relever le budget de la contre-lecture et garder la cause d'un échec inachevé, dans une PR d'outil seule, avec son banc.

## Décisions prises

- `20261116-1518-b`, responsable, 2026-11-16 : « Relever le budget et garder la cause (PR d'outil) ». POLY P6 est rejouée avec l'essai v10.
- `20261116-1517-b`, responsable, 2026-11-16 : la v10 porte sur les trois familles du rédacteur. Elle se fera dans un lot distinct.

## Fichiers modifiés

- `tools/corpus/fiches-usage/lib/preparation.mjs` : `JETONS_SORTIE_CONTRE_LECTURE` (16 000), `lireVerdictContreLecture`.
- `tools/corpus/fiches-usage/rediger.mjs` : le plafond et la lecture du verdict passent par `preparation.mjs`, et `parseJsonLache` n'est plus importé.
- `tools/corpus/fiches-usage/lib/preparation.test.mjs` : réponse inachevée avec ou sans cause, verdict achevé, câblage.
- `changelog.d/2026-11-16-fiches-usage-budget-contre-lecture.md`, `docs/claude/plan-journal/F05/2026-11-16-05-textes-budget-de-contre-lecture.md`, ce handoff.

## Validations exécutées

- Bancs de l'outil (`preparation.test.mjs`, `consigne.test.mjs`) : 29/29. `node --check rediger.mjs` : OK.
- Empreinte servie inchangée : `fiche-usage-v9+26ec769b7e28a398`.
- Ce lot ne fait aucun appel de modèle, aucun rejeu et aucun dépôt.

## Problèmes ouverts

- Validation de `FU_MG_P6` n° 1, déposée sans acte : geste du responsable, à l'écran.
- La v10 (D-501 §13, Codex P0, texte soumis au responsable avant tout essai) porte sur trois familles : la quantité de prise écrite malgré Q1-B, la phrase d'absence écrite malgré un claim, et un usage au-delà du statut « preuves limitées ».
- D-501 §11 : amendement à faire par une PR de décision. L'arbitrage du volume d'eau est rendu (`20261116-1352-b`). L'avis Codex (D-505) est à joindre, ou son absence à justifier.
- #2183 (journal de l'essai, rang 04) attend son merge par l'intégrateur.

## Prochaine action exacte

Déclarer cette PR « prête @sha ». Ensuite, ouvrir le lot de la v10 sur une branche neuve.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- `web/.env.local` est absent du worktree : passer `--env-file=/Users/wellneuro/Developer/Wellneuro-app/web/.env.local`.
