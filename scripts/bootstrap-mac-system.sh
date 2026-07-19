#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOTSTRAP_REPO_SCRIPT="$ROOT_DIR/scripts/bootstrap-mac.sh"
INSTALL_VSCODE=1
SKIP_REPO_BOOTSTRAP=0
VERCEL_ENVIRONMENT="development"
SKIP_ENV_PULL=0

usage() {
  cat <<'EOF'
Usage: bash scripts/bootstrap-mac-system.sh [options]

Options:
  --skip-vscode             N'installe pas VS Code
  --skip-repo-bootstrap     Prépare seulement la machine, sans lancer le bootstrap du dépôt
  --skip-env-pull           Transmis au bootstrap du dépôt
  --environment <env>       Environnement Vercel transmis au bootstrap du dépôt
  --help                    Affiche cette aide
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --skip-vscode)
      INSTALL_VSCODE=0
      shift
      ;;
    --skip-repo-bootstrap)
      SKIP_REPO_BOOTSTRAP=1
      shift
      ;;
    --skip-env-pull)
      SKIP_ENV_PULL=1
      shift
      ;;
    --environment)
      if [ "$#" -lt 2 ]; then
        echo "Erreur: --environment attend une valeur." >&2
        exit 1
      fi
      VERCEL_ENVIRONMENT="$2"
      shift 2
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
  printf '\n[%s] %s\n' "wellneuro-mac-setup" "$1"
}

require_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    echo "Ce script est réservé à macOS." >&2
    exit 1
  fi
}

ensure_xcode_cli() {
  if ! xcode-select -p >/dev/null 2>&1; then
    echo "Les outils de ligne de commande Apple sont requis." >&2
    echo "Lance d'abord: xcode-select --install" >&2
    exit 1
  fi
}

ensure_homebrew() {
  if ! command -v brew >/dev/null 2>&1; then
    info "Installation de Homebrew"
    NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [ -x /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
}

load_homebrew_env() {
  if command -v brew >/dev/null 2>&1; then
    if [ -x /opt/homebrew/bin/brew ]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [ -x /usr/local/bin/brew ]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
}

ensure_brew_package() {
  local package="$1"
  if ! brew list "$package" >/dev/null 2>&1; then
    brew install "$package"
  fi
}

ensure_brew_cask() {
  local cask="$1"
  if ! brew list --cask "$cask" >/dev/null 2>&1; then
    brew install --cask "$cask"
  fi
}

ensure_node_22() {
  ensure_brew_package node@22
  local brew_prefix
  brew_prefix="$(brew --prefix node@22)"
  export PATH="$brew_prefix/bin:$PATH"

  local node_major
  node_major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "$node_major" != "22" ]; then
    echo "Node 22.x requis après installation Homebrew. Version détectée: $(node -v)" >&2
    echo "Ajoute $brew_prefix/bin en tête de PATH dans ton profil shell." >&2
    exit 1
  fi
}

ensure_vercel_cli() {
  if ! command -v vercel >/dev/null 2>&1; then
    npm install -g vercel
  fi
}

require_macos
ensure_xcode_cli
ensure_homebrew
load_homebrew_env

info "1/6 Mise à jour Homebrew"
brew update

info "2/6 Installation des outils de base"
ensure_brew_package git
ensure_brew_package gh
ensure_node_22

if [ "$INSTALL_VSCODE" -eq 1 ]; then
  info "3/6 Installation de VS Code"
  ensure_brew_cask visual-studio-code
else
  info "3/6 Installation de VS Code ignorée (--skip-vscode)"
fi

info "4/6 Installation de Vercel CLI"
ensure_vercel_cli

info "5/6 Rappels de connexion"
echo "Si nécessaire : gh auth login"
echo "Si nécessaire : vercel login"

if [ "$SKIP_REPO_BOOTSTRAP" -eq 1 ]; then
  info "6/6 Bootstrap dépôt ignoré (--skip-repo-bootstrap)"
  echo "Lance ensuite : bash scripts/bootstrap-mac.sh --environment $VERCEL_ENVIRONMENT"
  exit 0
fi

info "6/6 Bootstrap du dépôt"
bootstrap_args=(--environment "$VERCEL_ENVIRONMENT")
if [ "$SKIP_ENV_PULL" -eq 1 ]; then
  bootstrap_args+=(--skip-env-pull)
fi

bash "$BOOTSTRAP_REPO_SCRIPT" "${bootstrap_args[@]}"