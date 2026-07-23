### SP-CONV — premières baselines visuelles commitées (2026-07-23)

Huit baselines (cockpit, tiroir des 12 besoins, patients & assignations,
porte du portail — Desktop Chromium et iPhone 13) générées sous Ubuntu par
le workflow `visual-baselines`, relues image par image (deux itérations de
relecture ont attrapé un état transitoire et des textes dépendant du
calendrier avant leur entrée au dépôt), puis commitées dans
`web/e2e/visual.spec.ts-snapshots/`. La comparaison au pixel de `verify`
est désormais active sur ces quatre écrans — la dérogation V12 est levée
en fait, plus seulement en mécanique.
