#!/usr/bin/env bash
# Application des migrations Prisma en hook de release — pendant Scalingo du
# build Vercel. Invoqué par le Procfile : `postdeploy: npm run db:deploy`.
#
# Modèles de déploiement, un par plateforme :
# - Vercel (serverless, pas de hook postdeploy) : les migrations s'appliquent
#   HORS du build, via le workflow GitHub Actions `release-db` — le build ne migre
#   plus (voir docs/DEPLOIEMENT_RELEASE_DB.md).
# - Scalingo lance ce script APRÈS le build, sur un conteneur postdeploy dédié :
#   si `migrate deploy` échoue, Scalingo annule le déploiement et la production
#   reste sur la release précédente (équivalent du « build en échec » Vercel).
#
# `migrate deploy` n'invente jamais de SQL : il applique uniquement les
# migrations committées (relues en PR). Le gate humain reste la revue de PR.
#
# URL cible, par ordre de préférence :
#   DATABASE_URL            — cas général (dev, CI, ou alias posé côté Scalingo) ;
#   SCALINGO_POSTGRESQL_URL — injectée par l'add-on PostgreSQL Scalingo.
# MIGRATE_DATABASE_URL n'est PLUS lue (D-086) : jamais repointée au cutover,
# elle a fait migrer la mauvaise base — la variable de l'incident ne reste
# prioritaire sur aucune app, staging compris (vérifié non posée le
# 2026-08-22). Un pooler transaction intercalé un jour se traitera par
# décision, pas par une variable dormante.
#
# PRÉCONDITION : ne JAMAIS provisionner une base VIERGE par ce seul script. Il
# n'applique que le schéma (migrate deploy) — pas les données. Les données de
# référence (C5 CIQUAL, chargées one-shot hors migration sur Vercel) et les
# données patients arrivent par la migration de données (dump/restore) ; l'import
# C5 n'est pas rejoué ici. Sur une base restaurée par dump, migrate deploy est
# idempotent et ne fait que rattraper d'éventuelles migrations manquantes.
set -euo pipefail

# Porte de gouvernance (2026-08-22, suite au constat « release-db pointait
# encore Supabase après le cutover ») : quand ce drapeau est posé sur l'app,
# le postdeploy NE migre PLUS — les migrations n'atteignent la base que par
# le workflow release-db (approbation humaine), qui les exécute en one-off
# dans cette même image. Posé sur la production seule ; le staging garde
# l'auto-migration. Contrepartie assumée : un déploiement portant une
# migration tourne contre l'ancien schéma jusqu'à l'approbation — c'est le
# modèle Vercel d'origine (« PR séparées, ou drapeau éteint »).
if [ "${WN_MIGRATIONS_PAR_RELEASE_DB:-}" = "1" ]; then
  echo "→ Postdeploy sans migration : WN_MIGRATIONS_PAR_RELEASE_DB=1 —"
  echo "  les migrations passent par le workflow release-db (approbation)."
  exit 0
fi

DB_URL="${DATABASE_URL:-${SCALINGO_POSTGRESQL_URL:-}}"
if [ -z "$DB_URL" ]; then
  echo "❌ Aucune URL de base (DATABASE_URL / SCALINGO_POSTGRESQL_URL) : migrations refusées." >&2
  exit 1
fi
export DATABASE_URL="$DB_URL"

echo "→ Application des migrations Prisma (migrate deploy)…"
npx prisma migrate deploy
