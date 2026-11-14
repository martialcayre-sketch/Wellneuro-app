### Release-db sans approbation : le lot de gardes (D-520 §8, 2026-11-14)

- **Sonde release-db.** Une migration de `main` qu'aucun run de `main` n'atteste
  « appliquée » (vert, ou rouge après ses deux attestations) gèle toute PR qui
  touche un chemin déclencheur. C'est le cas après un run annulé, rouge avant
  écriture ou d'état inconnu (§3 bis). Seul passe le revert pur, qui retire
  tous les fichiers de tout le reliquat. Une PR qui ajoute une migration
  attend le constat de la précédente : une ligne `WN_CONSTAT_RELEASE_DB run=<id>`
  sur sa PR, écrite par un auteur du dépôt après la fin d'un run de `main`
  attesté « appliqué » dont le commit porte cette migration (§3). Une lecture
  impossible gèle en code 2. Le conseil des deux runs dit « annuler »
  (`gh run cancel`), et non plus « rejeter ». Le constat ne gèle que la
  migration suivante. Une PR clinique passe dès que la migration est attestée
  appliquée, comme le prévoit la lettre du §8.
- **Job `resume` de `release-db.yml`.** La borne se lit trois fois, à 10 s
  d'intervalle. Une borne inconnue arrête un run de push avant
  l'environnement, mais laisse continuer un dispatch : le responsable a retenu
  l'option recommandée de la question `20261114-1459-d`. Un diff en échec
  arrête toujours le run. Dans les deux cas, le résumé est écrit d'abord.
- **Environnements.** Le nouveau banc `scripts/workflows-environnements.test.mjs`
  parcourt tous les workflows. Il refuse `release-db` et `deploy-production`
  hors des trois jobs admis, sous toutes les formes : casse, carte, bloc, flux,
  expression, ancre, échappement. Il refuse aussi `workflow_call` dans les deux
  workflows admis.
- **Chemins gelés.** `web/package.json` et `web/package-lock.json` rejoignent
  les `CHEMINS_GELES`, car ils fixent le CLI Prisma de l'image (§7).
- Les crochets `protect-wellneuro-files` et `guard-supabase-mcp` ne parlent
  plus d'une release « approuvée ». Le second reçoit son premier banc.
  `db-prisma.md`, `pr-revue-et-release-db.md`, `RUNBOOK.md` (étape 4) et
  `WORKFLOW_DEVELOPPEMENT.md` disent la période transitoire jusqu'au geste du
  §6, ainsi que la ligne de constat.
