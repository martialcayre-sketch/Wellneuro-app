# Handoff — lot `repo-hygiene-move-file-safe-racine` : `move_file_safe` résout ses chemins contre `--root` (2026-11-27)

## 1. Branche et état Git

- Branche `claude/clever-mayer-ai7ke8`, tirée d'`origin/main` à 07be7622 (passe cloud de l'orchestrateur,
  journal `20261127-0708-orch`).
- Carnet : le lot `repo-hygiene-move-file-safe-racine` (file D, ordre 125, P2, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `repo-hygiene-move-file-safe-racine--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; rien à accuser.

## 2. Objectif

`move_file_safe` (`scripts/repo-hygiene.sh`) faisait `mkdir -p` et `mv` avec des chemins relatifs au `cwd`,
pas à `--root` : lancé d'ailleurs, `apply-safe` créait `docs/archive/…` dans le `cwd` et échouait sur un
fichier non suivi (P2-1 de `wn-reviewer` sur #2374, fiche : handoff
`2026-11-25-2119-banc-repo-hygiene-audit-only.md` §6). Résultat observable : une scène neuve au banc, rouge
avant et verte après, et les tests existants verts ; `audit-only` inchangé.

## 3. Décisions prises

- Correctif minimal : le `mkdir -p` et le `mv` du fichier non suivi passent par `abs_path` (fonction déjà
  présente, résout contre `$ROOT`). `git -C "$ROOT" ls-files` et `git -C "$ROOT" mv` résolvaient déjà contre
  la racine : inchangés. Les chemins affichés (`MOVE …`) et `moved-map.tsv` restent relatifs à la racine.
- Deux scènes neuves plutôt qu'une : `apply-safe` depuis un `cwd` hors racine (déplacements arrivés dans la
  racine, `cwd` vide, rien hors de la racine) et son `--dry-run` (le `mkdir` du dry-run écrivait aussi dans
  le `cwd`). Helper `jouerDepuis(env, cwd, …)` ; `jouer` y délègue avec `cwd` = racine.
- En-tête du banc mis à jour : il ne décrit plus le défaut comme routé.
- Revue : P2, PR-Agent sur la tête (`D-499`) ; pas de `wn-reviewer` (risque P2, outillage d'hygiène hors
  routine).

## 4. Fichiers modifiés

- `scripts/repo-hygiene.sh` (`move_file_safe`).
- `scripts/repo-hygiene.test.mjs` (helper, en-tête, deux scènes).
- `changelog.d/2026-11-27-repo-hygiene-move-file-safe-racine.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/repo-hygiene.test.mjs` avant le correctif : 5/7, les deux scènes neuves rouges
  (`mv: cannot stat 'docs/claude/reprise/reprise-locale.md'` ; « écriture dans le cwd » au dry-run). Après :
  7/7.
- `audit-only` : `move_file_safe` n'est pas sur son chemin ; la scène « arbre identique à l'octet » du banc
  reste verte.
- T1 `npm run check:rapide` → 0 et `npm run check` → 0 (1352 réussis, 0 échec), après `npm ci` et
  `prisma generate` dans le clone frais. T2/T3 non joués (passe cloud, `D-540`).

## 6. Problèmes ouverts

- `audit-only` accepte toujours une option inconnue sans erreur (`REM_ARGS` jamais lu) ; `report-pr` reste
  sans banc. Hors périmètre de ce lot, déjà notés dans le handoff du 2026-11-25 §6 : à inscrire au carnet
  par une session qui inscrit (la passe n'inscrit pas).
- macOS, bash 3.2 : non joué ici ; le correctif n'emploie que `dirname` et une fonction existante.

## 7. Prochaine action exacte

Merge par l'intégrateur après PR-Agent sur la tête.

## 8. Interdits encore actifs

- `audit-only`, `report-pr` et le traitement de `REM_ARGS` intouchés ; aucun nettoyage réel du dépôt.
- Passe cloud : ni merge, ni T2/T3, ni second lot.
