### H88 : sonde release-db par phases, gel intégral levé (D-374 §2 à §5, 2026-10-27)

- Nouvelle sonde en lecture seule, `node scripts/wn-sonde-release-db.mjs <N>`.
  Elle lit tous les runs non conclus de `release-db.yml` : un filtre par
  statut, toutes pages, en deux passes. Elle lit en plus la page des derniers
  runs sans filtre.
  - En attente d'approbation (`waiting`), une PR est gelée si elle touche une
    migration, un chemin clinique, `release-db.yml` et ce que son run exécute
    contre la production, ou le déployeur.
  - Tout autre état non conclu bloque tout merge : l'exécution, ou le
    démarrage avant la porte.
  - Une PR qui touche un chemin gelé reste aussi gelée tant que le dernier
    commit déclencheur de `main` n'a pas de run.
  - `0` seul autorise le merge ; une lecture impossible gèle.
  - Pour un ancien run en attente, elle dit s'il s'approuve tel quel ou se
    rejette (D-374 §3).
- `wn-merge` l'appelle avant le merge (étape 7 bis), et `REGLES_PR_MERGE.md`
  la nomme. Le piège 2 de `pr-revue-et-release-db.md` §5 est réécrit : un
  merge de code seul pendant l'attente ne tue pas le run. `CLAUDE.md` renvoie
  à la sonde.
- `release-db.yml` compare maintenant la tête dépassante sur
  `web/src/lib/clinical/` en plus des migrations. Un run approuvé ne déploie
  donc plus un changement clinique qu'il n'a pas jugé. Deux bancs couvrent ce
  changement, et tous deux rougissent sur l'ancienne comparaison.
- Au merge, le gel intégral est levé et le gel par phases entre en vigueur.
  La fiche H88, D-374 et le plan §5 portent la mise à jour datée. Aucune
  décision nouvelle, aucune migration, aucun chemin clinique modifié.
