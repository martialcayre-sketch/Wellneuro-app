#!/usr/bin/env bash
set -euo pipefail

echo "WellNeuro — vérification Claude Code + Copilot"

skills=(
  wn wn-plan wn-context wn-campaign wn-campaign-run wn-docs
  wn-test wn-debug wn-review wn-pr wn-handoff wn-finish
)

for skill in "${skills[@]}"; do
  test -f ".claude/skills/$skill/SKILL.md" || {
    echo "ERREUR: skill manquant: $skill"
    exit 1
  }
done

# wn-merge charge la gouvernance PR/merge par `cat` de ce fichier. L'extraction
# se faisait avant par motifs sed sur des titres de CLAUDE.md : un titre renommé
# rendait une plage vide, sans erreur (constaté le 2026-08-07). Le `cat` supprime
# cette classe de panne ; reste à garantir que la cible existe et n'est pas vide.
test -s docs/claude/REGLES_PR_MERGE.md || {
  echo "ERREUR: docs/claude/REGLES_PR_MERGE.md absent ou vide (chargé par wn-merge)"
  exit 1
}

node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json OK')"
node scripts/wn-kit-doctor.mjs
