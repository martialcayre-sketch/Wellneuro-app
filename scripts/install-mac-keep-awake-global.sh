#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_SCRIPT="$ROOT_DIR/scripts/mac-keep-awake.sh"
DEFAULT_COPILOT_PROMPTS_DIR="$HOME/Library/Application Support/Code/User/prompts"
CLAUDE_SKILL_DIR="$HOME/.claude/skills/keep-awake"
CODEX_SKILL_DIR="$HOME/.codex/skills/keep-awake"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
STATE_DIR="$HOME/Library/Application Support/agent-keep-awake"
LAUNCH_AGENT_LABEL="com.wellneuro.agent-keep-awake"
LAUNCH_AGENT_PATH="$LAUNCH_AGENTS_DIR/$LAUNCH_AGENT_LABEL.plist"

usage() {
  cat <<'EOF'
Usage: bash scripts/install-mac-keep-awake-global.sh <install|uninstall|launchagent-install|launchagent-enable|launchagent-disable|status|help>

Commandes:
  install               Installe la commande globale et les wrappers Claude/Copilot/Codex
  uninstall             Retire la commande globale, les wrappers et desactive le LaunchAgent si present
  launchagent-install   Ecrit le LaunchAgent utilisateur optionnel
  launchagent-enable    Charge le LaunchAgent utilisateur
  launchagent-disable   Decharge le LaunchAgent utilisateur
  status                Affiche l'etat des installations globales
  help                  Affiche cette aide

Notes:
  - Le LaunchAgent lance `agent-keep-awake start` a l'ouverture de session.
  - La protection reste limitee au secteur.
  - `start system` (defaut) empeche seulement la veille systeme et laisse la veille ecran active.
  - `start full` empeche la veille systeme et la veille ecran.
  - Elle n'empeche pas la veille due au capot ferme.
EOF
}

info() {
  printf '[keep-awake-install] %s\n' "$1"
}

require_macos() {
  if [ "$(uname -s)" != "Darwin" ]; then
    echo "Ce script est reserve a macOS." >&2
    exit 1
  fi
}

require_source_script() {
  if [ ! -x "$SOURCE_SCRIPT" ]; then
    echo "Script source introuvable ou non executable: $SOURCE_SCRIPT" >&2
    exit 1
  fi
}

global_bin_dir() {
  local candidate
  for candidate in /opt/homebrew/bin /usr/local/bin; do
    if [ -d "$candidate" ] && [ -w "$candidate" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  candidate="$HOME/.local/bin"
  mkdir -p "$candidate"
  printf '%s\n' "$candidate"
}

global_command_path() {
  printf '%s/agent-keep-awake\n' "$(global_bin_dir)"
}

ensure_dir() {
  mkdir -p "$1"
}

write_claude_skill() {
  local command_path="$1"
  ensure_dir "$CLAUDE_SKILL_DIR"
  cat > "$CLAUDE_SKILL_DIR/SKILL.md" <<EOF
---
description: Utilise la commande globale agent-keep-awake pour demarrer, arreter ou verifier la protection anti-veille du Mac sur secteur, en mode system ou full.
argument-hint: "start [system|full] | stop | status"
---

# Keep Awake

Utilise ce skill quand l'utilisateur demande d'eviter la mise en veille du Mac, de maintenir alive une session remote control, ou de verifier si la protection anti-veille est active.

## Regles

- Utiliser uniquement la commande globale $command_path avec l'argument approprie.
- Commandes autorisees : start [system|full], stop, status.
- Ne jamais modifier pmset, les reglages energie systeme ou un fichier .env.
- Rappeler si utile que la protection ne s'applique que sur secteur, que `start system` laisse la veille ecran active, que `start full` la bloque, et que la veille due au capot ferme n'est pas neutralisee.

## Action

Si l'intention est claire, executer directement l'une de ces commandes :

- $command_path start
- $command_path start system
- $command_path start full
- $command_path stop
- $command_path status

Si l'intention n'est pas claire, demander seulement si l'utilisateur veut start system, start full, stop ou status.
EOF
}

write_codex_skill() {
  local command_path="$1"
  ensure_dir "$CODEX_SKILL_DIR"
  cat > "$CODEX_SKILL_DIR/SKILL.md" <<EOF
---
name: keep-awake
description: Use the global command agent-keep-awake to start, stop, or inspect Mac anti-sleep protection while on AC power with explicit system/full modes.
---

# Keep Awake

Use this skill when the user wants to prevent sleep on wall power during remote control, or check whether anti-sleep protection is active.

## Rules

- Use only $command_path with one of: start system, start full, stop, status.
- Do not edit pmset, system energy settings, or any secret file.
- Mention when relevant that this only applies on AC power, that `start system` allows display sleep, that `start full` blocks display sleep, and that it does not override lid-close sleep constraints.

## Workflow

1. Infer whether the user wants start system, start full, stop, or status.
2. Run exactly one of these commands:
  - $command_path start
  - $command_path start system
  - $command_path start full
  - $command_path stop
  - $command_path status
3. Report the command result succinctly.

If intent is ambiguous, ask only which of start system, start full, stop, or status is wanted.
EOF
}

write_copilot_prompt() {
  local command_path="$1"
  local prompts_dir="${VSCODE_USER_PROMPTS_FOLDER:-$DEFAULT_COPILOT_PROMPTS_DIR}"
  ensure_dir "$prompts_dir"
  cat > "$prompts_dir/keep-awake.prompt.md" <<EOF
---
name: Garder le Mac eveille
description: Use when controlling the global Mac anti-sleep command for remote control sessions, with modes system or full, and actions start, stop, or status.
agent: agent
tools: [execute]
argument-hint: "start [system|full] | stop | status"
---

Utilise la commande globale $command_path pour piloter la protection anti-veille du Mac.

Regles :
- N'utiliser que start system, start full, stop ou status.
- Ne jamais modifier pmset, les reglages energie de macOS ou des fichiers sensibles.
- Rappeler si necessaire que la protection fonctionne seulement sur secteur, que start system laisse la veille ecran active, que start full la bloque, et ne contourne pas la veille du capot ferme.

Si l'intention est claire, execute directement l'une des commandes suivantes :
- $command_path start
- $command_path start system
- $command_path start full
- $command_path stop
- $command_path status

Si l'intention n'est pas claire, demande seulement si l'utilisateur veut start system, start full, stop ou status.
EOF
}

write_launch_agent() {
  local command_path="$1"
  ensure_dir "$LAUNCH_AGENTS_DIR"
  ensure_dir "$STATE_DIR"

  cat > "$LAUNCH_AGENT_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LAUNCH_AGENT_LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$command_path</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$STATE_DIR/launchagent.out.log</string>
  <key>StandardErrorPath</key>
  <string>$STATE_DIR/launchagent.err.log</string>
</dict>
</plist>
EOF
}

symlink_command() {
  local target_path="$1"
  local link_path="$2"
  ln -sfn "$target_path" "$link_path"
}

install_globals() {
  require_source_script

  local bin_dir command_path
  bin_dir="$(global_bin_dir)"
  command_path="$bin_dir/agent-keep-awake"

  symlink_command "$SOURCE_SCRIPT" "$command_path"
  symlink_command "$command_path" "$bin_dir/claude-keep-awake"
  symlink_command "$command_path" "$bin_dir/copilot-keep-awake"
  symlink_command "$command_path" "$bin_dir/codex-keep-awake"

  write_claude_skill "$command_path"
  write_codex_skill "$command_path"
  write_copilot_prompt "$command_path"

  info "Commande globale installee: $command_path"
  info "Wrappers disponibles: claude-keep-awake, copilot-keep-awake, codex-keep-awake"
  if ! printf '%s' ":$PATH:" | grep -Fq ":$bin_dir:"; then
    info "Ajoute $bin_dir a PATH pour un usage direct dans tous les shells."
  fi
}

launchagent_install() {
  require_source_script
  write_launch_agent "$(global_command_path)"
  info "LaunchAgent ecrit: $LAUNCH_AGENT_PATH"
}

launchagent_enable() {
  local command_path
  command_path="$(global_command_path)"

  if [ ! -f "$LAUNCH_AGENT_PATH" ]; then
    echo "LaunchAgent absent. Lance d'abord: bash scripts/install-mac-keep-awake-global.sh launchagent-install" >&2
    exit 1
  fi

  if [ ! -x "$command_path" ]; then
    echo "Commande globale absente ou non executable: $command_path" >&2
    echo "Lance d'abord: bash scripts/install-mac-keep-awake-global.sh install" >&2
    exit 1
  fi

  launchctl bootout "gui/$(id -u)" "$LAUNCH_AGENT_PATH" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/$(id -u)" "$LAUNCH_AGENT_PATH"
  launchctl kickstart -k "gui/$(id -u)/$LAUNCH_AGENT_LABEL" >/dev/null 2>&1 || true
  info "LaunchAgent charge. Il lancera agent-keep-awake au login."
}

launchagent_disable() {
  if [ -f "$LAUNCH_AGENT_PATH" ]; then
    launchctl bootout "gui/$(id -u)" "$LAUNCH_AGENT_PATH" >/dev/null 2>&1 || true
  fi
  info "LaunchAgent decharge."
}

uninstall_globals() {
  local bin_dir prompts_dir
  bin_dir="$(global_bin_dir)"
  prompts_dir="${VSCODE_USER_PROMPTS_FOLDER:-$DEFAULT_COPILOT_PROMPTS_DIR}"

  launchagent_disable
  rm -f "$LAUNCH_AGENT_PATH"
  rm -f "$bin_dir/agent-keep-awake" "$bin_dir/claude-keep-awake" "$bin_dir/copilot-keep-awake" "$bin_dir/codex-keep-awake"
  rm -f "$CLAUDE_SKILL_DIR/SKILL.md" "$CODEX_SKILL_DIR/SKILL.md" "$prompts_dir/keep-awake.prompt.md"
  rmdir "$CLAUDE_SKILL_DIR" >/dev/null 2>&1 || true
  rmdir "$CODEX_SKILL_DIR" >/dev/null 2>&1 || true
  info "Installation globale retiree."
}

status_globals() {
  local bin_dir command_path prompts_dir
  bin_dir="$(global_bin_dir)"
  command_path="$bin_dir/agent-keep-awake"
  prompts_dir="${VSCODE_USER_PROMPTS_FOLDER:-$DEFAULT_COPILOT_PROMPTS_DIR}"

  info "Commande globale: $( [ -L "$command_path" ] && printf '%s' "$command_path" || printf 'absente' )"
  info "Claude skill: $( [ -f "$CLAUDE_SKILL_DIR/SKILL.md" ] && printf 'present' || printf 'absent' )"
  info "Codex skill: $( [ -f "$CODEX_SKILL_DIR/SKILL.md" ] && printf 'present' || printf 'absent' )"
  info "Copilot prompt: $( [ -f "$prompts_dir/keep-awake.prompt.md" ] && printf 'present' || printf 'absent' )"
  info "LaunchAgent: $( [ -f "$LAUNCH_AGENT_PATH" ] && printf 'present' || printf 'absent' )"
  if [ -f "$LAUNCH_AGENT_PATH" ]; then
    if launchctl print "gui/$(id -u)/$LAUNCH_AGENT_LABEL" >/dev/null 2>&1; then
      info "LaunchAgent charge: oui"
    else
      info "LaunchAgent charge: non"
    fi
  fi
}

main() {
  local action="${1:-help}"

  require_macos

  case "$action" in
    install)
      install_globals
      ;;
    uninstall)
      uninstall_globals
      ;;
    launchagent-install)
      launchagent_install
      ;;
    launchagent-enable)
      launchagent_enable
      ;;
    launchagent-disable)
      launchagent_disable
      ;;
    status)
      status_globals
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
