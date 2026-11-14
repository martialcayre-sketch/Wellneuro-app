#!/usr/bin/env bash
# Doublons du client Prisma généré — piège converti en contrôle (lot
# `autonomie-frictions`, 2026-11-13 ; resserré par `autonomie-pieges-restes`).
#
# Deux `prisma generate` concurrents (deux worktrees, ou un generate manuel
# pendant `wn-test-worktree.sh`) laissent des doublons « index.d 2.ts »,
# « edge 2.js », et parfois des répertoires « runtime 2 ». Le répertoire est
# ignoré par Git : rien ne se voit, et le build casse plus loin sur
# « Constructor implementation is missing », qui ne ressemble pas à sa cause.
#
#   bash scripts/wn-doublons-prisma.sh <répertoire du client généré>
#
# Codes : 0 aucun doublon · 1 doublons (listés sur la sortie) · 2 répertoire
# absent ou usage. Un répertoire absent n'est pas « aucun doublon » : c'est
# un generate qui n'a pas écrit là où on l'attend.
# Banc : scripts/wn-doublons-prisma.test.mjs.
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage : bash scripts/wn-doublons-prisma.sh <répertoire>" >&2
  exit 2
fi
dossier="$1"
if [[ ! -d "$dossier" ]]; then
  echo "ERREUR: $dossier introuvable — le client Prisma n'est pas là où on l'attend." >&2
  exit 2
fi

# Fichiers « * 2.* » et entrées « * 2 » (répertoire ou fichier sans
# extension). Sans `head` : sous `pipefail`, un SIGPIPE ferait sortir en échec.
doublons="$(find "$dossier" \( -name '* 2.*' -o -name '* 2' \) -print)" || {
  echo "ERREUR: find a échoué sur $dossier — contrôle NON CONCLUANT." >&2
  exit 2
}
if [[ -n "$doublons" ]]; then
  printf '%s\n' "$doublons"
  exit 1
fi
exit 0
