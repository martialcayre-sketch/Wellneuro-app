# Handoff — lot `campaign-audit-codes-miroir-ligne` : trois codes de miroir retirés de la ligne bloquante (2026-11-26)

## 1. Branche et état Git

- Branche `claude/clever-mayer-bnv74p`, tirée d'`origin/main` à 32380ddf (passe cloud de l'orchestrateur,
  journal `20261126-2309-orch`).
- Carnet : le lot `campaign-audit-codes-miroir-ligne` (file D, ordre 124, P1, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `campaign-audit-codes-miroir-ligne--v1` à l'état `prise`.
- Boîte D lue au départ : une ligne `emis`, `20261126-2237-integrateur-d-2379` (#2379 mergée ; #2380 peut
  recalculer sa fusion), passée à `lu`. Elle appelle un geste hors de ce lot (#2380) : laissée `lu`.

## 2. Objectif

La ligne `campaign-audit-check` (`web/package.json`) et l'étape bloquante de `.github/workflows/ci.yml`
armaient `missing_in_mirror`, `extra_in_mirror` et `status_drift_between_roots` sans `--root` : avec la
seule racine par défaut, `compareRoots` ne joue pas et ces codes ne pouvaient pas sonner. Résultat
observable : chaque code armé peut réellement sonner, `main` vert.

## 3. Décisions prises

- Constat : aucun miroir vivant de `docs/claude/campagnes`. `.wn/campaigns/active` est vide ;
  `.wn/campaigns/archive` ne tient que `wn-doc-assainissement`, campagne « Terminée (2026-07-11) — archivée
  le 2026-07-14 », dont le fichier est `campagne.md` (l'audit exige `CAMPAGNE.md`). Branche du lot : retirer
  les trois codes, pas câbler `--root`.
- Troisième copie de la même liste, dans `scripts/wn-test-worktree.sh` (audit de campagne de T3) : alignée
  dans le même diff, pour que les trois lignes gardent une liste identique.
- Banc : `redCases` ne porte plus que les quatre codes de la ligne ; les trois cas de miroir passent dans
  `mirrorCases`, joués avec leurs propres codes et `--root` (mécanisme de `compareRoots` toujours prouvé) ;
  chacun vérifie aussi qu'il ne rougit pas la ligne. Un test neuf rougit si un code de miroir revient sur
  la ligne. Le cas « principal et miroir identiques » se joue avec les codes de miroir.
- `scripts/README.md` (quatrième copie, documentaire, non gardée) laissé à sept codes : son blob sur `main`
  est en CRLF alors que `.gitattributes` impose `eol=lf`, et toute retouche le réécrit en entier (constat
  PR-Agent sur d93812c3). Retiré du diff ; routé en problème ouvert.
- `wn-campaign-audit.mjs` et les fichiers de campagne : inchangés (hors périmètre).

## 4. Fichiers modifiés

- `web/package.json` (`campaign-audit-check`), `.github/workflows/ci.yml` (« Campaign rules audit
  (blocking) »), `scripts/wn-test-worktree.sh`.
- `scripts/wn-campaign-audit.test.mjs`.
- `changelog.d/2026-11-26-campaign-audit-codes-miroir-ligne.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/wn-campaign-audit.test.mjs` → 29/29 ; `node --test scripts/parite-check-ci.test.mjs`
  → 83/83 ; `npm run campaign-audit-check` sur l'arbre → 0.
- `node scripts/wn-campaign-audit.mjs --root docs/claude/campagnes,.wn/campaigns/archive` : 51 campagnes,
  toutes principales ; aucune lue sous l'archive (constat du miroir absent).
- T1 `npm run check:rapide` → 0 (après `npm ci` et `prisma generate` dans le clone frais) ; T1 complet
  `npm run check` : résultat dans la déclaration « prête ». T2/T3 non joués (passe cloud, `D-540`).
- Revue `wn-reviewer` (P1) avant le push : GO, aucun P0/P1 ; mutations jouées en copie (code de miroir
  remis sur la ligne, `--root` ajouté, chaque `warnings.push` neutralisé, `compareRoots` retiré) : chacune
  rougit le banc. P2 corrigés : deux formulations du fragment, codes du cas « miroir identique » ; P2 README
  routé (ci-dessous). PR-Agent sur d93812c3 : « Réécriture hors périmètre » (README en CRLF normalisé) →
  corrigé, README retiré du diff.

## 6. Problèmes ouverts

- Sur un système de fichiers insensible à la casse (macOS), `.wn/campaigns/archive/wn-doc-assainissement`
  serait lue comme une campagne si quelqu'un passait cette racine en `--root` ; aucune ligne ne le fait.
  Préexistant, sans effet aujourd'hui [Hypothese].
- `scripts/wn-test-worktree.sh` (troisième copie de la liste) n'est gardée par aucun banc de parité, et le
  commentaire de `scripts/parite-check-ci.test.mjs` parle de « DEUX exemplaires ». Préexistant, hors du
  lot : à inscrire au carnet par une session qui inscrit (la passe n'inscrit pas).
- `scripts/README.md` documente encore la ligne à sept codes, et son blob est en CRLF contre `eol=lf` : un
  lot de normalisation des fins de ligne (ce fichier seul, diff d'espaces) puis l'alignement sur quatre codes.
  À inscrire au carnet.
- Ligne de boîte `20261126-2237-integrateur-d-2379` restée `lu` : le recalcul de la fusion de #2380 revient
  à la session qui tient #2380.

## 7. Prochaine action exacte

Merge par l'intégrateur après PR-Agent sur la tête.

## 8. Interdits encore actifs

- `scripts/wn-campaign-audit.mjs` et `compareRoots` intouchés ; aucune détection effective affaiblie.
- Passe cloud : ni merge, ni T2/T3, ni second lot.
