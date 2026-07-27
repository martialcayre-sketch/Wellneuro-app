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

# Un secret ne s'écrit pas toujours `CLE=valeur`. En JSON — le format d'une clé
# de compte de service Google — l'identifiant porte des guillemets, et le
# guillemet fermant s'intercale avant le deux-points. Les motifs exigeaient que
# le séparateur suive l'identifiant DIRECTEMENT : ils rataient donc la forme la
# plus courante d'une clé privée, dans les deux modes. Mesuré le 2026-07-27 sur
# un `secrets/wn-drive-sa.json` que rien n'ignorait par ailleurs.
#
# Ce séparateur admet donc les guillemets de part et d'autre. Une variante plus
# permissive (`[^A-Za-z0-9_]{0,4}`) attrapait autant mais a été écartée par la
# mesure : 11 faux positifs sur le dépôt, tous dans de la prose documentaire
# citant des noms de variables. Celle-ci en produit zéro.
#
# `scripts/check_no_secrets.test.mjs` échoue si l'un de ces motifs cesse
# d'attraper ce qu'il annonce attraper.
SEP="['\"]*[[:space:]]*[:=][[:space:]]*['\"]*"

check_pattern "SHEET_ID"          "SHEET_ID${SEP}[A-Za-z0-9_-]{25,}"
check_pattern "ANTHROPIC_API_KEY" "ANTHROPIC_API_KEY${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "CLAUDE_API_KEY"    "CLAUDE_API_KEY${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "client_secret"     "client_secret${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "private_key"       "private_key${SEP}-----BEGIN"

if [[ "$status" -eq 0 ]]; then
  if [[ "$MODE" == "staged" ]]; then
    echo "OK: aucun secret évident dans les lignes indexées."
  else
    echo "OK: aucun secret évident détecté."
  fi
fi
exit "$status"
