# Handoff — lot `banc-garde-campaign-audit` : banc du garde `campaign-audit-check` (2026-11-25)

## 1. Branche et état Git

- Branche `claude/clever-mayer-pep85c`, tirée d'`origin/main` à 434fb9b6 (passe cloud de l'orchestrateur,
  journal `20261125-2009-orch`).
- Carnet : le lot `banc-garde-campaign-audit` (file D, ordre 119, P1, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `banc-garde-campaign-audit--v1` à l'état `prise`.
- Boîte D lue au départ : une ligne `emis` (`merge_fait` #2369), passée à `lu` ; informative.

## 2. Objectif

Un banc pour le garde bloquant `campaign-audit-check` : au moins un cas rouge par code de sa ligne
(`--fail-on-warning-codes`) et un cas conforme, hermétique.

## 3. Décisions prises

- La fiche datait d'avant #2369, qui a créé `scripts/wn-campaign-audit.test.mjs` (statut « transféré ») et
  l'a déjà inscrit à `bancs-outillage-check` et à l'étape du CI. Le lot étend ce fichier au lieu d'en créer
  un : ni `web/package.json` ni `.github/workflows/ci.yml` ne sont touchés.
- Les codes sont relus dans la ligne de `web/package.json`, pas recopiés : un code ajouté sans cas, ou
  retiré de la ligne, rougit le banc.
- Chaque cas rouge prouve aussi l'attribution : la même fixture rend 0 quand son code est retiré de la liste.
- Le nom de l'étape CI (« statut transféré ») n'est pas renommé : changement minimal.

## 4. Fichiers modifiés

- `scripts/wn-campaign-audit.test.mjs` — 19 tests ajoutés (25 au total).
- `changelog.d/2026-11-25-banc-garde-campaign-audit.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/wn-campaign-audit.test.mjs` → 25/25.
- Mutations sur copie hors dépôt : `push` de `idle_with_active_fields`, `status_drift_between_roots`,
  `missing_audit_root` neutralisé → 1 rouge chacun ; code retiré de la ligne → 2 rouges ; `--no-fail` ajouté
  à la ligne → 9 rouges.
- `wn-reviewer` → GO ; son P2 (un drapeau ajouté à la ligne passait inaperçu) et son P3 (lecture fragile de la
  ligne) corrigés par un test de forme exacte de la ligne.
- T1 (`cd web && npm run check:rapide`) → code 0 (après `npm ci` et `prisma generate` dans le clone frais).
- T2/T3 non joués : interdits en passe cloud ; le diff ne touche qu'un banc node.

## 6. Problèmes ouverts

- Constat, non corrigé (hors périmètre) : la ligne `campaign-audit-check` ne passe pas `--root`, donc les
  trois codes de miroir n'y sonnent jamais. Les retirer ou ajouter un miroir relève d'un autre lot.
- `ci.yml` l.197 répète la liste de codes ; sa parité est gardée par `scripts/parite-check-ci.test.mjs`.

## 7. Prochaine action exacte

CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0, un
verdict par commentaire, « prête @<sha> » ; l'intégrateur merge.

## 8. Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni réponse à une question, ni second lot, ni T2/T3.
- Hors périmètre : le comportement de `wn-campaign-audit.mjs`, la ligne `campaign-audit-check`, `web/src`.
- Fixtures aux seules identités neutres (aucune identité ici) ; aucun secret.
