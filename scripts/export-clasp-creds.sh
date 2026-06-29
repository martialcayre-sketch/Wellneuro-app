#!/usr/bin/env bash
set -euo pipefail

# Export credentials clasp de Codespace → PC local (sauvegarder dans fichier sécurisé)
# Usage: bash scripts/export-clasp-creds.sh

CLASPRC="$HOME/.clasprc.json"
EXPORT_FILE="/tmp/clasp-creds-$(date +%s).txt"

if [[ ! -f "$CLASPRC" ]]; then
  echo "❌ Erreur: $CLASPRC not found"
  echo "Lance d'abord: clasp login"
  exit 1
fi

echo "═══ Export Clasp Credentials ═══"
echo ""
echo "✓ Fichier trouvé: $CLASPRC"
echo ""

# Encode credentials en base64 dans un fichier temporaire
cat "$CLASPRC" | base64 -w 0 > "$EXPORT_FILE"
chmod 600 "$EXPORT_FILE"

echo "✓ Credentials encodées (sécurisées dans fichier temporaire)"
echo ""
echo "📋 Sur ton PC local:"
echo "   1. Clone le repo: git clone https://github.com/martialcayre-sketch/Wellneuro.git"
echo "   2. Copie le fichier depuis Codespace:"
echo "      scp codespace:/tmp/clasp-creds-*.txt ~/clasp-creds-temp.txt"
echo ""
echo "   3. Importe sur PC:"
echo "      cat ~/clasp-creds-temp.txt | bash scripts/import-clasp-creds.sh"
echo ""
echo "   4. Nettoie:"
echo "      rm ~/clasp-creds-temp.txt /tmp/clasp-creds-*.txt"
echo ""
echo "🔒 Fichier temporaire: $EXPORT_FILE (permissions: 600)"
echo ""
