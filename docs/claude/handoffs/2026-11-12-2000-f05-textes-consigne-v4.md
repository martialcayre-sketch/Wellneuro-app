# Handoff — 2026-11-12 — F05, textes des fiches d'usage : pilote fer sous la v3, consigne v4 (D-501 §7)

## Branche et état Git

`f05-textes-v4`, créée sur `origin/main` (6e526a16) dans le worktree
`b-fiche-usage-iode-selenium`. #2031 (D-501 §5-§6, v3) est mergée
(f968eb81). Commit de la v4, PR #2042, puis fusion de `origin/main` (sur
arbitrage) et commit de l'approbation.

## Objectif

Faire passer la rubrique « question » des fiches d'usage, refusée par la
contre-lecture même quand elle ne fait que nommer l'usage signé, sans rien
relâcher sur les faits.

## Décisions prises

- Arbitrage du responsable (question à options) : rejouer une fois en v3
  les cinq fiches fer refusées ; FU_FER_P3 est retenue au rejeu.
- Arbitrage du responsable (question à options) : préparer la v4
  (D-501 §7, statut proposé). La rubrique « question » se compose des seules
  désignations approuvées et de la réserve du statut d'usage ; la
  contre-lecture la juge alors fidèle, tout autre élément est un fait.
- V4 approuvée par le responsable (question à options, « v4 + rubriques
  P3 et P4 », sans avis Codex demandé), avec délégation explicite de la
  validation des rubriques de P3 et P4 (D-501 §7).
- Fusion de `origin/main` dans la branche sur ce même arbitrage.
- Revue PR-Agent : D-314 §3 ne prévoyait pas de délégation. Arbitrage du
  responsable (question à options) : l'inscrire, D-509 (réservée), qui
  amende D-314 §3 ; les six actes restent.

## Fichiers modifiés

- `tools/corpus/fiches-usage/consignes/redaction.md` et
  `consignes/contre-lecture.md` (paragraphe « question »),
  `lib/consigne.mjs` (v4, `28ece7ee8ab1922d`), `lib/consigne.test.mjs`
  (banc v4), `README.md`.
- `docs/decisions/D-501.md` (§7), `docs/TRUST_IA_FICHES_USAGE.md`,
  `changelog.d/2026-11-12-d501-consigne-fiches-usage-v4.md`, journal F05
  `2026-11-12-04`.

## Validations exécutées

- Les deux libellés de population du fer validés à l'écran par le
  responsable : 2 actes constatés par conteneur (one-off-2589).
- Désignations tirées en lecture seule (2 populations, 11 analytes), écrites
  hors dépôt dans `~/.wellneuro/corpus/fiches-usage/designations.json`.
- Pilote fer v3 : P4 retenue ; rejeu de P1, P2, P3, P5, P6 : P3 retenue.
  `deposer.mjs --validate` puis dépôt sur app.wellneuro.fr :
  `BROUILLON_DEPOSE` n° 1 chacune. Constat par conteneur (one-off-7615) :
  2 versions fer (P3, P4), structure `e59d35c3`, consigne v3, 0 acte.
- Bancs de l'outil et T1 : voir la PR.

## Problèmes ouverts

- Validation déléguée faite : six actes (P4 entière, P3 question et
  population), constatés par conteneur (one-off-1854). **P3
  « interprétations » reste sans acte** : sa première phrase recopie deux
  axes signés comme un fait ; à rédiger de nouveau (version n° 2 sous la
  v4).
- Le `RAG_INTERNAL_SECRET` de `web/.env.local` (copie principale) n'est
  toujours pas celui de la production : le dépôt passe le secret de
  production au seul processus. Mise à jour du fichier : geste du
  responsable.

## Prochaine action exacte

Après l'approbation et le merge de la v4 : `rediger.mjs --fiche
FU_FER_P1,FU_FER_P2,FU_FER_P5,FU_FER_P6 --designations
~/.wellneuro/corpus/fiches-usage/designations.json --claims
~/.wellneuro/corpus/claims/f05-epingles-2026-11-12.json`, puis
`deposer.mjs --validate`, `--cible https://app.wellneuro.fr`, constat par
conteneur. FU_FER_P3 se rédige de nouveau sous la v4 (version n° 2, ses
trois rubriques à revalider). Ensuite, un dossier par lot.

## Interdits encore actifs

- Production en lecture seule, par conteneur ; un dépôt passe par la route
  interne, jamais par un SQL.
- Aucun texte de fiche, de libellé ni de claim dans le dépôt (D-251 §4).
- Validation et signature : gestes du responsable seul, sauf délégation
  explicite.
- Ne pas toucher à `ficheUsageBesoin2V1.ts` sans D-xxx ni re-signature.
- Pas de pull, merge ni rebase d'une branche qui a des commits sans
  arbitrage.
