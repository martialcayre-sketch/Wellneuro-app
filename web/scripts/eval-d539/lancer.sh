#!/usr/bin/env bash
# L'évaluation rejouée de D-539 §8 — APPELLE VRAIMENT LE FOURNISSEUR (coût réel).
#
# Usage, depuis web/ :
#   ANTHROPIC_API_KEY=… bash scripts/eval-d539/lancer.sh <dossier-de-sortie-hors-dépôt> --confirme <principal|deux>
# `principal` : l'appel principal seul, drapeau éteint (D-556 §5 et §6, D-557 §3) ;
# `deux` : les deux appels, drapeau posé (D-539 §8, selon D-545 §7).
# Essai de fumée : WN_EVAL_DOSSIERS=1 WN_EVAL_PASSAGES=1 en préfixe.
#
# Rien ne lit ni n'écrit une base : Prisma est simulé. Dossiers fictifs seuls
# (D-125). Les sorties brutes vont au dossier donné, jamais au dépôt public
# (D-251 §4) ; le banc refuse un dossier de sortie dans le dépôt.
set -euo pipefail

sortie="${1:-}"
appels="${3:-}"
if [[ -z "$sortie" || "${2:-}" != "--confirme" || ( "$appels" != "principal" && "$appels" != "deux" ) ]]; then
  echo "usage : bash scripts/eval-d539/lancer.sh <dossier-de-sortie-hors-dépôt> --confirme <principal|deux>" >&2
  exit 2
fi
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ANTHROPIC_API_KEY absente" >&2
  exit 2
fi
# Le commit inscrit au résumé doit être celui qui a produit les générations :
# rien de modifié ni de non suivi sous le code évalué (revue PR-Agent de #2266).
if [[ -n "$(git status --porcelain -- src prisma)" ]]; then
  echo "web/src ou web/prisma porte des modifications : le résumé ne pourrait pas les attribuer à un commit. Committer ou retirer d'abord." >&2
  exit 2
fi
mkdir -p "$sortie"

WN_EVAL_D539_CONFIRME=1 \
WN_EVAL_APPELS="$appels" \
WN_EVAL_SORTIE="$(cd "$sortie" && pwd)" \
WN_EVAL_COMMIT="$(git rev-parse HEAD)" \
  npx vitest run --config scripts/eval-d539/vitest.config.ts --reporter=verbose
