# Handoff — F05, zinc : essai sous la v15, consigne v16 (2026-11-27)

## Branche et état Git

- Branche `f05-zinc-essai-v15-consigne-v16` du worktree
  `b-besoin4-decision-guide`, tirée d'`origin/main` après le merge de #2378
  (v15, `32380ddf`), avancée par `--ff-only` sur `1f47a0a0`. Consigne, banc,
  documentation ; aucune base touchée.

## Objectif

Préalable de `D-558` §10 : textes validés de `FU_ZINC_P1` et `P2`. Essai
unique v15 des cinq fiches restantes, puis consigne v16 pour ses refus.

## Décisions prises

- Essai v15 : 0/5 ; arbitrage du responsable : « v16 ciblée » (2026-11-26).
- Texte de la v16 approuvé (« J'approuve la v16 », 2026-11-27), empreinte
  `0fc7a23664e0833d` ; `D-501` §21 accepté.

## Fichiers modifiés

- `tools/corpus/fiches-usage/consignes/redaction.md`, `contre-lecture.md`
- `tools/corpus/fiches-usage/lib/consigne.mjs` (v16), `consigne.test.mjs`,
  `README.md`
- `docs/decisions/D-501.md` (§21)
- `docs/claude/plan-journal/F05/2026-11-26-02-textes-zinc-essai-v15-consigne-v16.md`
- `changelog.d/2026-11-26-d501-consigne-fiches-usage-v16.md`
- ce handoff

## Validations exécutées

- Essai v15 (`fiche-usage-v15+e51250c6d8fdd63d`) : 0/5, tous à la
  contre-lecture ; rapports hors dépôt sous `~/.wellneuro/`.
- Bancs `consigne`, `preparation`, `chargement-web` : 41/41.
- Contre-revue Codex P0 de la v16 : deux P1 (exclusions trop absolues,
  pouvant taire une condition de sécurité), corrigés par deux réserves ;
  contre-passe sans constat.
- T1 complet (`npm run check`) : vert.

## Problèmes ouverts

- `FU_ZINC_P6` : refus de « options » hors v16, contenu de la rubrique à
  arbitrer ; P6 ne peut pas passer avant.
- Fer P2 et P6 : arbitrage distinct (quantités de prise).

## Prochaine action exacte

CI, PR-Agent, verdicts, « prête ». Après le merge : un seul essai v16 de
P1, P2, P3, P6, P8 ; bilan par fiche ; dépôt des acceptées sur accord, une
fiche à la fois, constat par conteneur, validation à l'écran par le
responsable.

## Interdits encore actifs

- Aucune signature ni validation clinique à la place du responsable ; aucun
  avis collé pris pour son accord.
- Aucune écriture en production sans accord pour chaque envoi ; lecture par
  `scalingo run -d` seulement.
- Aucun texte de fiche, de claim ni libellé au dépôt public (`D-251` §4).
- Aucun essai sous la v16 avant son merge ; pas de rejeu sans arbitrage.
- Ne pas toucher au worktree `file-d1-suite` ; aucun autre lot sans accord.
- Avant tout script d'édition : `git fetch` puis `git log HEAD..origin/main`
  vide.
