# Handoff — lot `kit-doctor-secrets-verdict-exact` : verdict secrets du kit doctor par répertoire (2026-11-25)

## 1. Branche et état Git

- Branche `claude/clever-mayer-0bgby1`, tirée d'`origin/main` à ef841f1b (passe cloud de l'orchestrateur,
  journal `20261125-2209-orch`).
- Carnet : le lot `kit-doctor-secrets-verdict-exact` (file D, ordre 121, P2, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `kit-doctor-secrets-verdict-exact--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; rien à accuser.

## 2. Objectif

`checkNoSecrets` (`scripts/wn-kit-doctor.mjs`) recopiait un unique booléen sur ses trois lignes : une
occurrence documentaire sous `docs/` rougissait `.wn/` et `.claude/` sans nommer le fichier (40/43 sur
`main`). Rendre le verdict par répertoire, fichier et motif nommés, exemptions alignées sur
`scripts/check_no_secrets.sh` ; banc neuf inscrit à `bancs-outillage-check` et au CI.

## 3. Décisions prises

- Une ligne par groupe de racines : `.wn/`, `.claude/` (`skills`, `agents`), `.github/prompts/`, `docs/`.
  La quatrième ligne porte une racine que le doctor lisait déjà sans l'attribuer à aucune ligne : 44 contrôles
  au lieu de 43.
- Détail d'une ligne rouge : `fichier : 'motif'`, triés, séparés par « ; » — jamais la valeur trouvée. Une
  racine absente est nommée (« absent », ou « `.claude/agents` absent » si une sur deux manque).
- Exemptions alignées sur `GREP_EXCLUDES` (répertoires `.git`, `node_modules`, `.next`, `generated`,
  `pgdata` ; fichiers `check_no_secrets.sh`, `package-lock.json`, `*.lock`, `.env*.local*`). L'ancien
  `startsWith(".git")` excluait aussi `.github` sous une racine : il est lu désormais (contre-épreuve au banc).
- Motifs, extensions lues (`.md`, `.yml`, `.json`) et racines inchangés : aucune détection affaiblie, aucune
  élargie (hors périmètre).
- Défaut voisin corrigé, nécessaire au banc : `actionCheck` évaluait `every(c => (c.print(), …))`, qui
  cessait d'imprimer au premier bloc rouge — SECURITY absent dès que GIT était sale, et toujours absent dans
  une fixture (STRUCTURE rouge). Chaque bloc s'imprime ; le code de sortie est inchangé.
- Banc par fixtures : le doctor joué avec `cwd` = la fixture (sa racine est `process.cwd()`), `GIT_*`
  retirés de l'environnement ; aucun refactoring du script pour l'importer.

## 4. Fichiers modifiés

- `scripts/wn-kit-doctor.mjs` (`checkNoSecrets` et ses aides ; impression de `actionCheck`).
- `scripts/wn-kit-doctor.test.mjs` (nouveau, 9 tests).
- `web/package.json` (`bancs-outillage-check`), `.github/workflows/ci.yml` (étape d'outillage et son
  commentaire).
- `changelog.d/2026-11-25-kit-doctor-secrets-verdict-exact.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/wn-kit-doctor.test.mjs` → 9/9 ; contre-épreuve sur le doctor de `main` → 0/9.
- `node scripts/wn-kit-doctor.mjs check` sur l'arbre : `.wn/`, `.claude/`, `.github/prompts/` verts ;
  `docs/` rouge, nommant `docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-11-07.md`
  et le motif `DATABASE_URL=` (prose : `DATABASE_URL=<url imprimée>`, aucun secret).
- `node --test scripts/parite-check-ci.test.mjs scripts/ci-invariants.test.mjs` → 103/103.
- `/code-review medium` : 5 constats. Corrigés : racine absente sur deux non dite ; `GIT_*` hérités dans le
  banc. Précisés dans le commentaire et le changelog (comportement préexistant, hors périmètre) : seules trois
  extensions sont lues ; `.claude/` ne couvre que `skills` et `agents`. Écarté : un répertoire illisible fait
  planter le doctor — préexistant, hors du lot, sans cas dans un clone git.
- T1 `npm run check:rapide` → 0 (après `npm ci` et `prisma generate` dans le clone frais) ; T1 complet
  `npm run check` : résultat dans la déclaration « prête ». T2/T3 non joués (passe cloud, `D-540`).

## 6. Problèmes ouverts

- `docs/` reste rouge sur `main` : l'occurrence est de la prose documentaire. La rendre verte demanderait
  soit de reformuler ce prompt de campagne, soit des motifs à valeur (comme `check_no_secrets.sh`) — les deux
  hors de ce lot ; à cadrer si la ligne gêne [Hypothese].
- Le doctor ne lit que `.md`, `.yml`, `.json` et, sous `.claude/`, que `skills` et `agents` ; un répertoire
  illisible le fait planter. Préexistant, non routé au plan (diagnostic, pas un garde).

## 7. Prochaine action exacte

Merge par l'intégrateur après PR-Agent sur la tête.

## 8. Interdits encore actifs

- `scripts/check_no_secrets.sh` intouché ; aucune détection affaiblie ; autres sections du doctor inchangées.
- Passe cloud : ni merge, ni T2/T3, ni second lot.
