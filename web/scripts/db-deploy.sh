#!/usr/bin/env bash
# Application des migrations Prisma en hook de release — pendant Scalingo du
# build Vercel. Invoqué par le Procfile : `postdeploy: npm run db:deploy`.
#
# Modèles de déploiement, un par plateforme :
# - Vercel (serverless, pas de hook postdeploy) applique les migrations au BUILD
#   via scripts/vercel-build.sh, gardé sur VERCEL_ENV=production.
# - Scalingo lance ce script APRÈS le build, sur un conteneur postdeploy dédié :
#   si `migrate deploy` échoue, Scalingo annule le déploiement et la production
#   reste sur la release précédente (équivalent du « build en échec » Vercel).
#
# `migrate deploy` n'invente jamais de SQL : il applique uniquement les
# migrations committées (relues en PR). Le gate humain reste la revue de PR.
#
# URL cible, par ordre de préférence :
#   MIGRATE_DATABASE_URL    — si un jour un pooler transaction est intercalé au
#                             runtime (migrate deploy exige une connexion directe) ;
#   DATABASE_URL            — cas général (dev, CI, ou alias posé côté Scalingo) ;
#   SCALINGO_POSTGRESQL_URL — injectée par l'add-on PostgreSQL Scalingo.
#
# PRÉCONDITION : ne JAMAIS provisionner une base VIERGE par ce seul script. Il
# n'applique que le schéma (migrate deploy) — pas les données. Les données de
# référence (C5 CIQUAL, chargées one-shot hors migration sur Vercel) et les
# données patients arrivent par la migration de données (dump/restore) ; l'import
# C5 n'est pas rejoué ici. Sur une base restaurée par dump, migrate deploy est
# idempotent et ne fait que rattraper d'éventuelles migrations manquantes.
set -euo pipefail

DB_URL="${MIGRATE_DATABASE_URL:-${DATABASE_URL:-${SCALINGO_POSTGRESQL_URL:-}}}"
if [ -z "$DB_URL" ]; then
  echo "❌ Aucune URL de base (MIGRATE_DATABASE_URL / DATABASE_URL / SCALINGO_POSTGRESQL_URL) : migrations refusées." >&2
  exit 1
fi
export DATABASE_URL="$DB_URL"

echo "→ Application des migrations Prisma (migrate deploy)…"
npx prisma migrate deploy
