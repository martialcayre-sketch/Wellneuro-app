#!/usr/bin/env bash
set -euo pipefail

# Ensure runtime directories exist even if mounted volumes were created by root.
if [ ! -d /home/node/.codex/attachments ] || [ ! -d /home/node/.claude ]; then
  sudo mkdir -p /home/node/.codex/attachments /home/node/.claude
fi

codex_owner="$(stat -c "%u:%g" /home/node/.codex 2>/dev/null || echo missing)"
claude_owner="$(stat -c "%u:%g" /home/node/.claude 2>/dev/null || echo missing)"

# Avoid a recursive chown on every start; only fix ownership when mismatched.
if [ "${codex_owner}" != "1000:1000" ] || [ "${claude_owner}" != "1000:1000" ]; then
  sudo chown -R node:node /home/node/.codex /home/node/.claude
fi

if [ ! -f /home/node/.codex/attachments/pasted-text-attachments.json ]; then
  printf '[]\n' > /home/node/.codex/attachments/pasted-text-attachments.json
fi
