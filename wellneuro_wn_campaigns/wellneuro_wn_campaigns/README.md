# Miroir documentaire des campagnes WellNeuro

Ce paquet conserve une copie synchronisée de `docs/claude/campagnes/` pour
les usages portables et les audits de conformité.

## Autorité

- Le référentiel normatif reste `docs/claude/campagnes/` à la racine du dépôt.
- `.wn/state.json` reste l'unique autorité machine pour les campagnes actives.
- Ce miroir ne doit pas être modifié indépendamment du référentiel principal.

## Synchronisation

La copie a été réalignée le 2026-07-14 après clôture de HC-F et activation du
parallélisme C1/QX. Les écarts sont contrôlés par
`scripts/wn-campaign-audit.mjs`.
