#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
status=0

GREP_EXCLUDES=(
  --exclude-dir='.git'
  --exclude-dir='node_modules'
  --exclude-dir='.next'
  --exclude-dir='generated'
  --exclude-dir='pgdata'
  --exclude='check_no_secrets.sh'
  --exclude='.env*.local*'
  --exclude='package-lock.json'
  --exclude='*.lock'
)

check_pattern() {
  local label="$1"
  local pattern="$2"
  if grep -rnE "${GREP_EXCLUDES[@]}" "$pattern" . 2>/dev/null; then
    echo "ERREUR: motif suspect détecté: $label" >&2
    status=1
  fi
}

if grep -rnE "${GREP_EXCLUDES[@]}" "SHEET_ID.*[A-Za-z0-9_-]{25,}" . 2>/dev/null; then
  echo "ERREUR: SHEET_ID potentiellement écrit en dur." >&2
  status=1
fi

check_pattern "ANTHROPIC_API_KEY" "ANTHROPIC_API_KEY[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "CLAUDE_API_KEY"    "CLAUDE_API_KEY[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "client_secret"     "client_secret[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "private_key"       "private_key[[:space:]]*[:=][[:space:]]*['\"]?-----BEGIN"

if [[ "$status" -eq 0 ]]; then
  echo "OK: aucun secret évident détecté."
fi
exit "$status"
