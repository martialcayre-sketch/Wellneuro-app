#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
VERCEL_ENVIRONMENT="development"
SKIP_ENV_PULL=0

usage() {
  cat <<'EOF'
Usage: bash scripts/bootstrap-mac.sh [options]

Options:
  --environment <development|preview|production>  Environnement Vercel pour env pull (default: development)
  --skip-env-pull                                 N'exécute pas vercel env pull
  --help                                          Affiche cette aide
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --environment)
      if [ "$#" -lt 2 ]; then
        echo "Erreur: --environment attend une valeur." >&2
        exit 1
      fi
      VERCEL_ENVIRONMENT="$2"
      shift 2
      ;;
    --skip-env-pull)
      SKIP_ENV_PULL=1
      shift
      ;;
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

info "1/6 Vérification du lien Vercel"
if [ "$SKIP_ENV_PULL" -eq 0 ] && [ ! -f .vercel/project.json ]; then
  echo "Projet Vercel non lié pour ce checkout."
  echo "Lance d'abord: cd web && npx vercel login && npx vercel link"
  exit 1
fi

info "2/6 Installation des dépendances"
npm install

info "3/6 Génération du client Prisma"
npm run prisma:generate

if [ "$SKIP_ENV_PULL" -eq 0 ]; then
  info "4/6 Récupération des variables Vercel ($VERCEL_ENVIRONMENT)"
  if [ -f .env.local ]; then
    echo "web/.env.local existe déjà ; env pull ignoré pour éviter un écrasement."
    echo "Si tu veux rafraîchir les variables: cd web && npx vercel env pull .env.local --environment=$VERCEL_ENVIRONMENT"
  else
    npx vercel env pull .env.local --environment="$VERCEL_ENVIRONMENT"
  fi
else
  info "4/6 env pull ignoré (--skip-env-pull)"
fi

info "5/6 Validation statique"
npm run setup:check

info "6/6 Prochaines commandes"
echo "cd web && npm run dev"
echo "bash scripts/check_no_secrets.sh"
echo "Bootstrap Mac terminé."