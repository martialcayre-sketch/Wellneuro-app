# Handoff — 2026-11-16 — F05 (BP-12a) : budget de sortie de la rédaction porté à 64 000 jetons

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-outil-budget-sortie`, partie d'`origin/main` (`6a32a9d5`) après le merge de #2165 (`5e7e2712`).

## Objectif

Appliquer l'arbitrage `20261116-1246-b` (limite à 64 000 jetons, en streaming, effort inchangé) dans une PR d'outil seule, avec son banc.

## Décisions prises

- `20261116-1246-b`, responsable, 2026-11-16 : « Augmenter la limite (64 000, streaming), effort inchangé ».
- `20261116-1247-b`, responsable, 2026-11-16 : « Outil d'abord, v10 au vu des cinq fiches ». L'essai v9 sur les cinq fiches arrêtées sur `max_tokens` reste soumis à un arbitrage distinct, à prendre après ce merge.

## Fichiers modifiés

- `tools/corpus/fiches-usage/lib/preparation.mjs` : `JETONS_SORTIE_REDACTION`, `requeteRedaction`, et la raison dédiée à `max_tokens` dans `lireRedactionFiche`.
- `tools/corpus/fiches-usage/rediger.mjs` : `messages.stream(requeteRedaction(…)).finalMessage()`.
- `tools/corpus/fiches-usage/lib/preparation.test.mjs` : réponse vide sur `max_tokens`, réponse coupée, requête, câblage en streaming.
- `changelog.d/2026-11-16-fiches-usage-budget-sortie.md`, `docs/claude/plan-journal/F05/2026-11-16-02-textes-budget-de-sortie.md`, ce handoff.

## Validations exécutées

- Bancs de l'outil (`preparation.test.mjs`, `consigne.test.mjs`) : 26/26. `node --check rediger.mjs` : OK.
- Empreinte servie inchangée : `fiche-usage-v9+26ec769b7e28a398`.
- Ce lot ne fait aucun appel de modèle, aucun rejeu et aucun dépôt.

## Problèmes ouverts

- L'essai v9 sur `FU_POLY_AOX_P3`, `P6`, `P7`, `FU_MG_P5` et `P6` est à arbitrer par le responsable après le merge. C'est le premier passage du streaming en conditions réelles.
- La v10 (phrase d'absence malgré un claim, usage au-delà du statut « preuves limitées ») viendra au vu de cet essai : D-501 §13, Codex P0, puis le texte soumis au responsable.
- Phrase fixe de quantité (Q1-B) : jamais écrite, donc pas encore éprouvée.
- Toujours en attente : validation à l'écran de `FU_MG_P3` n° 1, le fer, le zinc, le volume d'eau de `FU_MG_P8` et les sept rubriques sans acte du rang 06.

## Prochaine action exacte

Déclarer la PR « prête @sha » à l'intégrateur. Après le merge, poser au responsable la question de l'essai v9 sur les cinq fiches.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- `web/.env.local` est absent du worktree : passer `--env-file=/Users/wellneuro/Developer/Wellneuro-app/web/.env.local`.
