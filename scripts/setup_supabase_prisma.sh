#!/usr/bin/env bash
set -euo pipefail

# Setup script for Supabase + Prisma migrations on direct Postgres port 5432.
# Targets Debian/Ubuntu environments and avoids printing secrets.

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
ENV_FILE="web/.env.production.local"
RUN_DB_PULL="1"
INSTALL_DOCKER="1"

usage() {
  cat <<'EOF'
Usage:
  bash scripts/setup_supabase_prisma.sh [options]

Options:
  --project-ref <ref>        Supabase project ref (example: ohnbmypinamzzfhqymlt)
  --env-file <path>          Env file to read DATABASE_URL from (default: web/.env.production.local)
  --skip-db-pull             Skip supabase db pull
  --skip-docker-install      Skip Docker installation step
  -h, --help                 Show this help

What this script does:
  1) Installs Docker (Debian/Ubuntu) if missing
  2) Verifies Docker daemon access
  3) Verifies Supabase CLI + authentication
  4) Links local project to Supabase
  5) Tests direct DB connectivity on db.<ref>.supabase.co:5432
  6) Runs Prisma migrate deploy using a derived direct URL on 5432
  7) Optionally runs supabase db pull (requires Docker)
EOF
}

log() {
  printf '[setup] %s\n' "$*"
}

warn() {
  printf '[warn] %s\n' "$*" >&2
}

die() {
  printf '[error] %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-ref)
        [[ $# -ge 2 ]] || die "--project-ref requires a value"
        PROJECT_REF="$2"
        shift 2
        ;;
      --env-file)
        [[ $# -ge 2 ]] || die "--env-file requires a value"
        ENV_FILE="$2"
        shift 2
        ;;
      --skip-db-pull)
        RUN_DB_PULL="0"
        shift
        ;;
      --skip-docker-install)
        INSTALL_DOCKER="0"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown argument: $1"
        ;;
    esac
  done
}

repo_root() {
  local dir
  dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  printf '%s\n' "$dir"
}

install_docker_debian_ubuntu() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed"
    return 0
  fi

  [[ "$INSTALL_DOCKER" == "1" ]] || die "Docker is missing and --skip-docker-install was set"

  [[ -f /etc/os-release ]] || die "Cannot detect OS"
  # shellcheck disable=SC1091
  . /etc/os-release
  if [[ "${ID:-}" != "debian" && "${ID:-}" != "ubuntu" ]]; then
    die "Automatic Docker install supports Debian/Ubuntu only"
  fi

  require_cmd sudo
  require_cmd curl
  require_cmd gpg

  log "Installing Docker using official repository"
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings

  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL "https://download.docker.com/linux/${ID}/gpg" | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  fi
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  local arch codename
  arch="$(dpkg --print-architecture)"
  codename="${VERSION_CODENAME:-}"
  [[ -n "$codename" ]] || die "Unable to detect distro codename"

  echo "deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${codename} stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable --now docker

  if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER" || true
    warn "User added to docker group. You may need to re-open your shell."
  fi
}

check_docker() {
  if docker info >/dev/null 2>&1; then
    log "Docker daemon reachable"
    return 0
  fi

  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    log "Docker daemon reachable with sudo"
    return 0
  fi

  die "Docker installed but daemon unreachable"
}

extract_project_ref_from_env() {
  local db_line db_url ref
  db_line="$(grep '^DATABASE_URL=' "$ENV_FILE" || true)"
  [[ -n "$db_line" ]] || return 1
  db_url="${db_line#DATABASE_URL=}"

  ref="$(DATABASE_URL="$db_url" node -e 'const raw=process.env.DATABASE_URL||""; try { const u = new URL(raw); const m=(u.username||"").match(/^postgres\.([a-z0-9]{20})$/); process.stdout.write(m?m[1]:""); } catch { process.stdout.write(""); }')"
  [[ -n "$ref" ]] || return 1

  printf '%s\n' "$ref"
}

derive_direct_url_from_pooler() {
  local db_line db_url direct_url
  db_line="$(grep '^DATABASE_URL=' "$ENV_FILE" || true)"
  [[ -n "$db_line" ]] || die "DATABASE_URL not found in $ENV_FILE"
  db_url="${db_line#DATABASE_URL=}"

  direct_url="$(DATABASE_URL="$db_url" node -e 'const raw=process.env.DATABASE_URL||""; if(!raw){process.exit(2)}; const u=new URL(raw); const ref=((u.username||"").match(/^postgres\.([a-z0-9]{20})$/)||[])[1]||""; if(!ref){process.exit(3)}; u.hostname=`db.${ref}.supabase.co`; u.port="5432"; u.username="postgres"; u.searchParams.delete("pgbouncer"); if(!u.searchParams.has("sslmode")) u.searchParams.set("sslmode","require"); process.stdout.write(u.toString());')" || die "Unable to derive direct URL from DATABASE_URL"

  printf '%s\n' "$direct_url"
}

run_prisma_migrate_with_fallback() {
  local direct_url pooler_line pooler_url out_file
  direct_url="$1"

  pooler_line="$(grep '^DATABASE_URL=' "$ENV_FILE" || true)"
  [[ -n "$pooler_line" ]] || die "DATABASE_URL not found in $ENV_FILE"
  pooler_url="${pooler_line#DATABASE_URL=}"

  out_file="$(mktemp)"

  log "Running Prisma migrate deploy on direct 5432 endpoint"
  if DATABASE_URL="$direct_url" npm run prisma:migrate:deploy >"$out_file" 2>&1; then
    cat "$out_file"
    rm -f "$out_file"
    return 0
  fi

  cat "$out_file"

  if grep -q 'P1001\|Network is unreachable\|Can.t reach database server' "$out_file"; then
    warn "Direct 5432 connection failed; retrying on pooler with advisory lock disabled"
    if DATABASE_URL="$pooler_url" PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 npm run prisma:migrate:deploy >"$out_file" 2>&1; then
      cat "$out_file"
      rm -f "$out_file"
      return 0
    fi
    cat "$out_file"
  fi

  rm -f "$out_file"
  return 1
}

main() {
  parse_args "$@"

  local root
  root="$(repo_root)"
  cd "$root"

  if [[ "$ENV_FILE" != /* ]]; then
    ENV_FILE="$root/$ENV_FILE"
  fi

  [[ -f "$ENV_FILE" ]] || die "Env file not found: $ENV_FILE"

  require_cmd npm
  require_cmd node
  require_cmd grep

  if [[ "$RUN_DB_PULL" == "1" ]]; then
    install_docker_debian_ubuntu
    check_docker
  else
    log "Skipping Docker checks because --skip-db-pull is enabled"
  fi

  require_cmd supabase

  log "Checking Supabase authentication"
  if ! supabase projects list >/dev/null 2>&1; then
    die "Supabase CLI is not authenticated. Run: supabase login"
  fi

  if [[ -z "$PROJECT_REF" ]]; then
    if PROJECT_REF="$(extract_project_ref_from_env)"; then
      log "Project ref inferred from DATABASE_URL username"
    else
      die "Project ref missing. Use --project-ref <ref> or set SUPABASE_PROJECT_REF"
    fi
  fi

  log "Linking project ref: ${PROJECT_REF}"
  cd "$root/web"
  supabase link --project-ref "$PROJECT_REF" >/dev/null

  local direct_host
  direct_host="db.${PROJECT_REF}.supabase.co"
  log "Testing direct DB connectivity: ${direct_host}:5432"
  if command -v nc >/dev/null 2>&1; then
    if ! nc -vz "$direct_host" 5432; then
      warn "Direct TCP connectivity check failed; migration will attempt fallback strategy"
    fi
  else
    warn "nc not found, skipping raw TCP test"
  fi

  log "Deriving direct migration URL from DATABASE_URL"
  local direct_url
  direct_url="$(derive_direct_url_from_pooler)"

  run_prisma_migrate_with_fallback "$direct_url"

  if [[ "$RUN_DB_PULL" == "1" ]]; then
    log "Running supabase db pull"
    npm run supabase:db:pull
  else
    log "Skipping supabase db pull"
  fi

  log "Setup complete"
}

main "$@"
