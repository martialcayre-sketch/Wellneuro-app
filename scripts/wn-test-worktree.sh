#!/usr/bin/env bash
# Réplique locale du job CI `verify` (.github/workflows/ci.yml) dans le
# worktree courant, avec un PostgreSQL éphémère isolé par worktree.
# Ordre fail-fast — contrôles statiques d'abord, base ensuite :
#   anti-secrets → audit campagnes → prisma generate → scoring → type-check
#   → vitest → lint → PostgreSQL éphémère → migrate deploy → dérive
#   schéma↔migrations → seed → build → Playwright (Chromium + WebKit) contre
#   le build de production (`next start`), le même artefact que Vercel déploie.
#
# Gates de sûreté avant déploiement (chaîne web/scripts/vercel-build.sh —
# `migrate deploy` s'exécute en production au build Vercel) :
#   - dérive schéma↔migrations : `prisma migrate diff` compare la base
#     éphémère (construite uniquement par `migrate deploy`) à schema.prisma
#     et échoue si le schéma a évolué sans migration committée — le client
#     Prisma déployé attendrait sinon un schéma que la base n'aura jamais ;
#   - certification scoring : les 63 questionnaires restent conformes à leurs
#     fixtures certifiées (protège la logique clinique) ;
#   - e2e sur build de production : plus rapide (aucune compilation à la
#     demande) et plus fidèle (bundles React prod, prerender identique).
#
# Usage, depuis web/ de n'importe quel worktree (ou du checkout principal) :
#   npm run test:worktree               # séquence CI complète
#   npm run test:worktree -- --fast     # saute anti-secrets, audit, scoring,
#                                       # lint, build (e2e sur `next dev`)
#   npm run test:worktree -- --keep-db  # conserve la base après le run
#
# Isolation : port PostgreSQL (5500-5599) et port applicatif (3100-3199)
# dérivés du chemin du worktree, avec sondage en cas d'occupation — plusieurs
# worktrees (campagnes en parallèle) peuvent valider sans se contaminer. La
# base est recréée à chaque run (parité CI), données 100 % fictives via le seed.
#
# Divergence CI assumée : PostgreSQL Debian (17 sur trixie) vs postgres:15 en
# CI. Les migrations sont du SQL standard rejoué par `migrate deploy` ; pour
# une parité stricte, installer postgresql-15 via le dépôt PGDG et exporter
# WN_PG_BIN=/usr/lib/postgresql/15/bin.
#
# L'installation Debian crée un cluster `main` sur 5432 : sans incidence ici
# (plage 5500-5599), ne pas le supprimer.
#
# Overrides : WN_PG_PORT, WN_APP_PORT, WN_PG_BIN.
#
# Note hook Claude (.claude/hooks/block-risky-commands.mjs) : il n'inspecte que
# la ligne de commande Bash, ce script reste donc invocable sans
# WN_ALLOW_RISKY_COMMAND ; le garde-fou interne (base locale uniquement,
# identifiants jetables ci_user/wellneuro_ci) compense.
set -euo pipefail

die() { printf 'Erreur : %s\n' "$*" >&2; exit 1; }

# Chaque appel à step() clôt le chronométrage de l'étape précédente ; le
# récapitulatif final aide à repérer l'étape qui ralentit la séquence.
STEP_NAMES=()
STEP_TIMES=()
STEP_LAST=0
step() {
  local now=$SECONDS
  if ((${#STEP_NAMES[@]} > 0)); then
    STEP_TIMES+=("$((now - STEP_LAST))")
  fi
  STEP_LAST=$now
  STEP_NAMES+=("$*")
  printf '\n\033[1m── %s ──\033[0m\n' "$*"
}

recap() {
  local i
  printf 'Durées par étape :\n'
  for ((i = 0; i < ${#STEP_TIMES[@]}; i++)); do
    printf '  %3d min %02d s  %s\n' \
      "$((STEP_TIMES[i] / 60))" "$((STEP_TIMES[i] % 60))" "${STEP_NAMES[i]}"
  done
}

usage() {
  cat <<'EOF'
Usage : npm run test:worktree [-- options]   (depuis web/)
        bash scripts/wn-test-worktree.sh [options]

Réplique le job CI `verify` avec un PostgreSQL éphémère isolé par worktree.

Options :
  --fast      Saute anti-secrets, audit campagnes, certification scoring,
              lint et build (garde generate/type-check/vitest/migrate/
              dérive schéma↔migrations/seed/e2e — e2e sur `next dev`).
  --keep-db   Ne détruit pas la base à la fin ; imprime l'URL et la
              commande d'arrêt manuel.
  --help      Affiche cette aide.

Variables : WN_PG_PORT, WN_APP_PORT (forcer les ports), WN_PG_BIN
            (répertoire des binaires PostgreSQL à utiliser).
EOF
}

# ── Arguments ────────────────────────────────────────────────────────────────
FAST=0
KEEP_DB=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --fast) FAST=1 ;;
    --keep-db) KEEP_DB=1 ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; die "option inconnue : $1" ;;
  esac
  shift
done

# ── Chemins (résolus depuis le script, jamais depuis le cwd) ────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
WEB="$ROOT/web"
[[ -f "$WEB/package.json" ]] || die "web/package.json introuvable sous $ROOT — dépôt inattendu."

SLUG="$(basename "$ROOT" | tr -c 'a-zA-Z0-9_-' '_' | head -c 40)"
RUN_DIR="/tmp/wn-pg/${SLUG}-$$"
PGDATA="$RUN_DIR/data"
PGSOCK="$RUN_DIR/sock"
PGLOG="$RUN_DIR/pg.log"
PG_BIN=""
PG_STARTED=""

# ── Ports déterministes par worktree + sondage ──────────────────────────────
# /dev/tcp en sous-shell : la connexion réussit si le port est occupé.
port_free() { ! (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

find_free_port() { # $1=port de départ  $2=min  $3=max
  local p="$1" min="$2" max="$3" i
  for ((i = 0; i <= max - min; i++)); do
    if port_free "$p"; then printf '%s' "$p"; return 0; fi
    p=$(( min + (p - min + 1) % (max - min + 1) ))
  done
  return 1
}

HASH="$(printf '%s' "$ROOT" | cksum | cut -d' ' -f1)"
PG_PORT="${WN_PG_PORT:-$(find_free_port $((5500 + HASH % 100)) 5500 5599)}" \
  || die "aucun port PostgreSQL libre dans 5500-5599."
APP_PORT="${WN_APP_PORT:-$(find_free_port $((3100 + HASH % 100)) 3100 3199)}" \
  || die "aucun port applicatif libre dans 3100-3199."

# ── Provisioning one-shot (idempotent) ──────────────────────────────────────
require_sudo() { sudo -n true 2>/dev/null || die "$1"; }

ensure_postgres() {
  if [[ -n "${WN_PG_BIN:-}" ]]; then
    [[ -x "$WN_PG_BIN/initdb" ]] || die "WN_PG_BIN=$WN_PG_BIN ne contient pas initdb."
    PG_BIN="$WN_PG_BIN"
    return
  fi
  if ! compgen -G '/usr/lib/postgresql/*/bin/initdb' >/dev/null; then
    step "Installation de PostgreSQL (première exécution, ~1 min)"
    require_sudo "PostgreSQL absent et sudo indisponible — installer postgresql puis relancer."
    sudo apt-get update -qq
    sudo apt-get install -y -qq postgresql >/dev/null
  fi
  # shellcheck disable=SC2012 -- chemins système sans caractères exotiques
  PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
  [[ -n "$PG_BIN" && -x "$PG_BIN/initdb" ]] || die "binaires PostgreSQL introuvables."
}

ensure_node_modules() {
  if [[ ! -d "$WEB/node_modules" ]]; then
    step "Installation des dépendances npm (première exécution du worktree)"
    (cd "$WEB" && npm ci)
  fi
}

ensure_playwright() {
  local version marker
  version="$(node -p "require('$WEB/node_modules/@playwright/test/package.json').version")"
  marker="$HOME/.cache/ms-playwright/.wn-deps-$version"
  if [[ -f "$marker" ]]; then
    (cd "$WEB" && npx playwright install chromium webkit)
  else
    step "Installation des navigateurs Playwright + dépendances système (première exécution)"
    require_sudo "sudo requis pour les dépendances système des navigateurs Playwright."
    (cd "$WEB" && npx playwright install --with-deps chromium webkit)
    mkdir -p "$(dirname "$marker")"
    touch "$marker"
  fi
}

# ── PostgreSQL éphémère ─────────────────────────────────────────────────────
cleanup() {
  set +e
  if [[ "$KEEP_DB" == 1 && -n "$PG_STARTED" ]]; then
    printf '\nBase conservée (--keep-db) :\n  %s\n' "$DATABASE_URL"
    printf "Arrêt manuel :\n  %s -D '%s' -m fast stop && rm -rf '%s'\n" \
      "$PG_BIN/pg_ctl" "$PGDATA" "$RUN_DIR"
    return 0
  fi
  if [[ -n "$PG_STARTED" ]]; then
    "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null 2>&1
  fi
  rm -rf "$RUN_DIR"
}

init_db() {
  mkdir -p "$PGDATA" "$PGSOCK"
  # Parité POSTGRES_INITDB_ARGS de ci.yml. trust : acceptable, la base jetable
  # n'écoute que sur 127.0.0.1 et ne contient que des données fictives.
  "$PG_BIN/initdb" -D "$PGDATA" --encoding=UTF8 --locale=en_US.UTF-8 \
    --auth-local=trust --auth-host=trust --username=postgres \
    >"$RUN_DIR/initdb.log" 2>&1 \
    || { cat "$RUN_DIR/initdb.log" >&2; die "initdb a échoué."; }
}

start_pg() {
  "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$PGLOG" -w -t 30 \
    -o "-p $PG_PORT -k $PGSOCK -c listen_addresses=127.0.0.1" start >/dev/null \
    || { tail -50 "$PGLOG" >&2; die "PostgreSQL n'a pas démarré (port $PG_PORT)."; }
  PG_STARTED=1
  local i
  for ((i = 0; i < 30; i++)); do
    if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PG_PORT" -q; then return 0; fi
    sleep 0.5
  done
  tail -50 "$PGLOG" >&2
  die "PostgreSQL injoignable après démarrage (port $PG_PORT)."
}

create_db() {
  # Mêmes identifiants jetables que le service postgres de ci.yml.
  "$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U postgres -v ON_ERROR_STOP=1 -q \
    -c "CREATE ROLE ci_user LOGIN PASSWORD 'ci_password'" \
    -c "CREATE DATABASE wellneuro_ci OWNER ci_user"
}

# ── Exécution ───────────────────────────────────────────────────────────────
START=$SECONDS
printf 'Worktree : %s\nPostgreSQL : 127.0.0.1:%s   Application : 127.0.0.1:%s\n' \
  "$ROOT" "$PG_PORT" "$APP_PORT"

ensure_postgres
ensure_node_modules
ensure_playwright

trap cleanup EXIT
trap 'exit 130' INT TERM

# Parité env du job CI `verify` (ci.yml). Les exports shell priment sur tout
# .env.local (les loaders dotenv du dépôt sont tous en override:false et
# Next.js donne priorité à process.env). Seule divergence : les URLs suivent
# le port applicatif du worktree au lieu de :3000 — le webServer Playwright
# (`next dev` ou `next start` selon PLAYWRIGHT_WEB_SERVER) reçoit ce port via
# `-p`, et la variable PORT exportée ci-dessous couvre tout lancement manuel.
export DATABASE_URL="postgresql://ci_user:ci_password@localhost:${PG_PORT}/wellneuro_ci"
export NEXTAUTH_SECRET="ci-test-secret-r8-2-playwright-automation"
export NEXTAUTH_URL="http://localhost:${APP_PORT}"
export GOOGLE_CLIENT_ID="ci-placeholder"
export GOOGLE_CLIENT_SECRET="ci-placeholder"
export PLAYWRIGHT_BASE_URL="http://localhost:${APP_PORT}"
export PORT="$APP_PORT"
# Parité ressources : les runners CI ont 4 vCPU. Ce conteneur peut avoir plus
# de cœurs mais moins de RAM — sans plafond, Vitest démarre un worker jsdom
# par cœur et leur démarrage expire sous charge (« Failed to start forks
# worker »). Surchargeables si besoin.
export VITEST_MAX_FORKS="${VITEST_MAX_FORKS:-4}"
export VITEST_MAX_THREADS="${VITEST_MAX_THREADS:-4}"

# Le devcontainer exporte NODE_ENV=development globalement (remoteEnv) ; la CI
# ne définit pas NODE_ENV. Un NODE_ENV non standard pendant `next build` mélange
# les builds React dev/prod et fait planter le prerender (useContext null) —
# release_go_no_go.sh contourne déjà le même problème. On l'efface : next dev
# et next build fixent chacun la bonne valeur.
unset NODE_ENV

# Garde-fou (même esprit que wn-local-migrate.sh) : jamais de migration hors
# base locale, quelles que soient les variables héritées de l'environnement.
case "$DATABASE_URL" in
  postgresql://*@127.0.0.1:*|postgresql://*@localhost:*) ;;
  *) die "garde-fou : DATABASE_URL non locale, migrations refusées." ;;
esac

# ── Phase statique (fail-fast) : aucun de ces contrôles ne touche la base ──
# (les tests Vitest mockent tous Prisma). Une erreur de type ou un test rouge
# échoue ici sans payer initdb/migrate/seed.
if [[ "$FAST" == 0 ]]; then
  step "Contrôle anti-secrets"
  bash "$ROOT/scripts/check_no_secrets.sh"
  step "Audit des règles de campagne"
  # L'audit résout ses chemins depuis le cwd : l'exécuter depuis la racine,
  # comme en CI (npm invoque ce script depuis web/).
  (cd "$ROOT" && node scripts/wn-campaign-audit.mjs --fail-on-warning-codes \
    missing_audit_root,missing_in_mirror,extra_in_mirror,status_drift_between_roots,closed_campaign_with_open_lots,inflight_without_active_lot,idle_with_active_fields)
fi

cd "$WEB"

step "Client Prisma (generate)"
npx prisma generate

if [[ "$FAST" == 0 ]]; then
  step "Certification scoring (63 questionnaires)"
  npm run scoring-check
fi

step "Type-check"
npm run type-check

step "Tests unitaires (Vitest)"
npm run test

if [[ "$FAST" == 0 ]]; then
  step "Lint"
  npm run lint
fi

# ── Phase base de données ───────────────────────────────────────────────────
step "PostgreSQL éphémère (port $PG_PORT)"
init_db
start_pg
create_db

step "Migrations (migrate deploy)"
npx prisma migrate deploy

step "Dérive schéma ↔ migrations (migrate diff)"
# En production, seul le SQL des migrations committées est appliqué
# (web/scripts/vercel-build.sh) : si schema.prisma a évolué sans migration,
# le client Prisma déployé attendrait un schéma que la base n'aura jamais.
# La base éphémère vient d'être construite uniquement par `migrate deploy` :
# l'introspecter (--from-config-datasource lit DATABASE_URL) équivaut à
# rejouer les migrations. Échec (code 2) si elle diverge de schema.prisma.
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --exit-code \
  || die "schema.prisma ne correspond pas aux migrations committées — générer la migration manquante avant tout déploiement."

step "Seed (patients fictifs uniquement)"
npm run prisma:seed

# ── Build et E2E ────────────────────────────────────────────────────────────
if [[ "$FAST" == 0 ]]; then
  step "Build"
  npm run build
  # E2E contre le build de production tout juste produit : plus rapide (pas de
  # compilation à la demande) et plus fidèle au déploiement Vercel que next dev.
  export PLAYWRIGHT_WEB_SERVER=start
  step "Tests E2E (Playwright — build de production, Chromium + WebKit, port $APP_PORT)"
else
  step "Tests E2E (Playwright — next dev, Chromium + WebKit, port $APP_PORT)"
fi
npm run test:e2e \
  || { printf '\nRapport : %s/playwright-report/\n' "$WEB" >&2; exit 1; }

step "Terminé"
recap
printf '\nSéquence %s verte en %d min %d s (PG:%s, app:%s).\n' \
  "$([[ "$FAST" == 1 ]] && echo 'rapide' || echo 'CI complète')" \
  "$(((SECONDS - START) / 60))" "$(((SECONDS - START) % 60))" "$PG_PORT" "$APP_PORT"
