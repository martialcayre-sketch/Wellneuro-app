# Handoff — 2026-11-13 — F05, textes des fiches d'usage : pilote fer sous la v4, fer en attente

## Branche et état Git

`f05-textes-v4-redaction`, créée vide sur `origin/main` (23231f85) après le
merge de #2042 (40c432e7), avancée en `--ff-only` à 5510bd0c. Worktree
`b-fiche-usage-iode-selenium`. Un seul commit de documentation (journal F05
et ce handoff).

## Objectif

Rédiger sous la consigne v4 (`fiche-usage-v4+28ece7ee8ab1922d`) FU_FER_P1,
P2, P5, P6, et P3 de nouveau (version n° 2), puis déposer les fiches
retenues.

## Décisions prises

- Arbitrage du responsable (A) : un seul rejeu des cinq fiches sous la v4,
  sans changement ; ne retenir qu'une fiche entièrement acceptée ; aucun
  assemblage de rubriques entre passes ; P3 reste en version n° 1 tant
  qu'aucune remplaçante n'est retenue ; aucune délégation de validation.
- Arbitrage du responsable (ii) : fer en attente, blocage consigné au
  journal F05, passage au dossier suivant. Pas de v5 à ce stade : deux
  passes ne départagent pas hasard, consigne et structure ; une v5 ne
  comblerait pas la couverture documentaire de `surveillance_arret`. La
  reprise dépend d'un changement identifié (couverture documentaire ou cadre
  signé), pas d'un nouveau rejeu identique.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-13-01-textes-pilote-fer-v4-en-attente.md`
- `docs/claude/handoffs/2026-11-13-1035-f05-pilote-fer-v4-en-attente.md`

## Validations exécutées

- `rediger.mjs`, deux passes sous la v4 : cinq fiches refusées par la
  contre-lecture à chaque passe, 19 refus sur 36 évaluations de rubriques.
  Rapports horodatés hors dépôt
  (`~/.wellneuro/corpus/fiches-usage/FU_FER_P*/2026-11-13T09-*-revue.json`).
- Aucun `deposer.mjs` lancé, aucun dépôt, aucun acte de validation.
- Bancs : voir la PR.

## Problèmes ouverts

- Refus récurrents : FU_FER_P3/interprétations, FU_FER_P5/précautions,
  FU_FER_P2/surveillance_arret ; `surveillance_arret` refusée 5 fois sur 6
  tentatives (P1, P2, P6), sans claim de surveillance ni d'arrêt.
- P3 : version n° 1 en production, « interprétations » toujours sans acte.
- Le `RAG_INTERNAL_SECRET` de `web/.env.local` (copie principale) n'est
  toujours pas celui de la production ; mise à jour : geste du responsable.
- Ce worktree n'a pas de `web/.env.local` : l'outil se lance avec
  `--env-file` sur celui de la copie principale.

## Prochaine action exacte

Demander au responsable quel dossier du besoin 2 suit (un dossier par lot),
avant de commencer. Le fer ne reprend qu'après un changement identifié.

## Interdits encore actifs

- Production en lecture seule, par conteneur ; un dépôt passe par la route
  interne, jamais par un SQL.
- Aucun texte de fiche, de libellé ni de claim dans le dépôt (D-251 §4).
- Validation et signature : gestes du responsable seul, sauf délégation
  explicite (D-509) ; aucune délégation en cours.
- Ne pas toucher à `ficheUsageBesoin2V1.ts` sans D-xxx ni re-signature.
- Pas de pull, merge ni rebase d'une branche qui a des commits sans
  arbitrage.
