#!/usr/bin/env bash
set -euo pipefail

echo "WellNeuro — vérification kit Claude Code"

if [ ! -d ".claude/skills" ]; then
  echo "ERREUR: .claude/skills absent. Dézipper le kit à la racine du repo."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERREUR: Node.js est requis pour les hooks .mjs."
  exit 1
fi

for skill in wn-auto wn-r0 wn-r1 wn-r2 wn-r3 wn-r4 wn-r5 wn-r6 wn-finish wn-review; do
  if [ ! -f ".claude/skills/$skill/SKILL.md" ]; then
    echo "ERREUR: skill manquant: $skill"
    exit 1
  fi
done

if [ -f ".claude/settings.json" ]; then
  node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json OK')"
fi

echo "OK. Dans Claude Code, lance : /wn-auto"
