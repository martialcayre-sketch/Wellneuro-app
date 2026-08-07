#!/usr/bin/env bash
set -euo pipefail

echo "WellNeuro — vérification Claude Code + Copilot"

skills=(
  wn wn-auto wn-plan wn-context wn-campaign wn-campaign-run wn-docs
  wn-test wn-debug wn-review wn-pr wn-handoff wn-finish
)

for skill in "${skills[@]}"; do
  test -f ".claude/skills/$skill/SKILL.md" || {
    echo "ERREUR: skill manquant: $skill"
    exit 1
  }
done

node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json OK')"
node scripts/wn-kit-doctor.mjs
