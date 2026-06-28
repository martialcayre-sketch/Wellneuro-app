#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DESC="${1:-deploy $(date '+%Y-%m-%d %H:%M')}"

echo "═══ NutriConsult — Déploiement unifié ═══"
echo ""

# 1. Sync src/gas → racine (clasp pousse les fichiers racine)
echo "── 1/6 Synchronisation src/gas → racine…"
cp src/gas/Code.gs Code.gs
cp src/gas/Questions.gs Questions.gs
cp src/gas/appsscript.json appsscript.json
cp src/gas/index.html index.html
echo "   ✓ Fichiers synchronisés"

# 2. Vérification secrets
echo "── 2/6 Vérification des secrets…"
bash scripts/check_no_secrets.sh

# 3. Push vers GAS
echo "── 3/6 Push vers Google Apps Script…"
clasp push

# 4. Déploiement GAS (nouvelle version)
echo "── 4/6 Déploiement : $DESC"
clasp deploy --description "$DESC"

# 5. Git commit
echo "── 5/6 Commit Git…"
git add src/gas/Code.gs src/gas/Questions.gs src/gas/appsscript.json \
        Code.gs Questions.gs appsscript.json \
        index.html src/gas/index.html \
        scripts/
if git diff --cached --quiet; then
  echo "   Aucun changement à committer"
else
  git commit -m "$DESC"
  echo "   ✓ Commit créé"
fi

# 6. Git push
echo "── 6/6 Push Git…"
git push
echo "   ✓ Poussé vers GitHub"

echo ""
echo "═══ Déploiements actifs ═══"
clasp deployments
echo ""
echo "✓ Terminé — GAS + Git synchronisés."
