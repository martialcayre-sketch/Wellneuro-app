#!/usr/bin/env bash
# L'évaluation rejouée de D-539 §8 — APPELLE VRAIMENT LE FOURNISSEUR (coût réel).
#
# Usage, depuis web/ :
#   ANTHROPIC_API_KEY=… bash scripts/eval-d539/lancer.sh <dossier-de-sortie-hors-dépôt> [--confirme]
# Essai de fumée : WN_EVAL_DOSSIERS=1 WN_EVAL_PASSAGES=1 en préfixe.
#
# Rien ne lit ni n'écrit une base : Prisma est simulé. Dossiers fictifs seuls
# (D-125). Les sorties brutes vont au dossier donné, jamais au dépôt public
# (D-251 §4) ; le banc refuse un dossier de sortie dans le dépôt.
set -euo pipefail

sortie="${1:-}"
if [[ -z "$sortie" || "${2:-}" != "--confirme" ]]; then
  echo "usage : bash scripts/eval-d539/lancer.sh <dossier-de-sortie-hors-dépôt> --confirme" >&2
  exit 2
fi
if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "ANTHROPIC_API_KEY absente" >&2
  exit 2
fi
mkdir -p "$sortie"

WN_EVAL_D539_CONFIRME=1 \
WN_EVAL_SORTIE="$(cd "$sortie" && pwd)" \
WN_EVAL_COMMIT="$(git rev-parse HEAD)" \
  npx vitest run --config scripts/eval-d539/vitest.config.ts --reporter=verbose
