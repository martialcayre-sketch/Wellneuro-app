#!/usr/bin/env bash
# CB-02a — banc d'intégration du CHEMIN D'ÉCRITURE de l'import NABM.
#
# POURQUOI CE FICHIER EXISTE. Les tests Vitest couvrent `nabmImport.ts`, la
# logique pure. Ils ne touchent pas `importNabm.ts`, qui est pourtant le
# fichier qui ÉCRIT — transaction, verrous, idempotence, refus. La revue du
# 2026-07-26 y a trouvé un défaut que la logique pure ne pouvait pas révéler :
# rejouer un millésime déjà remplacé ramenait le pointeur en arrière sans un
# mot, réactivant des actes désactivés depuis. Un catalogue complet mais
# ANTÉRIEUR passait tous les contrôles de volumétrie.
#
# Le banc rejoue donc une rotation de millésime, seul contexte où ce défaut se
# manifeste, sur les fixtures `prisma/fixtures/nabm-test/`.
#
# Destructif sur les tables `biology_*` : exige que WN_CB_NABM_DESTRUCTIVE_TEST
# nomme la base visée (patron du banc C5 Ciqual).
set -euo pipefail

cd "$(dirname "$0")/.."

: "${DATABASE_URL:?DATABASE_URL est requise}"
BASE_ATTENDUE="${WN_CB_NABM_DESTRUCTIVE_TEST:?WN_CB_NABM_DESTRUCTIVE_TEST doit nommer la base de test}"
BASE_REELLE="$(node -e 'process.stdout.write(new URL(process.env.DATABASE_URL).pathname.slice(1))')"
if [ "$BASE_REELLE" != "$BASE_ATTENDUE" ]; then
  echo "REFUS : DATABASE_URL vise « $BASE_REELLE », WN_CB_NABM_DESTRUCTIVE_TEST annonce « $BASE_ATTENDUE »." >&2
  exit 1
fi

HOTE="$(node -e 'process.stdout.write(new URL(process.env.DATABASE_URL).hostname)')"
JETON=CB-02A-IMPORT-NABM-MC-2026-07-26-v1
export MIGRATE_DATABASE_URL="$DATABASE_URL"
export WN_CB_NABM_IMPORT_CONFIRMATION="$JETON"

FIXTURES=prisma/fixtures/nabm-test
SORTIE="$(mktemp)"
trap 'rm -f "$SORTIE"' EXIT

# Un import complet, avec toutes ses preuves. `$@` porte les options du cas.
importer() {
  node prisma/runWithAlias.js prisma/importNabm.ts --apply \
    --confirmation "$JETON" --base "$HOTE" --allow-shrink "$@"
}

echec_attendu() {
  local titre="$1" motif="$2"; shift 2
  if importer "$@" >"$SORTIE" 2>&1; then
    echo "ÉCHEC — « $titre » a été ACCEPTÉ alors qu'il doit être refusé" >&2
    cat "$SORTIE" >&2; exit 1
  fi
  if ! grep -q "$motif" "$SORTIE"; then
    echo "ÉCHEC — « $titre » refusé, mais pas pour le motif attendu ($motif)" >&2
    cat "$SORTIE" >&2; exit 1
  fi
  echo "  ✔ $titre — refusé pour le bon motif"
}

# Rend la valeur d'une clé du rapport JSON de la dernière exécution.
valeur() { node -e '
  const t = require("fs").readFileSync(process.argv[1], "utf8");
  const d = t.lastIndexOf("{"), f = t.lastIndexOf("}");
  process.stdout.write(String(JSON.parse(t.slice(t.indexOf("{", t.indexOf("import NABM validé")), f + 1))[process.argv[2]]));
' "$SORTIE" "$1"; }

attendre() {
  local cle="$1" attendu="$2" obtenu
  obtenu="$(valeur "$cle")"
  if [ "$obtenu" != "$attendu" ]; then
    echo "ÉCHEC — $cle = « $obtenu », « $attendu » attendu" >&2
    cat "$SORTIE" >&2; exit 1
  fi
}

echo "── Table rase ──"
node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  await c.query("DELETE FROM biology_analyte_nabm");
  await c.query("DELETE FROM biology_catalog_versions_courantes");
  await c.query("DELETE FROM biology_source_snapshots");
  await c.query("DELETE FROM biology_nabm_actes");
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'

echo "── 1. Premier import (V105) ──"
importer --source "$FIXTURES/v105" >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
attendre inseres 4
attendre pointeurApres V105
attendre pointeurDeplace true
attendre rejeuSansEffet false
echo "  ✔ 4 actes importés, pointeur posé sur V105"

echo "── 2. Rejeu à l'identique : sans effet ──"
importer --source "$FIXTURES/v105" >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
attendre inseres 0
attendre rejeuSansEffet true
attendre pointeurDeplace false
echo "  ✔ rejeu idempotent"

echo "── 3. Rotation de millésime (V106 : 1213 retiré, 1208 inactif) ──"
importer --source "$FIXTURES/v106" >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
attendre inseres 3
attendre pointeurAvant V105
attendre pointeurApres V106
attendre rejeuSansEffet false
echo "  ✔ pointeur déplacé V105 → V106, actes de V105 conservés"

echo "── 4. LE DÉFAUT DE LA REVUE : retour arrière refusé ──"
echec_attendu "rejeu d'un millésime déjà remplacé" "Changement de millésime servi refusé" \
  --source "$FIXTURES/v105"

echo "── 5. Retour arrière possible, mais nommé ──"
importer --source "$FIXTURES/v105" --remplace-pointeur V106 >"$SORTIE" 2>&1 \
  || { cat "$SORTIE" >&2; exit 1; }
attendre pointeurApres V105
attendre changementDeMillesimeForce true
attendre rejeuSansEffet false
echo "  ✔ autorisé seulement en nommant le millésime remplacé"
# Le garde est symétrique : réavancer vers V106 le rencontre aussi, puisque ce
# millésime est lui aussi déjà en base. Aucun ordre n'étant garanti entre
# numéros de version, on ne peut pas reconnaître la direction « sûre ».
echo "── 5b. Symétrie du garde : réavancer se nomme aussi ──"
echec_attendu "réavancée vers un millésime déjà connu" "Changement de millésime servi refusé" \
  --source "$FIXTURES/v106"

echo "── 6. Une signature du praticien ne s'orpheline pas en silence ──"
# Un analyte, une correspondance SIGNÉE vers 1213 — acte que V106 ne contient
# plus. Importer V106 priverait cette signature de son acte : refus attendu.
node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  await c.query(`INSERT INTO biology_analytes
      (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,now()) ON CONFLICT DO NOTHING`,
    ["cb-test-ferritine","BIO_FERRITINE","Ferritine","sang","saisie_praticien","partielle"]);
  await c.query(`INSERT INTO biology_analyte_nabm
      (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
    VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT DO NOTHING`,
    ["cb-test-corresp","BIO_FERRITINE","1213","isole","praticien@wellneuro.fr"]);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'
echec_attendu "import qui orphelinerait une signature" "ne se résoudraient plus" \
  --source "$FIXTURES/v106" --remplace-pointeur V105

echo "── 7. Forçage explicite, avec avertissement ──"
importer --source "$FIXTURES/v106" --remplace-pointeur V105 --accepte-orphelines >"$SORTIE" 2>&1 \
  || { cat "$SORTIE" >&2; exit 1; }
attendre signaturesNonResolues 1
grep -q "hors nomenclature" "$SORTIE" || {
  echo "ÉCHEC — l'avertissement sur les signatures orphelines n'a pas été imprimé" >&2
  cat "$SORTIE" >&2; exit 1; }
echo "  ✔ forcé, signalé, et le régime documentaire bascule bien"

echo "── 8. On ne se trompe pas de base sans l'avoir écrit ──"
if node prisma/runWithAlias.js prisma/importNabm.ts --apply --confirmation "$JETON" \
     --base pas-le-bon-hote --allow-shrink --source "$FIXTURES/v105" >"$SORTIE" 2>&1; then
  echo "ÉCHEC — un hôte erroné a été accepté" >&2; cat "$SORTIE" >&2; exit 1
fi
grep -q "deux bases différentes" "$SORTIE" || {
  echo "ÉCHEC — refus obtenu, mais pas sur le contrôle d'hôte" >&2
  cat "$SORTIE" >&2; exit 1; }
echo "  ✔ --base doit nommer l'hôte réellement visé"

echo "── Table rase finale ──"
# TOUTE VALEUR SQL PASSE EN PARAMÈTRE, et ce n'est pas ici un réflexe de
# sécurité : ces blocs `node -e` sont délimités par des apostrophes simples,
# où une apostrophe littérale referme la chaîne du shell. Écrit en clair,
# `code = 'BIO_FERRITINE'` parvenait à Postgres sans ses quotes, donc lu comme
# un identifiant de colonne : « column bio_ferritine does not exist ».
# Le CI l'a vu ; ma vérification locale l'avait manqué parce qu'elle tuyautait
# la sortie dans grep — ce qui masque le code de retour du script.
node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  await c.query("DELETE FROM biology_analyte_nabm");
  await c.query("DELETE FROM biology_catalog_versions_courantes");
  await c.query("DELETE FROM biology_source_snapshots");
  await c.query("DELETE FROM biology_nabm_actes");
  await c.query("DELETE FROM biology_analytes WHERE code = $1", ["BIO_FERRITINE"]);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'

echo "CB-02a : banc d'intégration de l'import — 9 cas vérifiés."
