#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_URL="https://app.wellneuro.fr"
SKIP_HTTP=0

usage() {
  cat <<'EOF'
Usage: bash scripts/release_go_no_go.sh [--url <https://app.wellneuro.fr>] [--skip-http]

Contrôles exécutés:
1) Anti-secrets
2) Type-check TypeScript
3) Build Next.js en mode production (NODE_ENV=production)
4) Smoke HTTP sur l'URL de production (optionnel via --skip-http)

Ce script ne remplace pas la validation visuelle praticien en session Google réelle.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      APP_URL="${2:-}"
      if [[ -z "$APP_URL" ]]; then
        echo "ERREUR: valeur manquante pour --url" >&2
        exit 2
      fi
      shift 2
      ;;
    --skip-http)
      SKIP_HTTP=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "ERREUR: argument inconnu: $1" >&2
      usage
      exit 2
      ;;
  esac
done

FAILED=0

run_step() {
  local label="$1"
  shift

  echo ""
  echo "==> $label"
  if "$@"; then
    echo "OK: $label"
  else
    echo "KO: $label" >&2
    FAILED=1
  fi
}

check_http_status() {
  local path="$1"
  local accepted_regex="$2"
  local full_url="${APP_URL%/}$path"
  local code

  code="$(curl -sS -o /dev/null -w "%{http_code}" "$full_url" || true)"
  if [[ "$code" =~ $accepted_regex ]]; then
    echo "OK: $path -> HTTP $code"
    return 0
  fi

  echo "KO: $path -> HTTP $code (attendu: $accepted_regex)" >&2
  return 1
}

run_step "Scan anti-secrets" bash scripts/check_no_secrets.sh
run_step "Type-check" bash -lc 'cd web && npm run type-check'
run_step "Build production" bash -lc 'cd web && NODE_ENV=production npm run build'

if [[ "$SKIP_HTTP" -eq 0 ]]; then
  echo ""
  echo "==> Smoke HTTP ($APP_URL)"
  if ! check_http_status "/login" "^200$"; then
    FAILED=1
  fi
  if ! check_http_status "/" "^(200|30[1278])$"; then
    FAILED=1
  fi
else
  echo ""
  echo "==> Smoke HTTP ignoré (--skip-http)"
fi

echo ""
echo "==> Validation manuelle obligatoire"
echo "- Vérifier visuellement les écrans praticien en session Google réelle"
echo "- Vérifier le parcours patient réel minimal (ou patient fictif autorisé)"

if [[ "$FAILED" -ne 0 ]]; then
  echo ""
  echo "VERDICT: NO-GO (au moins un contrôle en échec)" >&2
  exit 1
fi

echo ""
echo "VERDICT: GO technique (sous réserve validation visuelle praticien)"
