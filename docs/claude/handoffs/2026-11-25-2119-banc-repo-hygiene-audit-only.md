# Handoff — lot `banc-repo-hygiene-audit-only` : banc de `scripts/repo-hygiene.sh` (2026-11-25)

## 1. Branche et état Git

- Branche `claude/clever-mayer-ptdnbg`, tirée d'`origin/main` à 29033921 (passe cloud de l'orchestrateur,
  journal `20261125-2108-orch`).
- Carnet : le lot `banc-repo-hygiene-audit-only` (file D, ordre 120, P1, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `banc-repo-hygiene-audit-only--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; rien à accuser.

## 2. Objectif

Un banc hermétique pour `scripts/repo-hygiene.sh`, joué chaque jour en `audit-only` par la passe cloud
(`ORCHESTRATEUR_PASSE.md` §5) : `audit-only` laisse l'arbre identique et produit son rapport ; un argument
inconnu échoue ; contre-épreuve `apply-safe` dans le seul dépôt jetable. Inscription à
`bancs-outillage-check` et au CI.

## 3. Décisions prises

- Patron `scripts/nettoyage-branches.test.mjs` : dépôt git jetable, crochets globaux et signature GPG
  neutralisés, aucun réseau.
- « Un argument inconnu échoue » est tenu sur ce qui échoue réellement : une commande inconnue (2) et une
  option inconnue d'`apply-safe` (2). `audit-only` ignore une option inconnue (elle part dans `REM_ARGS`,
  jamais lue) : constaté, non testé comme promesse, puisque le comportement du script est hors périmètre.
- Le banc joue le script avec `cwd` = `--root`, comme la passe ; la promesse « jamais hors de `--root` » est
  écrite sous cette condition en tête du banc (P2-1 de `wn-reviewer`).
- Le `--dry-run` crée ses dossiers d'archive et `moved-map.tsv` : le titre du test dit « ne déplace ni ne
  modifie aucun fichier », ce qu'il prouve, et rien de plus.
- Inscription au CI dans l'étape existante « Outillage de l'intégrateur, de l'orchestrateur et des paliers
  (bancs) », sans nouvelle étape.

## 4. Fichiers modifiés

- `scripts/repo-hygiene.test.mjs` (nouveau, 5 tests).
- `web/package.json` (`bancs-outillage-check`), `.github/workflows/ci.yml` (étape d'outillage et son
  commentaire).
- `changelog.d/2026-11-25-banc-repo-hygiene.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/repo-hygiene.test.mjs` → 5/5 ; et 5/5 avec un `PATH` privé de `rg` (le repli `grep`
  de `search_fixed`).
- `node --test scripts/parite-check-ci.test.mjs scripts/ci-invariants.test.mjs scripts/wn-check-rapide.test.mjs`
  → 108/108.
- `wn-reviewer` → GO, sans P1. Ses deux P2 sont traités : HEAD et références comparés en `audit-only`, et la
  promesse `cwd` = `--root` écrite. Ses P3 sont traités aussi : dossiers dans l'empreinte, écriture hors
  racine en `audit-only`, fichier non suivi déplacé, double occurrence sur une ligne, contenus des rapports,
  `commit.gpgsign`.
- Harnais de mutations du relecteur rejoué sur le banc corrigé : les 8 mutations qui survivaient (commit,
  branche, `mkdir`, fuite hors racine, `mv` neutralisé, `sed` sans `g`, dormants vides, quasi vides) sont
  toutes tuées.
- T1 (`cd web && npm run check:rapide`) → code 0, après `npm ci` et `prisma generate` dans le clone frais.
- T2/T3 non joués : interdits en passe cloud ; le diff ne touche qu'un banc node et deux listes de bancs.

## 6. Problèmes ouverts

- **Défaut du script, hors périmètre, routé ici** (P2-1 de `wn-reviewer`). `move_file_safe`
  (`scripts/repo-hygiene.sh` l. 188 et 197) fait son `mkdir -p` et son `mv` avec des chemins relatifs au
  `cwd`, pas à `--root`. Lancé avec `cwd` ≠ `--root`, `apply-safe` crée `docs/archive/…` dans le `cwd` et
  échoue sur un fichier non suivi. `audit-only`, seul joué par la passe, n'est pas touché. Candidat pour un
  lot du carnet (inscription par le responsable ou une session de file, jamais par une passe).
- `audit-only` accepte une option inconnue sans erreur (même cause : `REM_ARGS` jamais lu).
- `report-pr` n'est pas couvert (option inconnue, `--write` sans valeur, `--write` hors racine).
- Le repli sans `rg` n'est joué que sur un poste sans `rg` : vérifié ici à la main, mais pas garanti par le
  banc.
- macOS, bash 3.2 : non joué ici. Le banc n'utilise ni `mapfile`, ni `sed -i` sans suffixe.

## 7. Prochaine action exacte

CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0 ; un
verdict par commentaire ; « prête @<sha> » ; l'intégrateur merge.

## 8. Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni réponse à une question, ni second lot, ni T2/T3, ni inscription
  de lot.
- Hors périmètre : le comportement de `repo-hygiene.sh` ; `apply-safe` en réel sur le dépôt ; tout
  nettoyage du dépôt.
- Aucune identité dans les fixtures ; aucun secret.
