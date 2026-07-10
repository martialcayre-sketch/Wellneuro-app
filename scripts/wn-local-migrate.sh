#!/usr/bin/env bash
# Applique les migrations Prisma du dépôt sur la base Supabase LOCALE uniquement.
# Garde-fou : refuse toute URL qui ne pointe pas sur 127.0.0.1 / localhost.
# Usage : bash scripts/wn-local-migrate.sh [status|deploy]
set -euo pipefail

ACTION="${1:-status}"
LOCAL_DB_URL="${WN_LOCAL_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"

case "$LOCAL_DB_URL" in
  postgresql://*@127.0.0.1:*|postgresql://*@localhost:*) ;;
  *)
    echo "Refusé : ce script n'accepte qu'une base locale (127.0.0.1/localhost)." >&2
    exit 1
    ;;
esac

case "$ACTION" in
  status|deploy) ;;
  *)
    echo "Usage : bash scripts/wn-local-migrate.sh [status|deploy]" >&2
    exit 1
    ;;
esac

cd "$(dirname "$0")/../web"
DATABASE_URL="$LOCAL_DB_URL" npx prisma migrate "$ACTION"
