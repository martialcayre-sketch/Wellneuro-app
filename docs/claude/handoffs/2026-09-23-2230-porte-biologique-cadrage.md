# Handoff — 2026-09-23 — La porte biologique des assiettes, cadrée (D-245)

## 1. Branche et état Git

`wn-chantier6-porte-biologique-2026-09-23`, worktree
`.claude/worktrees/porte-biologique`, partie de `origin/main` à `d963be29`.
LOT-00 : documentation seule.

## 2. Objectif

Cadrer le chantier 6 (porte biologique d'une indication d'assiette, ouvert par
`D-236` §4) avant tout code, parce qu'il bute sur `D-157` (la comparaison
résultat ↔ borne est un geste du praticien) et `D-122` (règle clinique neuve).

## 3. Décisions prises

- `D-245` : premier étage **documentaire** (claims cités entiers + dernier
  résultat, aucune comparaison) ; porte automatique après bilan d'usage ;
  module signé à part pour ne pas éteindre les 7 assiettes servies ; l'oméga 3
  emporte une migration (deux analytes).
- Écarté : amender `D-157` d'emblée (arbitrage du responsable) ; placer les
  liens dans la table des indications (périmerait sa signature).
- `D-245` §5 : AA/EPA et index oméga 3 entrent comme **valeurs rendues par le
  laboratoire** ; « pas de ratio en V1 » (`D-122` §2) vise `BiologyRatio`
  calculé — précision arbitrée après le constat de revue de la PR #1215.

## 4. Fichiers modifiés

`docs/claude/campagnes/CADRAGE_PORTE_BIOLOGIQUE_ASSIETTES_2026-09-23.md` (créé)
· `docs/DECISIONS.md` · `changelog.d/2026-09-23-porte-biologique-cadrage.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

Lecture du corpus en production, lecture seule, deux one-off détachés
(`one-off-3117`, `one-off-7506`) : textes des claims recopiés mot pour mot.
T1 avant la PR.

## 6. Problèmes ouverts

- Sélection des claims **rendue le 2026-09-23** (cadrage §6) : 0340-007 et
  0292-005 écartés, homocystéine à trois seuils, KYN/TRP sans nombre.
- Épargne digestive et psychobiotique : recherche bornée à quatre marqueurs ;
  d'autres marqueurs (IgA sécrétoires, métabolome) restent à chercher.
- KYN/TRP : aucune borne chiffrée dans les sources.
- Deux claims de cas cliniques portent une unité fausse pour la CRP — à signaler
  à la curation.
- Trois contradictions de documentation sur l'état des drapeaux (cadrage §7).

## 7. Prochaine action exacte

Après merge : LOT-01, **migration seule** (`BIO_INDEX_OMEGA3` en `%`,
`BIO_RATIO_AA_EPA` en `ratio`), PR seule, puis `release-db` approuvée et constat
par conteneur. En parallèle, le responsable choisit les claims de §3.

## 8. Interdits encore actifs

Ne pas toucher `indicationsAssiettesV1.ts` (sa signature couvre les 7 assiettes
servies). Aucune borne chiffrée dans le code du premier étage. Un seul merge à la
fois, déploiement constaté avant le suivant (recul du 2026-09-23).
