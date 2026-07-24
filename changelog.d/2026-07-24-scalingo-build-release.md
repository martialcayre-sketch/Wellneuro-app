### Ajouté

- **Échafaudage de déploiement Scalingo** (préparation migration HDS, exigence 1
  de G-TRUST-04). `web/Procfile` (`web` + `postdeploy`), script `db:deploy`
  (`web/scripts/db-deploy.sh` = `prisma migrate deploy` en hook postdeploy) et
  script `start:scalingo` (`next start -p $PORT`). Aucun impact Vercel :
  `vercel-build.sh`, `start` et le CI sont inchangés — ces chemins ne sont
  empruntés que par Scalingo. Le runtime Node reste piloté par la plateforme
  (pas de pin `engines` dans ce lot, pour ne pas changer le Node de Vercel).
