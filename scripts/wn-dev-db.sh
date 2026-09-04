#!/usr/bin/env bash
# Base PostgreSQL de DEV locale, PERSISTANTE — remplace l'ancien DATABASE_URL
# Supabase mort dans .env.local (Supabase est décommissionné, D-080 : plus
# personne ne doit y pointer, y compris en dev).
#
# UN SEUL SERVEUR, UNE BASE PAR WORKTREE. Le serveur (Homebrew postgresql@15,
# parité stricte avec le service CI et avec `test:worktree`) tourne comme
# service brew — démarré une fois, survit aux redémarrages, partagé par tous
# les worktrees de ce Mac. Chaque worktree obtient sa PROPRE base, nommée par
# le même hash du chemin que `wn-test-worktree.sh` (`cksum` de la racine git) :
# deux sessions qui travaillent en parallèle sur deux worktrees ne se
# marchent jamais dessus, sans faire tourner deux serveurs.
#
# CE SCRIPT N'ÉCRIT JAMAIS .env.local : il imprime le DATABASE_URL à coller
# (ou à poser une fois, à la main, comme n'importe quel secret de dev) — la
# décision de le poser appartient à qui lance le script, pas à lui.
#
# macOS uniquement (poste de dev Mac) — pas de branche Linux, contrairement à
# wn-test-worktree.sh qui doit aussi tourner en CI.
#
# Usage :
#   bash scripts/wn-dev-db.sh                  # démarre/retrouve, imprime l'URL
#   bash scripts/wn-dev-db.sh --migrate         # + prisma migrate deploy
#   bash scripts/wn-dev-db.sh --migrate --seed  # + patients fictifs (seed.ts)
#   bash scripts/wn-dev-db.sh --migrate --seed --demo
#       # + dossiers de démonstration locale (anamnèse, dossier en attente,
#       #   dossier clos) — mêmes identités fictives, identifiants distincts.
set -euo pipefail

die() { printf 'Erreur : %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || die "macOS uniquement — poste de dev Mac."

MIGRATE=0
SEED=0
DEMO=0
for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=1 ;;
    --seed) SEED=1 ;;
    # Dossiers de démonstration locale, JAMAIS semés par défaut : le CI et les
    # E2E dépendent des états vides des trois dossiers ordinaires. Voir
    # `web/prisma/seedDemo.ts`.
    --demo) DEMO=1 ;;
    *) die "Option inconnue : $arg (attendu : --migrate, --seed, --demo)" ;;
  esac
done

ROOT="$(git rev-parse --show-toplevel)" || die "Pas dans un dépôt git."
HASH="$(printf '%s' "$ROOT" | cksum | cut -d' ' -f1)"
DB_NAME="wellneuro_dev_${HASH}"
PG_PORT=5432

# Même correctif que wn-test-worktree.sh (changelog 2026-07-29) : le
# postmaster Homebrew échoue au démarrage sans locale valide dans
# l'environnement (shells non interactifs, agents). N'écrase rien de posé.
if [[ -z "${LC_ALL:-}" && -z "${LANG:-}" ]]; then
  export LC_ALL=en_US.UTF-8
fi

PREFIX="$(brew --prefix postgresql@15 2>/dev/null || true)"
[[ -n "$PREFIX" && -x "$PREFIX/bin/pg_isready" ]] \
  || die "postgresql@15 absent — installer avec : brew install postgresql@15 (parité CI)."
PG_BIN="$PREFIX/bin"

if ! "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT" -q 2>/dev/null; then
  echo "Démarrage du service postgresql@15 (brew services, persistant)..." >&2
  brew services start postgresql@15 >/dev/null

  ready=0
  for _ in $(seq 1 30); do
    if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT" -q 2>/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  [[ "$ready" -eq 1 ]] || die "PostgreSQL n'a pas démarré (port $PG_PORT) — voir : brew services info postgresql@15"
fi

if ! "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -d postgres -tAc \
     "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1; then
  echo "Création de la base $DB_NAME (worktree : $ROOT)..." >&2
  "$PG_BIN/createdb" -h 127.0.0.1 -p "$PG_PORT" "$DB_NAME"
fi

# UTILISATEUR EXPLICITE, TOUJOURS — sans lui, `pg`/Prisma retombe sur un
# défaut (`PGUSER`/`USER`, parfois absent d'un sous-processus) qui peut ne
# désigner aucun rôle du cluster (P1010 « denied on database (not available) »
# constaté ici avec un rôle nommé, alors que `psql` sans `-U` s'en tire en
# retombant sur le rôle système). Le rôle Homebrew par défaut est l'utilisateur
# macOS courant, jamais `postgres` (ce rôle n'existe pas sur ce cluster).
DATABASE_URL="postgresql://$(whoami)@127.0.0.1:${PG_PORT}/${DB_NAME}"

if [[ "$MIGRATE" -eq 1 ]]; then
  echo "Migrations (prisma migrate deploy)..." >&2
  ( cd "$ROOT/web" && DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy )
fi

if [[ "$SEED" -eq 1 ]]; then
  echo "Seed (patients fictifs uniquement)..." >&2
  ( cd "$ROOT/web" && DATABASE_URL="$DATABASE_URL" WN_SEED_DEMO="$DEMO" \
      node prisma/runWithAlias.js prisma/seed.ts )
fi

echo "$DATABASE_URL"
