# Handoff — F05, zinc : essai sous la v14, consigne v15 (2026-11-26)

## Branche et état Git

- Branche `f05-essai-zinc-v14` du worktree `b-besoin4-decision-guide`, tirée
  d'`origin/main` après le merge de #2360 (v14, `29d6ffff`), avancée par
  `--ff-only` sur `7c1a9c59`. Consigne, outil (bancs), documentation ; aucune
  base touchée.

## Objectif

Préalable de `D-558` §10 : textes validés de `FU_ZINC_P1` et `P2`. Essai
unique v14 des six fiches restantes, puis consigne v15 pour les refus
stables.

## Décisions prises

- `20261126-1235-b` : rejeu de P3 et P7 seulement ; v15 ciblée pour P1, P2,
  P3, P6, P8.
- Dépôt accordé par le responsable : `FU_ZINC_P7` n° 1 (sous la v14).
- Texte de la v15 approuvé (« J'approuve la v15 »), empreinte
  `e51250c6d8fdd63d` ; `D-501` §20 accepté.

## Fichiers modifiés

- `tools/corpus/fiches-usage/consignes/redaction.md`, `contre-lecture.md`
- `tools/corpus/fiches-usage/lib/consigne.mjs` (v15), `consigne.test.mjs`,
  `README.md`
- `docs/decisions/D-501.md` (§20)
- `docs/claude/plan-journal/F05/2026-11-26-01-textes-zinc-essai-v14-consigne-v15.md`
- `changelog.d/2026-11-26-d501-consigne-fiches-usage-v15.md`
- ce handoff
- Hors dépôt : revue Codex du §19 versée au dépôt privé des revues.

## Validations exécutées

- Essai v14 : 0/6 ; rejeu P3, P7 : P7 acceptée, P3 refusée (« limites »).
- `deposer.mjs --validate` de P7 conforme ; dépôt n° 1 ; constat par
  conteneur (`one-off-5591`) : 3 rubriques, empreintes égales, consigne v14,
  aucun acte.
- Bancs `consigne`, `preparation`, `chargement-web` : 40/40.
- Contre-revue Codex P0 de la v15 : aucun constat (réserve de couverture :
  §19 et marqueur sécurité non entiers dans le paquet).

## Problèmes ouverts

- `FU_ZINC_P7` n° 1 : validée à l'écran par le responsable le 2026-11-26
  (constat par conteneur `one-off-2141` : 3 actes `validee`, relecture
  intégrale, empreintes égales aux rubriques déposées). Fait.
- `FU_ZINC_P6` : second refus de « options » (effets comparatifs, limites de
  preuve) hors v15 ; contenu de la rubrique à arbitrer.
- Fer P2 et P6 : arbitrage distinct (quantités de prise).
- Signalé : J3-12f attribué à la file A dans le plan (#2367 mergée par elle).

## Prochaine action exacte

CI, PR-Agent, verdicts, « prête ». Après le merge : un seul essai v15 de P1,
P2, P3, P6, P8 ; dépôt des acceptées sur accord ; validation.

## Interdits encore actifs

- Aucune signature ni validation clinique à la place du responsable ; aucun
  avis collé pris pour son accord.
- Aucune écriture en production sans accord pour chaque envoi ; lecture par
  `scalingo run -d` seulement.
- Aucun texte de fiche ni libellé au dépôt public (`D-251` §4).
- Aucun essai sous la v15 avant son merge ; pas de rejeu sans arbitrage.
- Ne pas toucher au worktree `file-d1-suite` ; aucun autre lot sans accord.
