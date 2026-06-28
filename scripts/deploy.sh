#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DESC="${1:-deploy $(date '+%Y-%m-%d %H:%M')}"

echo "═══ NutriConsult — Déploiement unifié ═══"
echo ""

# 1. Vérification secrets
echo "── 1/5 Vérification des secrets…"
bash scripts/check_no_secrets.sh

# 2. Push vers GAS (clasp rootDir=src/gas)
echo "── 2/5 Push vers Google Apps Script…"
clasp push

# 3. Déploiement GAS (nouvelle version)
echo "── 3/5 Déploiement : $DESC"
clasp deploy --description "$DESC"

# 4. Git commit
echo "── 4/5 Commit Git…"
git add -A
if git diff --cached --quiet; then
  echo "   Aucun changement à committer"
else
  git commit -m "$DESC"
  echo "   ✓ Commit créé"
fi

# 5. Git push
echo "── 5/5 Push Git…"
git push
echo "   ✓ Poussé vers GitHub"

echo ""
echo "═══ Déploiements actifs ═══"
clasp deployments
echo ""
echo "✓ Terminé — GAS + Git synchronisés."
