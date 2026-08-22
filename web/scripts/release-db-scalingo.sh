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
# workflow lit les logs du one-off et ne connaît que ces deux mots, LIÉS AU
# RUN par `id=` (un one-off antérieur encore dans la fenêtre de logs ne
# peut pas passer pour le run courant) — toute fin sans sentinelle est un
# échec (fail-closed côté workflow).
set -euo pipefail

ID="${WN_RELEASE_ID:-inconnu}"

echec() {
  echo "WN_RELEASE_DB_ECHEC id=$ID etape=$1"
  exit 1
}

# SEULE l'URL injectée par l'add-on est acceptée. MIGRATE_DATABASE_URL est
# ignorée À DESSEIN : jamais repointée au cutover, elle a fait appliquer la
# purge #746 sur Supabase — la variable qui a causé l'incident ne remonte
# pas dans la chaîne qui le corrige. L'hôte cible est nommé dans les logs
# (sans identifiants) : l'angle mort qui a laissé durer l'incident était
# précisément qu'aucune ligne ne disait quelle base était migrée.
[ -n "${SCALINGO_POSTGRESQL_URL:-}" ] || echec "url_addon_absente"
unset MIGRATE_DATABASE_URL
export DATABASE_URL="$SCALINGO_POSTGRESQL_URL"
HOTE="${DATABASE_URL##*@}"
HOTE="${HOTE%%/*}"
echo "→ Base cible (add-on Scalingo) : $HOTE"

# L'image doit porter EXACTEMENT les migrations du commit approuvé : si un
# commit plus récent a été déployé entre l'approbation et ce one-off, ses
# migrations partiraient sans approbation. Le workflow calcule l'empreinte
# sur le commit approuvé ; la recalculer ICI, dans l'image, au moment
# d'écrire, ferme cette course.
[ -n "${WN_MIGRATIONS_EMPREINTE:-}" ] || echec "empreinte_absente"
EMPREINTE_IMAGE=$(ls -1 prisma/migrations | LC_ALL=C sort | sha256sum | cut -d' ' -f1)
if [ "$EMPREINTE_IMAGE" != "$WN_MIGRATIONS_EMPREINTE" ]; then
  echo "→ Empreinte de l'image : $EMPREINTE_IMAGE ≠ approuvée : $WN_MIGRATIONS_EMPREINTE."
  echo "  L'image déployée ne porte pas exactement les migrations approuvées"
  echo "  (déploiement plus récent ?). Relancer release-db depuis le commit de tête."
  echec "empreinte_migrations"
fi

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

echo "WN_RELEASE_DB_OK id=$ID"
