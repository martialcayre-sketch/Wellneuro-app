# Handoff — 2026-10-24 — F79, premier temps : dix-sept liens analyte-axe signés (D-351)

## Branche et état du dépôt

- Branche `feat/f79-liens-analyte-axe-curation`, partie de `origin/main`
  (c6518a79), worktree `bio-ingest-cloture`. Session concurrente, cycle en
  `git`/`gh` direct. Documentation seule : aucune migration, aucun code.

## Objectif

Préparer les signatures des liens analyte-axe (F79) par la curation, sans
écriture en base : relire la production, rédiger les liens candidats au
Claude Doc privé, faire trancher les arbitrages, puis verser la décision en
forme opaque.

## Décisions prises

- Liste signée le 2026-10-24, sans correction, au Claude Doc privé
  « F79 — Liens analyte-axe candidats (signée) » (doc `4849edf2-…`).
- D-351 : dix-sept liens (§2), règle de curation (§1), six réserves (§3),
  `niveau_preuve` rendu nullable (§4), migration de données relue comme
  véhicule (§5).
- Douze arbitrages : huit sur la recommandation, quatre contre (deux liens
  du rapport kynurénine/tryptophane, cortisol salivaire à deux temps,
  coenzyme Q10 et AGCC fécaux, alpha-amylase vers `corticotrope`).
- La correspondance panel → axe n'est pas nécessaire à F79 ; elle reste
  ouverte pour F53.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-351 en tête).
- `docs/claude/PLAN_WELLNEURO.md` (F52 : constat ; F79 : véhicule et mise à
  jour).
- `changelog.d/2026-10-24-d351-liens-analyte-axe.md`.
- `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Production en lecture seule, transaction `READ ONLY` close par
  `ROLLBACK`, conteneurs détachés one-off-9987 et one-off-1677 : 0 ligne
  dans `biology_analyte_links` ; 8 CHECK, dont
  `biology_analyte_links_cible_axe_check` sur les dix codes ; 92 analytes
  actifs, 0 ligne dans `biology_ratios` ; 8 564 claims certifiés, dont 8 175
  sans niveau de preuve ; 1 064 claims certifiés citant un analyte du
  catalogue, tous lus pour la curation.
- Les dix-sept `claim_id` du §2 sont sortis de la requête filtrée sur
  `VALIDE`, actifs, non supplantés, en version v1.0.
- Forme opaque : D-351 et le fragment cherchés pour des noms de maladie, des
  populations, des médicaments et des textes de claim, sans résultat.
- T1 (`npm run check:rapide`) et anti-secrets : voir la PR.

## Problèmes ouverts

- Correspondance panel → axe (D-348 §7), pour F53.
- Renvoi des trois claims à l'atelier (D-348 §6) ; classement de
  WN-SRC-0236.
- Le client Scalingo local est en 1.50.0 (1.51.0 disponible).

## Prochaine action exacte

CI, revue CodeRabbit sur le sha de tête, merge. Puis, dans une session
neuve, la migration de D-351 §5 : `niveau_preuve` nullable
(`schema.prisma` et SQL), insertion des dix-sept liens, contrat SQL de la
liste exacte, relecture des dix-sept claims en production juste avant, passe
Codex, T3, release-db approuvée, constat par conteneur.

## Interdits encore actifs

- Production en lecture seule ; écriture seulement par migration relue, puis
  release-db approuvée, une seule à la fois.
- Aucun pull, merge ni rebase sans l'arbitrage du responsable.
- Aucun merge sans une revue de CodeRabbit sur le sha de tête.
- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT` ; jamais `err.message` dans
  les logs.
- Aucun texte clinique, libellé d'hypothèse ni identité réelle dans le
  dépôt : identifiants et mécanismes seulement.
