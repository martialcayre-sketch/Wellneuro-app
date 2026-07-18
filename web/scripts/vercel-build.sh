#!/usr/bin/env bash
# Build Vercel — applique les migrations Prisma en production avant le build.
#
# Chaîne : PR relue et CI verte → merge sur main → build Vercel → ce script.
# `migrate deploy` n'invente jamais de SQL : il applique uniquement les
# migrations committées (relues en PR). Le gate humain reste la revue de PR.
#
# MIGRATE_DATABASE_URL (variable Vercel, scope Production uniquement) : URL
# Supabase en session mode (port 5432) — l'URL runtime passe par le pooler en
# mode transaction, que `migrate deploy` ne supporte pas.
#
# Sécurité :
# - Jamais en preview : garde stricte sur VERCEL_ENV=production.
# - Variable absente : on avertit bruyamment mais on ne bloque pas le
#   déploiement (le code tolère une base en retard — dégradation gracieuse) ;
#   l'écart est visible dans les logs de build.
# - Migration en échec : build en échec → la production reste sur le
#   déploiement précédent.
set -euo pipefail

if [ "${VERCEL_ENV:-}" = "production" ]; then
  if [ -n "${MIGRATE_DATABASE_URL:-}" ]; then
    echo "→ Préflight C5 LOT-02 en lecture seule…"
    DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma db execute \
      --file prisma/checks/c5_ciqual_production_preflight.sql
    echo "→ Application des migrations sur la base de production (migrate deploy)…"
    DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma migrate deploy
  else
    echo "⚠️  MIGRATE_DATABASE_URL absente : migrations NON appliquées." >&2
    echo "⚠️  La base de production peut être en retard sur le code déployé." >&2
    echo "⚠️  Créer la variable (scope Production) puis redéployer." >&2
  fi
else
  echo "→ Environnement ${VERCEL_ENV:-local} : pas d'application de migrations."
fi

npm run prisma:generate
next build
