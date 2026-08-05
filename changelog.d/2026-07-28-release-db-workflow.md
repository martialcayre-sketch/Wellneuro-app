### Workflow de release DB — écriture prod hors du build Vercel (2026-07-28)

Nouveau workflow GitHub Actions `release-db.yml`, déclenché à la main et gaté par
l'environnement protégé `release-db` (required reviewers). Il applique les
migrations Prisma et l'import de nomenclature NABM (CB-02a) **hors** du build
applicatif, reprenant la séquence que `web/scripts/vercel-build.sh` exécutait au
build : préflight lecture seule → `migrate deploy` → advisors Supabase → import.
Aucun contrat de catalogue n'est rejoué après l'import : les invariants
structurels sont vérifiés **dans** la transaction d'import, et le contrat
`cb_biologie_catalogue_v1.sql` (barrière D-003) reste joué en CI sur base
éphémère, pas sur la production.

Motivation : le build appliquait ces écritures et pouvait réussir en laissant la
base « en retard » (`MIGRATE_DATABASE_URL` absente → avertissement, pas échec).
Le workflow rend l'écriture explicite et gatée par une approbation humaine ;
l'allègement de `vercel-build.sh`, qui fait cesser l'écriture au build, est
livré **dans cette même release** (voir la bascule ci-dessus).

Deux modes : `migrate-only` et `import-cb`. L'import C5 CIQUAL n'est
volontairement pas câblé (son garde `VERCEL_ENV` ne tient pas hors Vercel ; C5 est
déjà importé et re-semé par dump côté Scalingo). Le workflow reste inerte tant
que l'environnement `release-db` et ses secrets ne sont pas provisionnés — et
comme la bascule livrée dans la même release retire l'écriture du build, ce
provisionnement est un **prérequis de merge**, pas une option. Runbook :
`docs/DEPLOIEMENT_RELEASE_DB.md`.
