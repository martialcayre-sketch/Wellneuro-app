#!/usr/bin/env bash
set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
STATE_DIR="${HOME}/Library/Application Support/agent-keep-awake"
CAFFEINATE_PID_FILE="$STATE_DIR/caffeinate.pid"
WATCHER_PID_FILE="$STATE_DIR/watcher.pid"

usage() {
  cat <<'EOF'
Usage: bash scripts/mac-keep-awake.sh <start [system|full]|stop|status|help>

Commandes:
  start    Lance le maintien d'activite uniquement si le Mac est sur secteur
  stop     Arrete le maintien d'activite et nettoie l'etat local
  status   Affiche l'etat courant et la source d'alimentation
  help     Affiche cette aide

Notes:
  - Modes start:
      * system (defaut): empeche seulement la veille systeme, veille ecran autorisee
      * full: empeche la veille systeme et la veille ecran
  - Le script s'appuie sur caffeinate et coupe automatiquement la protection si le secteur est retire.
  - Il empeche uniquement la veille systeme (la veille de l'ecran reste autorisee).
  - Il n'empeche pas la mise en veille due a la fermeture du capot sans configuration materielle compatible.
EOF
}

info() {
  printf '[keep-awake] %s\n' "$1"
}

require_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    echo "Ce script est reserve a macOS." >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Commande requise absente: $1" >&2
    exit 1
  fi
}

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

read_pid_file() {
  local file_path="$1"
  if [ -f "$file_path" ]; then
    tr -d '[:space:]' < "$file_path"
  fi
}

cleanup_state() {
  rm -f "$CAFFEINATE_PID_FILE" "$WATCHER_PID_FILE"
}

cleanup_state_if_owner() {
  local expected_caffeinate_pid="$1"
  local expected_watcher_pid="$2"
  local current_caffeinate_pid current_watcher_pid

  current_caffeinate_pid="$(read_pid_file "$CAFFEINATE_PID_FILE")"
  current_watcher_pid="$(read_pid_file "$WATCHER_PID_FILE")"

  if [[ "$current_caffeinate_pid" = "$expected_caffeinate_pid" ]]; then
    rm -f "$CAFFEINATE_PID_FILE"
  fi

  if [[ "$current_watcher_pid" = "$expected_watcher_pid" ]]; then
    rm -f "$WATCHER_PID_FILE"
  fi
}

cleanup_stale_state() {
  local caffeinate_pid watcher_pid
  caffeinate_pid="$(read_pid_file "$CAFFEINATE_PID_FILE")"
  watcher_pid="$(read_pid_file "$WATCHER_PID_FILE")"

  if [[ -n "$caffeinate_pid" ]] && ! is_pid_running "$caffeinate_pid"; then
    rm -f "$CAFFEINATE_PID_FILE"
  fi

  if [[ -n "$watcher_pid" ]] && ! is_pid_running "$watcher_pid"; then
    rm -f "$WATCHER_PID_FILE"
  fi
}

power_source() {
  pmset -g batt | awk -F"'" '/Now drawing from/ { print $2; exit }'
}

is_on_ac_power() {
  [ "$(power_source)" = "AC Power" ]
}

stop_keep_awake() {
  cleanup_stale_state

  local watcher_pid caffeinate_pid
  watcher_pid="$(read_pid_file "$WATCHER_PID_FILE")"
  caffeinate_pid="$(read_pid_file "$CAFFEINATE_PID_FILE")"

  if [[ -n "$watcher_pid" ]] && is_pid_running "$watcher_pid"; then
    kill "$watcher_pid" >/dev/null 2>&1 || true
  fi

  if [[ -n "$caffeinate_pid" ]] && is_pid_running "$caffeinate_pid"; then
    kill "$caffeinate_pid" >/dev/null 2>&1 || true
  fi

  cleanup_state
  info "Protection anti-veille arretee."
}

watch_ac_power() {
  local caffeinate_pid="$1"
  local watcher_pid
  watcher_pid="$$"
  trap 'kill "$caffeinate_pid" >/dev/null 2>&1 || true; cleanup_state_if_owner "$caffeinate_pid" "$watcher_pid"' EXIT INT TERM

  while is_pid_running "$caffeinate_pid"; do
    if ! is_on_ac_power; then
      info "Secteur retire, arret automatique de la protection anti-veille."
      kill "$caffeinate_pid" >/dev/null 2>&1 || true
      break
    fi
    sleep 15
  done
}

start_keep_awake() {
  local mode="${1:-system}"
  local caffeinate_flags

  case "$mode" in
    system)
      caffeinate_flags="-i"
      ;;
    full)
      caffeinate_flags="-dims"
      ;;
    *)
      echo "Mode invalide: $mode (utiliser system ou full)." >&2
      exit 1
      ;;
  esac

  cleanup_stale_state

  local watcher_pid caffeinate_pid
  watcher_pid="$(read_pid_file "$WATCHER_PID_FILE")"
  caffeinate_pid="$(read_pid_file "$CAFFEINATE_PID_FILE")"

  if [[ -n "$watcher_pid" ]] && is_pid_running "$watcher_pid" && [[ -n "$caffeinate_pid" ]] && is_pid_running "$caffeinate_pid"; then
    info "Protection anti-veille deja active."
    return 0
  fi

  if [[ -n "$watcher_pid" ]] && is_pid_running "$watcher_pid" && { [[ -z "$caffeinate_pid" ]] || ! is_pid_running "$caffeinate_pid"; }; then
    kill "$watcher_pid" >/dev/null 2>&1 || true
    rm -f "$WATCHER_PID_FILE" "$CAFFEINATE_PID_FILE"
    watcher_pid=""
    caffeinate_pid=""
  fi

  if [[ -n "$caffeinate_pid" ]] && is_pid_running "$caffeinate_pid"; then
    nohup "$SCRIPT_PATH" __watch "$caffeinate_pid" >/dev/null 2>&1 &
    local recovered_watcher_pid="$!"
    printf '%s\n' "$recovered_watcher_pid" > "$WATCHER_PID_FILE"
    info "Watcher restaure pour la protection anti-veille deja active."
    info "PID caffeinate: $caffeinate_pid"
    info "PID watcher: $recovered_watcher_pid"
    return 0
  fi

  if ! is_on_ac_power; then
    echo "Refus de demarrer: le Mac n'est pas branche sur secteur." >&2
    exit 1
  fi

  ensure_state_dir

  nohup caffeinate $caffeinate_flags >/dev/null 2>&1 &
  caffeinate_pid="$!"
  printf '%s\n' "$caffeinate_pid" > "$CAFFEINATE_PID_FILE"

  nohup "$SCRIPT_PATH" __watch "$caffeinate_pid" >/dev/null 2>&1 &
  local new_watcher_pid="$!"
  printf '%s\n' "$new_watcher_pid" > "$WATCHER_PID_FILE"

  info "Protection anti-veille activee sur secteur (mode: $mode)."
  info "PID caffeinate: $caffeinate_pid"
  info "PID watcher: $new_watcher_pid"
}

status_keep_awake() {
  cleanup_stale_state

  local source watcher_pid caffeinate_pid
  local mode="inconnu"
  local command_line=""
  source="$(power_source)"
  watcher_pid="$(read_pid_file "$WATCHER_PID_FILE")"
  caffeinate_pid="$(read_pid_file "$CAFFEINATE_PID_FILE")"

  if [[ -n "$caffeinate_pid" ]] && is_pid_running "$caffeinate_pid"; then
    command_line="$(ps -p "$caffeinate_pid" -o command= 2>/dev/null || true)"
    if printf '%s' "$command_line" | grep -q -- ' -dims'; then
      mode="full"
    elif printf '%s' "$command_line" | grep -q -- ' -i'; then
      mode="system"
    fi
  fi

  if [[ -n "$watcher_pid" ]] && is_pid_running "$watcher_pid"; then
    info "Etat: actif"
    info "Mode: $mode"
    info "Source d'alimentation: ${source:-inconnue}"
    info "PID caffeinate: ${caffeinate_pid:-inconnu}"
    info "PID watcher: $watcher_pid"
  else
    info "Etat: inactif"
    info "Source d'alimentation: ${source:-inconnue}"
  fi
}

main() {
  local action="${1:-help}"
  local mode="${2:-system}"

  require_macos
  require_command caffeinate
  require_command pmset

  case "$action" in
    start)
      start_keep_awake "$mode"
      ;;
    stop)
      stop_keep_awake
      ;;
    status)
      status_keep_awake
      ;;
    help|-h|--help)
      usage
      ;;
    __watch)
      if [ "$#" -lt 2 ]; then
        echo "Usage interne invalide: __watch <caffeinate_pid>" >&2
        exit 1
      fi
      watch_ac_power "$2"
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
