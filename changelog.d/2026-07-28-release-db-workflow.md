### Workflow de release DB — écriture prod hors du build Vercel (2026-07-28)

Nouveau workflow GitHub Actions `release-db.yml`, déclenché à la main et gaté par
l'environnement protégé `production` (required reviewers). Il applique les
migrations Prisma et l'import de nomenclature NABM (CB-02a) **hors** du build
applicatif, reprenant la séquence que `web/scripts/vercel-build.sh` exécutait au
build : préflight lecture seule → `migrate deploy` → advisors Supabase → import →
contrat.

Motivation : le build appliquait ces écritures et pouvait réussir en laissant la
base « en retard » (`MIGRATE_DATABASE_URL` absente → avertissement, pas échec).
Le workflow rend l'écriture explicite et gatée par une approbation humaine ; un
lot ultérieur allègera `vercel-build.sh` pour que le build cesse d'écrire.

Deux modes : `migrate-only` et `import-cb`. L'import C5 CIQUAL n'est
volontairement pas câblé (son garde `VERCEL_ENV` ne tient pas hors Vercel ; C5 est
déjà importé et re-semé par dump côté Scalingo). Additif et inerte tant que
l'environnement `production` et ses secrets ne sont pas provisionnés : coexiste
avec le build sans rien changer au déploiement actuel. Runbook :
`docs/DEPLOIEMENT_RELEASE_DB.md`.
