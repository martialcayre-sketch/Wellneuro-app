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

# Les blocs `!` de wn-merge extraient CLAUDE.md par motifs sed : un titre
# renommé rend une plage vide, sans erreur (constaté le 2026-08-07 — l'ancre
# « Attendre le CI » ne matchait plus depuis un renommage). Chaque ancre doit
# exister dans CLAUDE.md.
for ancre in \
  '^### Attendre le CI d' \
  '^## Revue, merge et suppression des branches' \
  '^## Définition de done pour une tâche standard'; do
  grep -q "$ancre" CLAUDE.md || {
    echo "ERREUR: ancre sed absente de CLAUDE.md: $ancre"
    exit 1
  }
done

node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json OK')"
node scripts/wn-kit-doctor.mjs
