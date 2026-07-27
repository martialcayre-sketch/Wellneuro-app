#!/usr/bin/env bash
# Contrôle anti-secrets. Deux modes :
#
#   (sans argument)  dépôt entier — utilisé par le CI et par test:worktree.
#   --staged         seulement les LIGNES AJOUTÉES de l'index git.
#
# Le mode --staged existe parce que le contrôle complet n'intervenait qu'en CI,
# c'est-à-dire APRÈS qu'un secret soit déjà entré dans un commit et dans
# l'historique. Scanner l'index coûte moins d'une seconde, ce qui permet de
# l'exécuter avant chaque commit plutôt qu'après.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
status=0

MODE="complet"
case "${1:-}" in
  --staged) MODE="staged" ;;
  "") ;;
  *) echo "Usage : bash scripts/check_no_secrets.sh [--staged]" >&2; exit 1 ;;
esac

GREP_EXCLUDES=(
  --exclude-dir='.git'
  --exclude-dir='node_modules'
  --exclude-dir='.next'
  --exclude-dir='generated'
  --exclude-dir='pgdata'
  --exclude='check_no_secrets.sh'
  --exclude='.env*.local*'
  --exclude='package-lock.json'
  --exclude='*.lock'
)

# En mode --staged, on n'inspecte que les lignes AJOUTÉES du diff indexé : ce
# qu'on s'apprête à committer, et rien du contenu préexistant. Chaque ligne est
# préfixée de son fichier et d'une tabulation, pour que `check_pattern` rende
# l'emplacement sans jamais rendre le contenu.
#
# Le nom de fichier vient de `git`, jamais du texte du diff. Une version
# antérieure le lisait dans les en-têtes `+++` — or une ligne de CONTENU
# commençant par `++ ` produit une ligne de diff `+++ …` indiscernable d'un
# en-tête. Le fragment de contenu devenait alors le « nom de fichier » imprimé
# pour toutes les lignes suivantes : la valeur du secret ressortait par le canal
# de l'emplacement. La même ligne, avalée comme un en-tête, n'était par ailleurs
# jamais scannée — fuite et faux négatif d'une seule cause.
#
# D'où un diff par fichier, et les lignes ajoutées lues APRÈS le premier `@@` :
# passé cette borne, aucune ligne n'est plus interprétée comme un en-tête.
#
# `:(literal)` n'est pas décoratif. Le nom que git vient de rendre lui est
# redonné en PATHSPEC, et un pathspec n'est pas un chemin : `:` y ouvre la
# syntaxe magique, si bien qu'un fichier nommé `:note.md` ne matchait plus rien
# et sortait du contrôle en silence. Même classe de défaut que celle du `++`
# ci-dessus — une donnée qui redevient de la syntaxe.
#
# Et l'échec de `git` fait sortir en 2, jamais en 0. Un contrôle qui répond
# « OK » sans avoir rien lu est pire qu'absent : `safe.directory`, un conteneur
# à uid différent ou un `git` hors du PATH suffisaient à le rendre muet.
# « Je n'ai pas pu vérifier » n'est pas « je n'ai rien trouvé ».
AJOUTS=""
if [[ "$MODE" == "staged" ]]; then
  # `mktemp` gardé pour la même raison que `git` : sans cela `set -e` sortirait
  # en 1, c'est-à-dire « secret détecté », alors que rien n'a été lu.
  LISTE="$(mktemp)" || { echo "ERREUR: mktemp a échoué — contrôle NON CONCLUANT." >&2; exit 2; }
  trap 'rm -f "$LISTE"' EXIT
  # Le passage par un fichier, et non par `$(…)`, parce que bash retire les
  # octets NUL des substitutions de commande — ce qui détruirait la séparation
  # de `-z`, seule forme sûre pour un nom de fichier quelconque.
  if ! git diff --cached --name-only -z -- . \
       ':(exclude)package-lock.json' ':(exclude)*.lock' > "$LISTE"; then
    echo "ERREUR: 'git diff --cached' a échoué — contrôle NON CONCLUANT." >&2
    exit 2
  fi
  while IFS= read -r -d '' fichier; do
    if ! diff_fichier="$(git diff --cached --unified=0 --no-renames -- ":(literal)$fichier")"; then
      echo "ERREUR: 'git diff --cached' a échoué sur un fichier indexé — contrôle NON CONCLUANT." >&2
      exit 2
    fi
    lignes="$(printf '%s\n' "$diff_fichier" \
      | awk '/^@@/ { dans = 1; next } dans && /^\+/ { print }')"
    [[ -n "$lignes" ]] || continue
    # Le `+` du diff est conservé à dessein : il s'intercale entre le nom de
    # fichier et la ligne, et n'est ni un guillemet, ni une espace, ni `:`/`=`.
    # C'est lui qui empêche un chemin comme `config/client_secret` de former un
    # faux positif avec le début de la ligne ajoutée. Ne pas le retirer.
    AJOUTS+="$(printf '%s\n' "$lignes" | awk -v f="$fichier" '{ print f "\t" $0 }')"$'\n'
  done < "$LISTE"
fi

# Ne rapporte JAMAIS la ligne trouvée, seulement où elle est. Un `grep -n` nu
# imprimait le contenu : sur un fichier de compte de service, c'est la clé
# privée entière, déversée dans le terminal — donc dans un journal de session,
# donc potentiellement dans un commit. Le dépôt écrit déjà la règle, dans
# `docs/gouvernance-questionnaires-scoring.md` : signaler le fichier « sans
# exposer le secret dans les journaux ou commits ». Le contrôle la violait dès
# qu'il fonctionnait, et l'élargissement des motifs rendait ce chemin
# atteignable pour la première fois.
check_pattern() {
  local label="$1"
  local pattern="$2"
  local trouve
  if [[ "$MODE" == "staged" ]]; then
    # `$AJOUTS` porte le nom de fichier en tête, séparé par une tabulation :
    # `cut -f1` rend l'emplacement sans la ligne ajoutée.
    trouve="$(printf '%s\n' "$AJOUTS" | grep -E "$pattern" | cut -f1 | sort -u || true)"
  else
    trouve="$(grep -rnE "${GREP_EXCLUDES[@]}" "$pattern" . 2>/dev/null | cut -d: -f1,2 || true)"
  fi
  [[ -n "$trouve" ]] || return 0
  printf '%s\n' "$trouve"
  echo "ERREUR: motif suspect détecté: $label" >&2
  status=1
}

# Un secret ne s'écrit pas toujours `CLE=valeur`. En JSON — le format d'une clé
# de compte de service Google — l'identifiant porte des guillemets, et le
# guillemet fermant s'intercale avant le deux-points. Les motifs exigeaient que
# le séparateur suive l'identifiant DIRECTEMENT : ils rataient donc la forme la
# plus courante d'une clé privée, dans les deux modes. Mesuré le 2026-07-27 sur
# un `secrets/wn-drive-sa.json` que rien n'ignorait par ailleurs.
#
# Ce séparateur admet donc les guillemets de part et d'autre. Une variante plus
# permissive (`[^A-Za-z0-9_]{0,4}`) attrapait autant mais a été écartée par la
# mesure : 11 faux positifs sur le dépôt, tous dans de la prose documentaire
# citant des noms de variables. Celle-ci en produit zéro.
#
# `scripts/check_no_secrets.test.mjs` échoue si l'un de ces motifs cesse
# d'attraper ce qu'il annonce attraper.
SEP="['\"]*[[:space:]]*[:=][[:space:]]*['\"]*"

check_pattern "SHEET_ID"            "SHEET_ID${SEP}[A-Za-z0-9_-]{25,}"
check_pattern "ANTHROPIC_API_KEY"   "ANTHROPIC_API_KEY${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "CLAUDE_API_KEY"      "CLAUDE_API_KEY${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "OPENAI_API_KEY"      "OPENAI_API_KEY${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "RAG_INTERNAL_SECRET" "RAG_INTERNAL_SECRET${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "client_secret"       "client_secret${SEP}[A-Za-z0-9_-]{10,}"
check_pattern "private_key"         "private_key${SEP}-----BEGIN"

# CE QUE CE CONTRÔLE NE COUVRE PAS — mesuré le 2026-07-27, à ne pas croire
# couvert par le titre du lot :
#
# - `GOOGLE_CLIENT_SECRET` (majuscules) : le motif `client_secret` est sensible
#   à la casse, et l'ajout de `-i` remonterait 8 correspondances, TOUTES des
#   valeurs factices (`ci-placeholder`, `secret-de-test-non-production`). Idem
#   `NEXTAUTH_SECRET` : 28 correspondances, toutes des placeholders de test.
#   Un contrôle qui échoue toujours finit désactivé ; le couvrir demande de
#   savoir distinguer une valeur factice d'une vraie, ce qu'un motif ne sait
#   pas faire. Suivi à part.
# - une clé privée sans identifiant devant (`.pem`, `.p12`, clé SSH nue) ;
# - un JSON échappé dans du JSON, ou un compte de service encodé en base64 ;
# - une URL de connexion portant un mot de passe (`postgresql://u:mdp@…`) ;
# - un jeton porteur (`Authorization: Bearer …`) ;
# - une valeur séparée de son identifiant par autre chose qu'un `:` ou un `=`
#   (`--client_secret VALEUR`), ou posée sur la ligne suivante.
#
# Ce contrôle attrape les formes courantes d'un secret nommé. Il n'est pas un
# scanner de secrets et ne remplace pas la règle de base : rien de sensible
# n'entre dans le dépôt.

if [[ "$status" -eq 0 ]]; then
  if [[ "$MODE" == "staged" ]]; then
    echo "OK: aucun secret évident dans les lignes indexées."
  else
    echo "OK: aucun secret évident détecté."
  fi
fi
exit "$status"
