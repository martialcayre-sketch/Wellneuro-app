#!/usr/bin/env bash
# Contrôle anti-secrets. Deux modes :
#
#   (sans argument)  dépôt entier — utilisé par le CI et par test:worktree.
#   --staged         seulement les LIGNES AJOUTÉES de l'index git.
#
# Le mode --staged existe parce que le contrôle complet n'intervenait qu'en CI,
# c'est-à-dire APRÈS qu'un secret soit déjà entré dans un commit et dans
# l'historique. Scanner l'index coûte moins d'une seconde, ce qui permet de
# l'exécuter avant chaque commit plutôt qu'après.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
status=0

MODE="complet"
case "${1:-}" in
  --staged) MODE="staged" ;;
  "") ;;
  *) echo "Usage : bash scripts/check_no_secrets.sh [--staged]" >&2; exit 1 ;;
esac

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

# En mode --staged, on n'inspecte que les lignes AJOUTÉES du diff indexé : ce
# qu'on s'apprête à committer, et rien du contenu préexistant.
AJOUTS=""
if [[ "$MODE" == "staged" ]]; then
  AJOUTS="$(git diff --cached --unified=0 -- . \
    ':(exclude)package-lock.json' ':(exclude)*.lock' 2>/dev/null \
    | grep -E '^\+' | grep -vE '^\+\+\+' || true)"
fi

check_pattern() {
  local label="$1"
  local pattern="$2"
  local trouve
  if [[ "$MODE" == "staged" ]]; then
    trouve="$(printf '%s' "$AJOUTS" | grep -nE "$pattern" || true)"
    [[ -n "$trouve" ]] || return 0
    printf '%s\n' "$trouve"
  else
    grep -rnE "${GREP_EXCLUDES[@]}" "$pattern" . 2>/dev/null || return 0
  fi
  echo "ERREUR: motif suspect détecté: $label" >&2
  status=1
}

check_pattern "SHEET_ID"          "SHEET_ID[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{25,}"
check_pattern "ANTHROPIC_API_KEY" "ANTHROPIC_API_KEY[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "CLAUDE_API_KEY"    "CLAUDE_API_KEY[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "client_secret"     "client_secret[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{10,}"
check_pattern "private_key"       "private_key[[:space:]]*[:=][[:space:]]*['\"]?-----BEGIN"

if [[ "$status" -eq 0 ]]; then
  if [[ "$MODE" == "staged" ]]; then
    echo "OK: aucun secret évident dans les lignes indexées."
  else
    echo "OK: aucun secret évident détecté."
  fi
fi
exit "$status"
