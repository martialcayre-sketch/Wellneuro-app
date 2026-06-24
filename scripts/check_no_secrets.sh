#!/usr/bin/env bash
set -euo pipefail

blocked_files=(
  ".env"
  ".clasp.json"
  ".clasprc.json"
  "credentials.json"
  "token.json"
)

blocked_globs=(
  "client_secret*.json"
  "exports/*"
  "data/private/*"
  "patients_reels/*"
  "resultats_reels/*"
  "*.csv"
  "*.xlsx"
)

for file in "${blocked_files[@]}"; do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "Erreur : fichier sensible suivi par Git : $file" >&2
    exit 1
  fi
done

for pattern in "${blocked_globs[@]}"; do
  if git ls-files -- "$pattern" | grep -q .; then
    echo "Erreur : fichier sensible suivi par Git correspondant au motif : $pattern" >&2
    git ls-files -- "$pattern" >&2
    exit 1
  fi
done

if git ls-files | xargs -r grep -nE "SHEET_ID[[:space:]]*=[[:space:]]*['\"][A-Za-z0-9_-]{20,}" >/tmp/nutriconsult_secret_scan.txt 2>/dev/null; then
  echo "Erreur : possible SHEET_ID écrit en dur détecté." >&2
  cat /tmp/nutriconsult_secret_scan.txt >&2
  rm -f /tmp/nutriconsult_secret_scan.txt
  exit 1
fi
rm -f /tmp/nutriconsult_secret_scan.txt

echo "Contrôle anti-secrets terminé."
