#!/usr/bin/env bash
# Corps de la release DB, exécuté EN ONE-OFF dans l'image Scalingo de
# production (workflow release-db, après approbation humaine). Depuis le
# cutover du 2026-08-22, la base HDS n'est pas exposée à Internet : GitHub
# Actions ne peut pas s'y connecter directement — ce script tourne donc à
# l'intérieur de la plateforme, où l'add-on injecte l'URL.
#
# Les quatre préflights lecture seule (BEGIN READ ONLY … ROLLBACK dans les
# fichiers) sont ceux que le workflow jouait à l'ère Supabase, inchangés,
# puis `migrate deploy` applique les migrations committées. Les sentinelles
# WN_RELEASE_DB_OK / WN_RELEASE_DB_ECHEC sont le PROTOCOLE de sortie : le
# workflow lit les logs du one-off et ne connaît que ces deux mots — toute
# fin sans sentinelle est un échec (fail-closed côté workflow).
set -euo pipefail

echec() {
  echo "WN_RELEASE_DB_ECHEC etape=$1"
  exit 1
}

DB_URL="${MIGRATE_DATABASE_URL:-${DATABASE_URL:-${SCALINGO_POSTGRESQL_URL:-}}}"
[ -n "$DB_URL" ] || echec "url_absente"
export DATABASE_URL="$DB_URL"

echo "→ Préflight C5 CIQUAL (lecture seule)…"
npx prisma db execute --file prisma/checks/c5_ciqual_production_preflight.sql || echec "preflight_c5"

echo "→ Préflight packs ↔ registre relationnel (lecture seule)…"
npx prisma db execute --file prisma/checks/packs_registre_coherence_v1.sql || echec "preflight_packs"

echo "→ Préflight socle pgvector RAG (lecture seule)…"
npx prisma db execute --file prisma/checks/rag_pgvector_structure_v1.sql || echec "preflight_pgvector"

echo "→ Préflight fraîcheur des claims épinglés (lecture seule)…"
npx prisma db execute --file prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql || echec "preflight_claims"

echo "→ Migrations Prisma (migrate deploy)…"
npx prisma migrate deploy || echec "migrate_deploy"

echo "WN_RELEASE_DB_OK"
