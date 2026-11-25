### Banc du garde `campaign-audit-check` : un cas rouge par code (2026-11-25)

`scripts/wn-campaign-audit.mjs` est un garde bloquant de `npm run check`
(`--fail-on-warning-codes`, sept codes) ; son banc ne couvrait qu'un code
(`closed_campaign_with_open_lots`, statut « transféré », #2369). Le banc
`scripts/wn-campaign-audit.test.mjs` relit désormais la liste des codes dans
la ligne `campaign-audit-check` de `web/package.json` et joue, pour chacun,
une fixture hermétique (répertoire temporaire) : sortie 1 sous les drapeaux
de la ligne, seul ce code sonne, aucune erreur ne l'explique à sa place, et
sortie 0 quand ce code est retiré de la liste. Deux cas conformes (racine
seule, principal et miroir identiques) rendent 0 sans avertissement. Un code
ajouté à la ligne sans cas, retiré d'elle, ou un drapeau ajouté à la ligne
(`--no-fail`, `--root`…) rougit le banc.

Constat : la ligne ne passe pas `--root`, donc n'audite que la racine
principale ; `missing_in_mirror`, `extra_in_mirror` et
`status_drift_between_roots` n'y sonnent jamais. Leurs cas passent `--root`
et prouvent le mécanisme. Le comportement du script et la ligne de check
sont inchangés ; le banc était déjà inscrit à `bancs-outillage-check` et au
CI.
