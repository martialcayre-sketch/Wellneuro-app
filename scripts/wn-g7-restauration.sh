#!/bin/bash
# G-7 (D-289 §2) — essai de restauration d'une sauvegarde de production dans
# une base TEMPORAIRE. Se joue DANS un one-off interactif de `wellneuro`, après
# le téléchargement de la sauvegarde : procédure au `docs/RUNBOOK.md`,
# « Essai de restauration (G-7) ».
#
# Écrit dans la seule base cible (CIBLE_URL) ; lit la production en
# transactions en lecture seule. Sortie : agrégats seuls — aucune ligne,
# aucune colonne d'identité ; des messages d'erreur, la seule nature (le texte
# avant le premier « : » qui suit `pg_restore: error:`), comptée — jamais la
# suite de la ligne, ni DETAIL ni CONTEXT, qui peuvent citer une valeur.
#
# Usage : CIBLE_URL=… SAUVEGARDE_A=AAAA-MM-JJTHH:MM:SSZ \
#           bash /tmp/uploads/wn-g7-restauration.sh /tmp/g7.tar.gz
set -euo pipefail

ARCHIVE="${1:?usage : wn-g7-restauration.sh <archive.tar.gz>}"
: "${CIBLE_URL:?CIBLE_URL absente : URL de la base temporaire}"
: "${SAUVEGARDE_A:?SAUVEGARDE_A absente : date de la sauvegarde, ISO UTC}"
SOURCE_URL="${SCALINGO_POSTGRESQL_URL:?SCALINGO_POSTGRESQL_URL absente : pas un one-off de wellneuro}"
unset DATABASE_URL

# Garde 1 : la cible n'est jamais la production (hôte et base comparés).
adresse() { sed -E 's#^[a-z]+://[^@]*@([^/:?]+)[^/]*/([^?]+).*$#\1/\2#' <<<"$1"; }
if [ "$(adresse "$CIBLE_URL")" = "$(adresse "$SOURCE_URL")" ]; then
  echo "REFUS : la cible est la base de production."
  exit 1
fi

dbclient-fetcher pgsql 17 >/dev/null
export PATH="$HOME/bin:$PATH"
lire_source() { PGOPTIONS='-c default_transaction_read_only=on' psql "$SOURCE_URL" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }
lire_cible() { psql "$CIBLE_URL" -XAtq -v ON_ERROR_STOP=1 -c "$1"; }

# Garde 2 : la cible est vide.
n_cible=$(lire_cible "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')")
if [ "$n_cible" != 0 ]; then
  echo "REFUS : la cible n'est pas vide ($n_cible tables)."
  exit 1
fi
echo "cible : $(lire_cible "select 'PostgreSQL ' || current_setting('server_version')")"

TRAVAIL=/tmp/g7
rm -rf "$TRAVAIL" && mkdir -p "$TRAVAIL"
# L'archive et ses fichiers de travail s'effacent à toute sortie, échec compris.
trap 'rm -rf "$TRAVAIL" "$ARCHIVE"' EXIT
tar -xzf "$ARCHIVE" -C "$TRAVAIL"
DUMP=$(find "$TRAVAIL" -type f | head -1)
echo "archive : $(du -h "$ARCHIVE" | cut -f1) ; vidage : $(du -h "$DUMP" | cut -f1)"

debut=$(date +%s)
set +e
pg_restore --no-owner --no-privileges -d "$CIBLE_URL" "$DUMP" 2>"$TRAVAIL/restauration.err"
code=$?
set -e
duree=$(( $(date +%s) - debut ))
n_erreurs=$(grep -c '^pg_restore: error:' "$TRAVAIL/restauration.err" || true)
echo "restauration : code=$code ; durée=${duree} s ; erreurs=$n_erreurs"
sed -n 's/^pg_restore: error: \([^:]*\).*/\1/p' "$TRAVAIL/restauration.err" | sort | uniq -c | head -20 || true

# Contrôle 1 : dernière migration de la copie = celle de la production à
# l'heure de la sauvegarde.
m_copie=$(lire_cible "select migration_name from _prisma_migrations where finished_at is not null order by finished_at desc limit 1")
m_attendue=$(lire_source "select migration_name from _prisma_migrations where finished_at is not null and finished_at <= '$SAUVEGARDE_A'::timestamptz order by finished_at desc limit 1")
echo "migration : copie=$m_copie ; production à la sauvegarde=$m_attendue"

# Contrôle 2 : chaque table du schéma est présente.
liste="select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"
lire_source "$liste" | LC_ALL=C sort >"$TRAVAIL/tables.source"
lire_cible "$liste" | LC_ALL=C sort >"$TRAVAIL/tables.cible"
echo "tables : production=$(wc -l <"$TRAVAIL/tables.source" | tr -d ' ') ; copie=$(wc -l <"$TRAVAIL/tables.cible" | tr -d ' ') ; manquantes=$(comm -23 "$TRAVAIL/tables.source" "$TRAVAIL/tables.cible" | wc -l | tr -d ' ')"
comm -23 "$TRAVAIL/tables.source" "$TRAVAIL/tables.cible" | sed 's/^/  manquante : /'

# Contrôle 3 : comptes de lignes rapprochés, table par table ; un écart se lit
# contre les écritures postérieures à la sauvegarde.
egales=0
ecarts=0
while read -r t; do
  s=$(lire_source "select count(*) from public.\"$t\"")
  c=$(lire_cible "select count(*) from public.\"$t\"")
  if [ "$s" = "$c" ]; then
    egales=$((egales + 1))
  else
    ecarts=$((ecarts + 1))
    echo "  écart : $t (production − copie = $((s - c)))"
  fi
done < <(comm -12 "$TRAVAIL/tables.source" "$TRAVAIL/tables.cible")
echo "lignes : tables égales=$egales ; tables en écart=$ecarts"
echo "fin : fichiers de travail effacés à la sortie ; reste à détruire l'application temporaire (RUNBOOK)."

# Une restauration en échec ou en erreur ne sort jamais en code nul : les
# contrôles ci-dessus restent lisibles, le verdict reste au RUNBOOK.
if [ "$code" != 0 ] || [ "$n_erreurs" != 0 ]; then
  exit 1
fi
