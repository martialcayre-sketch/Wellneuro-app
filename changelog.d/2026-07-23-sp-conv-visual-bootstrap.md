### SP-CONV — échappatoire de bootstrap des baselines visuelles (2026-07-23)

Le garde-fou d'existence des baselines rendait leur création impossible
(aucune baseline → jamais de comparaison → `--update-snapshots` n'écrivait
rien). `WN_VISUAL_UPDATE=1`, posé uniquement par le workflow
`visual-baselines`, force le passage de `toHaveScreenshot` pour écrire la
première baseline. Comportement de `verify` et des postes locaux inchangé.
