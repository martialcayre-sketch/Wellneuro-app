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
  c5_ciqual_import_ref="C5-LOT02-IMPORT-MC-2026-07-18-v1"
  if [ -n "${WN_C5_CIQUAL_IMPORT_CONFIRMATION:-}" ] && [ -z "${MIGRATE_DATABASE_URL:-}" ]; then
    echo "❌ Import C5 LOT-02 demandé sans MIGRATE_DATABASE_URL : déploiement refusé." >&2
    exit 1
  fi

  if [ -n "${MIGRATE_DATABASE_URL:-}" ]; then
    echo "→ Préflight C5 LOT-02 en lecture seule…"
    DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma db execute \
      --file prisma/checks/c5_ciqual_production_preflight.sql
    echo "→ Application des migrations sur la base de production (migrate deploy)…"
    DATABASE_URL="$MIGRATE_DATABASE_URL" npx prisma migrate deploy

    if [ -n "${WN_C5_CIQUAL_IMPORT_CONFIRMATION:-}" ]; then
      if [ "$WN_C5_CIQUAL_IMPORT_CONFIRMATION" != "$c5_ciqual_import_ref" ]; then
        echo "❌ Confirmation d'import C5 LOT-02 invalide : import refusé." >&2
        exit 1
      fi

      echo "→ Advisors Supabase avant import C5 LOT-02…"
      npx --yes supabase@2.109.1 db advisors \
        --db-url "$MIGRATE_DATABASE_URL" \
        --type all \
        --level warn \
        --fail-on warn \
        --output-format json

      echo "→ Import append-only C5 LOT-02 confirmé…"
      npm run c5:ciqual:apply -- \
        --confirmation "$c5_ciqual_import_ref"
    fi
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
