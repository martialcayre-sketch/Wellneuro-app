# Handoff — F05, zinc : libellés et fiches sous la v13, consigne v14 (2026-11-25)

## Branche et état Git

- Branche `f05-textes-zinc-v13` du worktree `b-besoin4-decision-guide`, tirée
  d'`origin/main` après le merge de #2341 (v13), avancée par `--ff-only` sur
  `97e0d72d`. Consigne, outil (bancs), documentation ; aucune base touchée.

## Objectif

Préalable de `D-558` §10 : textes validés de `FU_ZINC_P1` et `P2`. Essai des
huit fiches du zinc (`20261125-1126-b`), puis consigne v14 pour les refus
stables.

## Décisions prises

- Dépôts accordés par le responsable, envoi par envoi : `HYP_ZINC_1` n° 1,
  `FU_ZINC_P4` n° 1, `FU_ZINC_P5` n° 1 ; tous validés par lui à l'écran.
- `20261125-1450-b` : rejeu unique de P1, P2, P3, P7 (0/4).
- `20261125-1505-b` : consigne v14 ciblée ; `D-501` §18 accepté.
- `20261125-1506-b` puis `20261125-1800-b` (clinique, avis Codex à l'aveugle :
  A) : cadre des médicaments « A + délai », `D-501` §19 accepté, joint à la
  v14. Texte final approuvé (« J'approuve la v14 finale »), empreinte
  `c8717862be389cad`.

## Fichiers modifiés

- `tools/corpus/fiches-usage/consignes/redaction.md`, `contre-lecture.md`
- `tools/corpus/fiches-usage/lib/consigne.mjs` (v14), `consigne.test.mjs`,
  `README.md`
- `docs/decisions/D-501.md` (§18, §19)
- `docs/claude/plan-journal/F05/2026-11-25-02-textes-zinc-essai-v13-consigne-v14.md`
- `changelog.d/2026-11-25-d501-consigne-fiches-usage-v14.md`
- ce handoff
- Hors dépôt : `~/.wellneuro/corpus/fiches-usage/designations.json`
  (`HYP_ZINC_1`, `POP_ENFANT_GROSSESSE_ALLAITEMENT` ajoutés ; copie
  `designations.avant-zinc-2026-11-25.json`).

## Validations exécutées

- Constats par conteneur (lecture seule) : libellés (`one-off-950`),
  désignations (`one-off-1504`), versions P4 et P5 (`one-off-7879`),
  validations P4 et P5, 9 rubriques sur 9 (`one-off-6988`).
- Contre-revue Codex P0 de la v14 : deux P2 corrigés (exclusion trop large en
  « interpretations », phrase d'absence non bornée aux claims) ; puis du §19 :
  un P2 corrigé (phrases distinctes côté contre-lecture). Bancs 39/39.

## Problèmes ouverts

- `FU_ZINC_P1`, `P2`, `P3`, `P7` : un essai v14 après le merge.
- `FU_ZINC_P6`, `P8` : essai sous la v14 (§19) après le merge.
- Fer P2 et P6 : à un arbitrage distinct (quantités de prise en plus).
- Réglés par d'autres files depuis le début de session : E2E du rail latéral
  (#2353), renvois du plan vers `CAMPAGNE.md` (#2357). Restent signalés : J3-12f
  attribué à la file A dans le plan ; page BioFlow à mettre à jour par le
  responsable.

## Prochaine action exacte

CI, PR-Agent, verdicts, « prête ». Après le merge : un seul essai v14 de P1,
P2, P3, P6, P7, P8 ; dépôt des acceptées sur accord ; validation.

## Interdits encore actifs

- Aucune signature ni validation clinique à la place du responsable ; aucun
  avis collé pris pour son accord.
- Aucune écriture en production sans accord pour chaque envoi ; lecture par
  `scalingo run -d` seulement.
- Aucun texte de fiche ni libellé au dépôt public (`D-251` §4).
- Aucun essai sous la v14 avant son merge ; pas de rejeu sans arbitrage.
- Ne pas toucher au worktree `file-d1-suite` ; aucun autre lot sans accord.
