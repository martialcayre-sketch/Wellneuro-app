# Banc permanent WellNeuro

Ce dossier contient les tests durables qui protègent la source de vérité
machine, les vues dérivées et les contrats de contexte/diagnostic.

## Arborescence cible

```text
tests/wellneuro/
├── golden/
│   └── scoring-golden.test.mjs
├── invariants/
│   └── source-of-truth-campaign.test.mjs
├── fixtures/
│   └── scoring-golden.json
└── evals/
  ├── context-pack-corpus.test.mjs
  └── context-pack-density.test.mjs
```

## Règles

- `.wn/state.json` est la source machine.
- `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` est une vue dérivée.
- Aucun test du banc permanent ne doit dépendre d’une donnée patient réelle.
- Les scénarios utilisent uniquement des structures minimales et des valeurs
  fictives.
