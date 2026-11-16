# Handoff — 2026-11-16 — F05 (BP-12a) : essai v9 sur les cinq fiches arrêtées sur max_tokens, une acceptée et déposée

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v9-cinq`, partie d'`origin/main` (`944c49d3`), qui contient #2169 (`35846ccd`) et #2177.

## Objectif

Faire l'essai unique sous la v9 arbitré par le responsable (`20261116-1342-b`) sur `FU_POLY_AOX_P3`, `P6`, `P7`, `FU_MG_P5` et `P6`, déposer ce qui est accepté et le constater.

## Décisions prises

- `20261116-1342-b`, responsable, 2026-11-16 : « Essai v9 sur les cinq fiches, une fois ».
- `20261116-1352-b` (clinique), responsable, 2026-11-16 : la validation de « options » de `FU_MG_P8` vaut l'arbitrage de D-501 §11 (consigné par #2177).

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-16-04-textes-essai-v9-cinq-fiches.md`, ce handoff. Aucun code, aucune consigne.

## Validations exécutées

- La consigne servie est `fiche-usage-v9+26ec769b7e28a398`, annoncée par l'outil. Les cinq fiches passent la rédaction, et aucune ne s'arrête sur `max_tokens`.
- `FU_MG_P6` est acceptée, `--validate` conforme, puis déposée en n° 1 (`BROUILLON_DEPOSE`). Constat `one-off-1380` (lecture seule) : 5 rubriques, aucun acte.
- Trois refus à la contre-lecture sur 5 rubriques (POLY P3, P7, MG P5), et une contre-lecture inachevée (POLY P6). Rapports hors dépôt : `~/.wellneuro/corpus/fiches-usage/*/2026-11-16T1[23]-*-revue.json`.
- La phrase fixe de quantité n'est écrite dans aucune rubrique.

## Problèmes ouverts

- Validation de `FU_MG_P6` n° 1 : geste du responsable, à l'écran.
- v10 (D-501 §13, Codex P0, puis texte soumis au responsable), au vu de l'ensemble des refus. Trois familles :
  - la quantité de prise écrite malgré Q1-B (phrase fixe jamais écrite) ;
  - la phrase d'absence écrite malgré un claim ;
  - un usage qui dépasse le statut « preuves limitées ».
  S'y ajoutent les familles connues : options qui débordent, généralisation, rubriques hors objet.
- POLY P6 : contre-lecture inachevée (`max_output_tokens` 4096). Budget d'outil à arbitrer, comme celui de la rédaction.
- D-501 §11 : amendement à faire par une PR de décision. L'arbitrage du volume d'eau est rendu (`20261116-1352-b`). L'avis Codex (D-505) est à joindre, ou son absence à justifier.
- Le `RAG_INTERNAL_SECRET` local n'est pas celui de la production. Le dépôt passe le secret Scalingo au seul processus (`env-get`), sans l'afficher.
- Restent sans version déposée : POLY P2, P3, P4, P6, P7, P8, MG P4, P5, P7, le fer (`FU_FER_P1`, `P2`, `P5`, `P6`), le zinc et les fiches non rédigées.

## Prochaine action exacte

Déclarer cette PR « prête @sha ». Poser au responsable les questions de la v10 et du budget de contre-lecture.

## Interdits encore actifs

- Production en lecture seule, par conteneur. Un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature sont des gestes du responsable, sauf délégation D-509 explicite ; aucune n'est en cours.
- Aucune modification de la consigne v9 ni de la structure signée sans D-xxx et approbation, et rien sous `web/src/lib/clinical/`.
- Aucun rejeu sans arbitrage. Les arbitrages rendus ne se reposent pas.
- `web/.env.local` est absent du worktree : passer `--env-file=/Users/wellneuro/Developer/Wellneuro-app/web/.env.local`.
