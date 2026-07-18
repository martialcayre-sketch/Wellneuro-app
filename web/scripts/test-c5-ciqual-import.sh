#!/usr/bin/env bash
set -euo pipefail

# Contrat d'intégration C5 LOT-02 sur la base PostgreSQL éphémère de la CI.
# Le script ne doit jamais recevoir une URL de production.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL absente : test d'intégration C5 impossible." >&2
  exit 1
fi
if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Ce test destructif est interdit en Production." >&2
  exit 1
fi
if [ "${WN_C5_CIQUAL_DESTRUCTIVE_TEST:-}" != "wellneuro_ci" ]; then
  echo "Opt-in destructif absent : WN_C5_CIQUAL_DESTRUCTIVE_TEST=wellneuro_ci requis." >&2
  exit 1
fi

database_target=$(node <<'NODE'
let databaseUrl;
try {
  databaseUrl = new URL(process.env.DATABASE_URL);
} catch {
  process.exit(1);
}
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));

if (!allowedHosts.has(databaseUrl.hostname) || databaseName !== 'wellneuro_ci') {
  process.exit(1);
}

process.stdout.write(`${databaseUrl.hostname}/${databaseName}`);
NODE
) || {
  echo "Cible refusée : seuls localhost/wellneuro_ci, 127.0.0.1/wellneuro_ci ou ::1/wellneuro_ci sont autorisés." >&2
  exit 1
}
echo "Contrat destructif borné à la base éphémère : $database_target"

ciqual_dir=$(mktemp -d /tmp/wn-c5-ciqual-ci.XXXXXX)
cleanup() {
  rm -rf "$ciqual_dir"
}
trap cleanup EXIT

composition="$ciqual_dir/compo_2025_11_03.xml"
constituents="$ciqual_dir/const_2025_11_03.xml"
confirmation="C5-LOT02-IMPORT-MC-2026-07-18-v1"

curl --fail --silent --show-error --location \
  --connect-timeout 15 --max-time 120 --retry 2 \
  'https://entrepot.recherche.data.gouv.fr/api/access/datafile/666249' \
  --output "$composition"
curl --fail --silent --show-error --location \
  --connect-timeout 15 --max-time 60 --retry 2 \
  'https://entrepot.recherche.data.gouv.fr/api/access/datafile/666246' \
  --output "$constituents"

node prisma/runWithAlias.js prisma/validateC5FoodCompassDistribution.ts \
  --source "$composition" \
  --const-source "$constituents"

apply_import() {
  WN_C5_CIQUAL_IMPORT_CONFIRMATION="$confirmation" \
  MIGRATE_DATABASE_URL="$DATABASE_URL" \
  npm run c5:ciqual:apply -- \
    --confirmation "$confirmation" \
    --allow-non-production \
    --source "$composition" \
    --const-source "$constituents"
}

npx prisma db execute \
  --file prisma/checks/c5_ciqual_import_partial_fixture.sql >/dev/null
if apply_import >"$ciqual_dir/partial.log" 2>&1; then
  echo "Une cible partielle a été acceptée à tort." >&2
  exit 1
fi
grep -q 'Import append-only refusé' "$ciqual_dir/partial.log"

npx prisma db execute \
  --file prisma/checks/c5_ciqual_import_reset_fixture.sql >/dev/null
apply_import >"$ciqual_dir/first.log"
grep -q '"inserted": 55744' "$ciqual_dir/first.log"
grep -q '"idempotentNoop": false' "$ciqual_dir/first.log"

apply_import >"$ciqual_dir/second.log"
grep -q '"inserted": 0' "$ciqual_dir/second.log"
grep -q '"idempotentNoop": true' "$ciqual_dir/second.log"

npx prisma db execute \
  --file prisma/checks/c5_ciqual_import_corrupt_fixture.sql >/dev/null
if apply_import >"$ciqual_dir/corrupt.log" 2>&1; then
  echo "Une cible corrompue a été acceptée à tort." >&2
  exit 1
fi
grep -q 'Ligne cible incohérente' "$ciqual_dir/corrupt.log"

npx prisma db execute \
  --file prisma/checks/c5_ciqual_import_reset_fixture.sql >/dev/null
echo "C5 LOT-02 import contract: OK"
