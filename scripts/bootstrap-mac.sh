#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"

usage() {
  cat <<'EOF'
Usage: bash scripts/bootstrap-mac.sh [options]

Options:
  --help    Affiche cette aide
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Option inconnue: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

info() {
  printf '\n[%s] %s\n' "wellneuro-bootstrap" "$1"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Commande requise absente: $1" >&2
    exit 1
  fi
}

if [ ! -d "$WEB_DIR" ]; then
  echo "Répertoire web introuvable: $WEB_DIR" >&2
  exit 1
fi

if [ "$(uname -s)" != "Darwin" ]; then
  info "Avertissement: script prévu pour macOS. Poursuite autorisée sur $(uname -s)."
fi

require_command git
require_command node
require_command npm
require_command npx
require_command bash

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" != "22" ]; then
  echo "Node 22.x requis. Version détectée: $(node -v)" >&2
  exit 1
fi

cd "$WEB_DIR"

info "1/5 Installation des dépendances"
npm install

info "2/5 Génération du client Prisma"
npm run prisma:generate

info "3/5 Vérification de web/.env.local"
if [ -f .env.local ]; then
  echo "web/.env.local présent ; il n'est jamais modifié par ce script."
else
  echo "web/.env.local absent. Crée-le à la main (jamais committé) :"
  echo "- DATABASE_URL vers ta base Postgres locale de développement ;"
  echo "- autres variables : voir docs/claude/REGLES_CRITIQUES.md."
fi

info "4/5 Validation statique"
npm run setup:check

info "5/5 Prochaines commandes"
echo "cd web && npm run dev"
echo "bash scripts/check_no_secrets.sh"
echo "Bootstrap Mac terminé."
