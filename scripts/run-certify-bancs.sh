#!/usr/bin/env bash
# Exécute TOUS les bancs Node de `tools/corpus/certify/lib/`.
#
# Pourquoi un script plutôt qu'un motif écrit deux fois : les trois shells du
# projet ne traitent pas de la même façon un motif sans correspondance.
# `zsh` (au clavier) échoue bruyamment ; `bash` (la CI) et `sh` (les scripts
# npm) laissent passer le littéral, que `node --test` reprend comme motif — et
# rend alors `# tests 0` avec un CODE DE RETOUR 0. Un dossier renommé, un
# suffixe de test changé, et les bancs cessent de tourner sans un bruit.
#
# C'est la version silencieuse du défaut qu'on cherchait à fermer : avant, on
# pouvait oublier de brancher un banc ; avec un motif nu, on peut n'en exécuter
# aucun tout en restant vert. D'où le contrôle explicite ci-dessous.
#
# `node --test <dossier>` ne remplace pas ce script : il ne balaie pas, il tente
# de charger le chemin comme un module et échoue.
set -euo pipefail

racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dossiers=("$racine/tools/corpus/certify/lib" "$racine/tools/corpus/claims/lib")

shopt -s nullglob
bancs=()
for dossier in "${dossiers[@]}"; do
  bancs_du_dossier=("$dossier"/*.test.mjs)
  if [ ${#bancs_du_dossier[@]} -eq 0 ]; then
    echo "ÉCHEC : aucun banc *.test.mjs dans $dossier" >&2
    echo "        dossier renommé, suffixe de test changé, ou bancs supprimés." >&2
    exit 1
  fi
  bancs+=("${bancs_du_dossier[@]}")
done

echo "bancs de certification exécutés (${#bancs[@]}) :"
for b in "${bancs[@]}"; do echo "  - ${b#"$racine"/}"; done

exec node --test "${bancs[@]}"
