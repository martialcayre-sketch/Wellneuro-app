#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
status=0
check_pattern() {
  local label="$1"
  local pattern="$2"
  local extra_args=(${3:-})
  if rg -n --hidden --glob '!*.git/**' --glob '!scripts/check_no_secrets.sh' "${extra_args[@]}" "$pattern" .; then
    echo "ERREUR: motif suspect détecté: $label" >&2
    status=1
  fi
}
if rg -n --hidden --glob '!*.git/**' --glob '!scripts/check_no_secrets.sh' "SHEET_ID.*[A-Za-z0-9_-]{25,}" .; then
  echo "ERREUR: SHEET_ID potentiellement écrit en dur." >&2
  status=1
fi
check_pattern "ANTHROPIC_API_KEY" "ANTHROPIC_API_KEY\s*[:=]\s*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "CLAUDE_API_KEY" "CLAUDE_API_KEY\s*[:=]\s*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "client_secret" "client_secret\s*[:=]\s*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "private_key" "private_key\s*[:=]\s*['\"]?-----BEGIN"
if rg -n --hidden --glob '!*.git/**' --glob '!scripts/check_no_secrets.sh' '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' . | rg -v 'martialcayre@gmail\.com'; then
  echo "ERREUR: email non autorisé détecté. N'utiliser que des données fictives." >&2
  status=1
fi
if [[ "$status" -eq 0 ]]; then
  echo "OK: aucun secret évident détecté."
fi
exit "$status"
