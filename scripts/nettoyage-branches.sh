#!/usr/bin/env bash
# Nettoyage des branches et worktrees obsolètes — sur preuve uniquement.
#
# Copilot merge en squash : aucun tip de branche n'est ancêtre de main, donc
# `git branch -d` et `git branch --merged` ne détectent jamais rien. La preuve
# d'obsolescence se fait au niveau des PR : le tip local doit être contenu dans
# le head (`headRefOid`) d'une PR mergée, ou être ancêtre de origin/main.
#
# Critères de suppression (tout le reste est listé, jamais supprimé) :
#   - branche (locale ou remote) : tip ⊆ head d'une PR mergée, ou ancêtre de
#     origin/main ;
#   - worktree : non verrouillé, arbre propre, et branche prouvée comme
#     ci-dessus.
# Sont toujours conservés : main, les branches des PR ouvertes, les branches
# extraites dans un worktree conservé, les worktrees verrouillés (session
# active) ou sales, et les PR fermées sans merge (à trancher à la main).
#
# Usage :
#   bash scripts/nettoyage-branches.sh              # constat seul (défaut)
#   bash scripts/nettoyage-branches.sh --appliquer  # supprime ce qui est prouvé
#
# Prérequis : gh (authentifié). Chaque suppression affiche son SHA : tout
# reste récupérable via le reflog (~90 j) ou la PR GitHub.
set -euo pipefail

APPLIQUER=0
if [ "${1:-}" = "--appliquer" ]; then
  APPLIQUER=1
elif [ -n "${1:-}" ]; then
  echo "Option inconnue : $1 (seule option : --appliquer)" >&2
  exit 2
fi

command -v gh >/dev/null || { echo "gh est requis." >&2; exit 2; }

echo "→ Synchronisation avec origin (fetch --prune)…"
git fetch --prune origin >/dev/null

# Branches à ne jamais toucher : main, PR ouvertes, branches extraites.
PROTEGEES=" main "
for b in $(gh pr list --state open --json headRefName --jq '.[].headRefName'); do
  PROTEGEES="$PROTEGEES$b "
done
for b in $(git worktree list --porcelain | sed -n 's|^branch refs/heads/||p'); do
  PROTEGEES="$PROTEGEES$b "
done

protegee() { case "$PROTEGEES" in *" $1 "*) return 0;; *) return 1;; esac; }

# Preuve d'obsolescence d'un commit porté par une branche nommée.
# Sortie : "PR #N mergée" / "ancêtre de main" si prouvé, code retour 1 sinon.
preuve() { # $1 = sha du tip, $2 = nom de head côté PR
  if git merge-base --is-ancestor "$1" origin/main 2>/dev/null; then
    echo "ancêtre de main"; return 0
  fi
  local pr
  pr=$(gh pr list --state merged --head "$2" --json number,headRefOid \
    --jq '.[0] | "\(.number) \(.headRefOid)"' 2>/dev/null) || return 1
  [ -n "$pr" ] || return 1
  local num sha
  num=${pr%% *}; sha=${pr##* }
  if [ "$1" = "$sha" ] || git merge-base --is-ancestor "$1" "$sha" 2>/dev/null; then
    echo "PR #$num mergée"; return 0
  fi
  return 1
}

echo
echo "== Worktrees =="
RACINE=$(git rev-parse --path-format=absolute --git-common-dir)
RACINE=${RACINE%/.git}
git worktree list --porcelain | awk '
  /^worktree /{chemin=substr($0,10)}
  /^branch /{branche=substr($0,19)}
  /^locked/{verrou=1}
  /^$/{print chemin "|" branche "|" verrou; chemin="";branche="";verrou=0}
  END{if(chemin!="")print chemin "|" branche "|" verrou}
' | while IFS='|' read -r chemin branche verrou; do
  [ "$chemin" = "$RACINE" ] && continue
  if [ "$verrou" = "1" ]; then
    echo "GARDÉ (verrouillé, session active ?) : $chemin [$branche]"
    continue
  fi
  if [ -n "$(git -C "$chemin" status --porcelain)" ]; then
    echo "GARDÉ (fichiers non committés) : $chemin [$branche]"
    continue
  fi
  tip=$(git -C "$chemin" rev-parse HEAD)
  if motif=$(preuve "$tip" "$branche"); then
    if [ "$APPLIQUER" = "1" ]; then
      git worktree remove "$chemin" \
        && echo "SUPPRIMÉ ($motif) : $chemin [$branche @ ${tip:0:7}]"
    else
      echo "SUPPRIMABLE ($motif) : $chemin [$branche @ ${tip:0:7}]"
    fi
  else
    echo "À EXAMINER (aucune preuve) : $chemin [$branche @ ${tip:0:7}]"
  fi
done

echo
echo "== Branches locales =="
# Recalcule les branches extraites : des worktrees ont pu être supprimés.
EXTRAITES=" "
for b in $(git worktree list --porcelain | sed -n 's|^branch refs/heads/||p'); do
  EXTRAITES="$EXTRAITES$b "
done
for br in $(git for-each-ref refs/heads --format='%(refname:short)'); do
  if protegee "$br" || { case "$EXTRAITES" in *" $br "*) true;; *) false;; esac; }; then
    echo "GARDÉE (protégée ou extraite) : $br"
    continue
  fi
  tip=$(git rev-parse "$br")
  if motif=$(preuve "$tip" "$br"); then
    if [ "$APPLIQUER" = "1" ]; then
      git branch -D "$br" >/dev/null \
        && echo "SUPPRIMÉE ($motif) : $br (${tip:0:7})"
    else
      echo "SUPPRIMABLE ($motif) : $br (${tip:0:7})"
    fi
  else
    etat=$(gh pr list --state closed --head "$br" --json number \
      --jq 'if length > 0 then "PR #\(.[0].number) fermée sans merge" else "aucune PR" end' 2>/dev/null)
    echo "À EXAMINER (${etat:-aucune PR}) : $br (${tip:0:7})"
  fi
done

echo
echo "== Branches remote =="
for rb in $(git for-each-ref 'refs/remotes/origin/**' --format='%(refname:short)'); do
  [ "$rb" = "origin" ] && continue # origin/HEAD, réf symbolique — pas une branche
  br=${rb#origin/}
  protegee "$br" && { echo "GARDÉE (protégée) : origin/$br"; continue; }
  tip=$(git rev-parse "$rb")
  if motif=$(preuve "$tip" "$br"); then
    if [ "$APPLIQUER" = "1" ]; then
      git push origin --delete "$br" >/dev/null 2>&1 \
        && echo "SUPPRIMÉE ($motif) : origin/$br (${tip:0:7})" \
        || echo "ÉCHEC de suppression : origin/$br"
    else
      echo "SUPPRIMABLE ($motif) : origin/$br (${tip:0:7})"
    fi
  else
    echo "À EXAMINER (aucune preuve) : origin/$br (${tip:0:7})"
  fi
done

echo
if [ "$APPLIQUER" = "1" ]; then
  echo "Terminé. Les SHA affichés restent récupérables via le reflog ou les PR."
else
  echo "Constat seul — rien n'a été supprimé. Relancer avec --appliquer pour purger."
fi
