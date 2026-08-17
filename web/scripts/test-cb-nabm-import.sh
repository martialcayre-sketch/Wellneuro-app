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
JETON=CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1
export MIGRATE_DATABASE_URL="$DATABASE_URL"
export WN_CB_NABM_IMPORT_CONFIRMATION="$JETON"

FIXTURES=prisma/fixtures/nabm-test
SORTIE="$(mktemp)"
# Nettoyage inconditionnel : le fichier de sortie ET la colonne de test du
# cas 17. Sous `set -e`, un cas 17 qui échoue entre l'ADD COLUMN et le DROP
# laisserait une colonne de sémantique patient en base — le verrou HDS
# in-transaction ferait alors échouer le cas 1 de TOUT run suivant. Le DROP est
# idempotent (IF EXISTS) : inoffensif quand la colonne n'a pas été ajoutée.
nettoyer() {
  rm -f "$SORTIE"
  node -e '
    const {Client} = require("pg");
    (async () => {
      const c = new Client({connectionString: process.env.DATABASE_URL});
      await c.connect();
      await c.query("ALTER TABLE biology_analytes DROP COLUMN IF EXISTS id_patient");
      await c.end();
    })().catch(() => {});' 2>/dev/null || true
}
trap nettoyer EXIT

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

# Les deux cas suivants gardent le CÂBLAGE AUTOMATISÉ, où l'import n'a plus
# d'opérateur qui relit son contenu : ce sont les épingles posées en constantes
# dans `.github/workflows/release-db.yml` (leur unique lieu de définition depuis
# que le build Vercel n'écrit plus) qui tiennent lieu de relecture. Sans elles,
# un déclenchement de routine importerait le millésime que l'ANS aura publié
# entre-temps.
echo "── 9. Le millésime servi ne change pas sans PR ──"
echec_attendu "millésime non épinglé" "V106 attendu" \
  --source "$FIXTURES/v105" --version V106

echo "── 10. Un même millésime au contenu changé est refusé ──"
echec_attendu "empreinte non épinglée" "ne porte plus le contenu relu" \
  --source "$FIXTURES/v105" --version V105 \
  --sha256 0000000000000000000000000000000000000000000000000000000000000000

# Les trois cas suivants jouent le chemin NOMINAL du build, celui que les cas 9
# et 10 ne prouvent pas : un `--sha256` mal branché (champ renommé, comparaison
# inversée) les laisserait verts tout en faisant échouer la production pour
# toujours. On repart d'un catalogue vide — les correspondances signées, elles,
# restent en place : le contrat du cas 13 doit les voir se résoudre.
echo "── Remise à zéro du catalogue (les signatures restent) ──"
node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  await c.query("DELETE FROM biology_catalog_versions_courantes");
  await c.query("DELETE FROM biology_source_snapshots");
  await c.query("DELETE FROM biology_nabm_actes");
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'

echo "── 11. Chemin nominal du build : les bonnes épingles laissent passer ──"
# Le dry-run donne l'empreinte du millésime ; `--allow-shrink` parce que les
# fixtures tiennent quatre actes et non les 987 du plancher de volumétrie.
node prisma/runWithAlias.js prisma/importNabm.ts --allow-shrink \
  --source "$FIXTURES/v105" >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
# Lecture par motif, et non par `valeur` : cette dernière s'ancre sur la ligne
# « import NABM validé », absente d'un dry-run. Sans ancre elle prend la
# première accolade du fichier — celle de la bannière dotenvx, qui en contient.
SHA_V105="$(sed -n 's/.*"contenuSha256": "\([0-9a-f]\{64\}\)".*/\1/p' "$SORTIE")"
if [ ${#SHA_V105} -ne 64 ]; then
  echo "ÉCHEC — empreinte illisible dans le rapport de dry-run" >&2
  cat "$SORTIE" >&2; exit 1
fi
importer --source "$FIXTURES/v105" --version V105 --sha256 "$SHA_V105" \
  >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
attendre inseres 4
attendre pointeurApres V105
echo "  ✔ import effectué avec les épingles du build"

echo "── 12. Rejeu armé : la source n'est plus interrogée ──"
importer --source "$FIXTURES/v105" --version V105 --sha256 "$SHA_V105" \
  >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
grep -q "La source n'a pas été interrogée" "$SORTIE" || {
  echo "ÉCHEC — le rejeu armé a interrogé la source au lieu de sortir" >&2
  cat "$SORTIE" >&2; exit 1; }
echo "  ✔ une variable d'armement oubliée ne déclenche plus d'appel réseau"

echo "── 13. Les contrats du catalogue passent sur des données ──"
# En CI ces contrats ne rencontrent qu'une base VIDE : les invariants de données
# y sont muets. Ici il y a des données. Le contrat STRUCTUREL est le MÊME fichier
# que l'import rejoue dans sa transaction avant COMMIT ; le contrat de DONNÉES
# (dont la barrière D-003, portée par d'autres lots) n'est plus rejoué sur le
# chemin d'import — il reste un contrat de catalogue joué en CI.
npx prisma db execute --file prisma/checks/cb_biologie_structure_v1.sql \
  >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
npx prisma db execute --file prisma/checks/cb_biologie_catalogue_v1.sql \
  >"$SORTIE" 2>&1 || { cat "$SORTIE" >&2; exit 1; }
echo "  ✔ contrats structure + données verts sur un catalogue peuplé"

# La sortie anticipée du cas 12 tient à DEUX conditions : le millésime servi et
# son empreinte. Sans le cas suivant, retirer la condition d'empreinte laissait
# le banc vert — et faisait sortir « rien à faire » un import qui devait refuser.
echo "── 14. La sortie anticipée exige AUSSI l'empreinte ──"
echec_attendu "millésime servi mais empreinte divergente" "ne porte plus le contenu relu" \
  --source "$FIXTURES/v105" --version V105 \
  --sha256 1111111111111111111111111111111111111111111111111111111111111111

echo "── 15. Un jeton qui ne nomme pas le millésime est refusé ──"
# Sans ce contrôle, le millésime dans le jeton n'était qu'une convention : une
# PR qui aurait épinglé V106 sans renouveler le jeton aurait laissé valide une
# variable d'armement oubliée dans Vercel.
echec_attendu "jeton désaccordé du millésime épinglé" "ne nomme pas le millésime V106" \
  --source "$FIXTURES/v106" --version V106 \
  --sha256 2222222222222222222222222222222222222222222222222222222222222222

echo "── 16. Une épingle d'empreinte vide est refusée, pas ignorée ──"
echec_attendu "--sha256 réduit à rien" "64 caractères hexadécimaux" \
  --source "$FIXTURES/v105" --version V105 --sha256 "   "

echo "── 17. Une violation structurelle annule un import qui ÉCRIT (ROLLBACK effectif) ──"
# On repart d'un catalogue NABM VIDE pour que l'import INSÈRE réellement (premier
# import V105 = 4 actes, pointeur posé), puis on ajoute une colonne de sémantique
# patient. L'import doit alors insérer dans sa transaction, passer la relecture,
# puis buter sur le contrat STRUCTUREL rejoué avant COMMIT → RAISE → ROLLBACK. On
# vérifie ENSUITE que rien n'a survécu (0 acte, aucun pointeur) : c'est la garantie
# « rouge ⇒ rien écrit » éprouvée sur le chemin d'écriture RÉEL, pas sur un rejeu
# idempotent. Les correspondances signées restent en place (1213 est dans V105,
# donc pas d'orphelinage). Le DROP COLUMN est en outre garanti par le `trap` de
# sortie, au cas où ce cas échouerait avant sa propre restauration.
node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  await c.query("DELETE FROM biology_catalog_versions_courantes");
  await c.query("DELETE FROM biology_source_snapshots");
  await c.query("DELETE FROM biology_nabm_actes");
  await c.query("ALTER TABLE biology_analytes ADD COLUMN IF NOT EXISTS id_patient text");
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'
echec_attendu "violation structurelle pendant un import qui insère" "sémantique patient" \
  --source "$FIXTURES/v105"
# Preuve du ROLLBACK : l'insertion n'a pas survécu, le catalogue est resté vide.
restes="$(node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  const r = await c.query("SELECT (SELECT count(*) FROM biology_nabm_actes) + (SELECT count(*) FROM biology_catalog_versions_courantes) AS n");
  process.stdout.write(String(r.rows[0].n));
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });')"
if [ "$restes" != "0" ]; then
  echo "ÉCHEC — ROLLBACK incomplet : $restes ligne(s) subsistent après l'import annulé" >&2
  exit 1
fi
node -e '
const {Client} = require("pg");
(async () => {
  const c = new Client({connectionString: process.env.DATABASE_URL});
  await c.connect();
  await c.query("ALTER TABLE biology_analytes DROP COLUMN IF EXISTS id_patient");
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'
echo "  ✔ import qui insère annulé, catalogue vide après rollback, colonne retirée"

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
  // Supprimer les lignes dépendantes avant l'analyte (contraintes FK).
  await c.query("DELETE FROM biology_panel_items WHERE analyte_code = $1", ["BIO_FERRITINE"]);
  await c.query("DELETE FROM biology_functional_ranges WHERE analyte_code = $1", ["BIO_FERRITINE"]);
  await c.query("DELETE FROM biology_reference_ranges WHERE analyte_code = $1", ["BIO_FERRITINE"]);
  await c.query("DELETE FROM biology_preanalytics WHERE analyte_code = $1", ["BIO_FERRITINE"]);
  await c.query("DELETE FROM biology_analyte_links WHERE analyte_code = $1", ["BIO_FERRITINE"]);
  await c.query("DELETE FROM biology_analytes WHERE code = $1", ["BIO_FERRITINE"]);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });'

echo "CB-02a : banc d'intégration de l'import — 18 cas vérifiés."
