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
# qu'on s'apprête à committer, et rien du contenu préexistant.
# Chaque ligne ajoutée est préfixée de son fichier et d'une tabulation, pour que
# `check_pattern` puisse rendre l'emplacement sans jamais rendre le contenu.
AJOUTS=""
if [[ "$MODE" == "staged" ]]; then
  AJOUTS="$(git diff --cached --unified=0 -- . \
    ':(exclude)package-lock.json' ':(exclude)*.lock' 2>/dev/null \
    | awk '
        /^\+\+\+ /  { f = substr($0, 7); if (f == "ev/null") f = "(supprimé)"; next }
        /^\+/       { print f "\t" $0 }
      ' || true)"
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
