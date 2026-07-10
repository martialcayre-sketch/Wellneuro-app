#!/usr/bin/env bash
set -euo pipefail

# Import credentials clasp depuis Codespace → PC local
# Usage: cat clasp-creds.txt | bash scripts/import-clasp-creds.sh

CLASPRC="$HOME/.clasprc.json"

echo "═══ Import Clasp Credentials ═══"
echo ""

# Lis les credentials en base64 depuis stdin
B64=$(cat)

if [[ -z "$B64" ]]; then
  echo "❌ Erreur: aucune donnée reçue sur stdin"
  exit 1
fi

# Décode base64 et vérifie que c'est du JSON valide
if ! JSON=$(echo "$B64" | base64 -d 2>/dev/null); then
  echo "❌ Erreur: base64 invalide"
  exit 1
fi

if ! echo "$JSON" | jq empty 2>/dev/null; then
  echo "❌ Erreur: JSON invalide après décodage"
  exit 1
fi

# Backup de l'ancien fichier s'il existe
if [[ -f "$CLASPRC" ]]; then
  cp "$CLASPRC" "$CLASPRC.backup"
  echo "✓ Backup créé: $CLASPRC.backup"
fi

# Crée le répertoire s'il n'existe pas
mkdir -p "$(dirname "$CLASPRC")"

# Écrit les credentials
echo "$JSON" > "$CLASPRC"
chmod 600 "$CLASPRC"

echo "✓ Credentials importés vers $CLASPRC"
echo "✓ Permissions: 600 (lecture/écriture propriétaire seulement)"
echo ""
echo "📋 Vérifie que clasp fonctionne:"
echo "   clasp list"
echo ""
echo "   Si OK: rm clasp-creds-temp.txt (fichier temporaire)"
echo ""
