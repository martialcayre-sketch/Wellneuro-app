### Release-db sans approbation humaine, migrations comprises (D-520, 2026-11-14)

- **D-520** amende D-087 : un run `release-db` n'attend plus de clic humain.
  La porte devient le merge d'une PR de migration, qui exige l'avis Codex P0
  déposé (D-505 §4) et le GO de `wn-reviewer` sur sa tête. La file suit
  ensuite le run : sentinelle liée au run, première ligne des déploiements,
  constat par conteneur. Une migration à la fois, à toute heure : aucune plage
  horaire (question `20261114-1340-d`). L'environnement garde sa restriction
  à `main` et son minuteur de 5 min.
- Restent humains : la demande d'écrire une migration et sa confirmation, le
  SQL destructif, toute correction de données, la sortie d'un run rouge, le
  rejet d'un run coincé et le `workflow_dispatch`.
- `release-db.yml`, `CLAUDE.md`, `db-prisma.md`, `pr-revue-et-release-db.md`,
  `REGLES_PR_MERGE.md`, `POLITIQUE_REVUE.md`, `DEPLOIEMENT_RELEASE_DB.md`,
  `RUNBOOK.md`, `WORKFLOW_DEVELOPPEMENT.md` et le §5 du plan sont mis en
  cohérence. Dans `release-db.yml`, seuls les commentaires et le texte du
  résumé changent. Les PR qui touchent `release-db.yml`, ce que son run
  exécute ou un job `environment: release-db` passent P0.
- Le gel par phases de D-374 et la sonde release-db ont été relus et ne
  changent pas. Une fois les relecteurs retirés, la phase 1 ne dure plus que
  le minuteur.
- Une migration non appliquée, après un run annulé ou rouge avant
  écriture, gèle les chemins déclencheurs jusqu'à son revert ou sa reprise
  (D-520 §3 bis). Seule l'annulation (`gh run cancel`) arrête un run.
- Le retrait des relecteurs requis de l'environnement viendra après le lot
  de gardes `release-db-sans-approbation-2` (D-520 §8 : sonde, `resume`,
  environnements, chemins gelés), par un geste distinct et daté (§6).
  D'ici là, l'intégrateur approuve sous la délégation du 2026-11-14.
