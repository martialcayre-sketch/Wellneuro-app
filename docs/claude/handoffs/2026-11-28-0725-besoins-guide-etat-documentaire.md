# Handoff — 2026-11-28 — État documentaire du guide des 12 besoins (lot besoins-guide-etat-documentaire, file D)

## Branche et état Git

- Branche `claude/clever-mayer-cj1o39`, à `origin/main` (`2e6e78b3`) au départ.
- Un commit de documentation, poussé ; PR ouverte par la passe de
  l'orchestrateur cloud (journal `20261128-0708-orch`).

## Objectif

Remplacer les seules lignes d'état périmées du guide des 12 besoins par
l'état appliqué, avec renvoi à la décision. Quatrième des six lots inscrits
sur la réponse à `20261127-2046-b`.

## Décisions prises

- Les lignes visées sont des renvois d'état posés à la réécriture de chaque
  section (`D-516` §7 : « réécrite dans cette forme opaque, avec renvoi à
  cette décision ») ; le texte signé est celui de la décision. Aucune ligne
  changée ne porte une règle, un seuil ou une part : le lot n'est donc pas
  rangé `bloque`.
- Vague 1 vérifiée sur `origin/main` : `web/src/lib/equilibre/constants.ts:236`
  (v16/v17 → v18/v19, `D-548`) ; puis v20/v21 (`D-565`, besoin 12).
- Besoins 1, 4, 5, 9 : « Application : lot J3-12f » → « appliqué par `D-548`
  (vague 1) », texte du lot.
- Besoin 1 : « Motif de la part de pondération : non tranché (`D-516` §6.3) »
  → renvoi à `D-547` §1 et §2 (parts retirées, égalité entre besoins par
  convention de modèle), qui répond à `D-516` §6.3.
- Les motifs de pondération des besoins 4 et 5 restent : ils portent sur les
  poids entre sources d'un même besoin, que `D-547` §2 ne touche pas.

## Fichiers modifiés

- `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` (cinq lignes d'état)
- `changelog.d/2026-11-28-besoins-guide-etat-documentaire.md` (nouveau)
- ce handoff

## Validations exécutées

- `grep` du guide après édition : plus aucune ligne « Application : lot
  J3-12f » ni « non tranché ».
- `npm run check:rapide` et `npm run check` : codes de sortie rapportés dans
  le commentaire de la PR.
- Pas de T2 ni de T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Besoin 5, champ « Règle de décision » (`GUIDE:150`) : « À l'application de
  J3-12f, deux bornes servies suivront la grille publiée… » reste au futur.
  C'est le texte d'une règle de section signée, hors périmètre strict du lot ;
  sa mise au passé relève du responsable.
- Besoin 9, champ « Règle de décision » : « sont à suspendre pour relecture »
  (`D-541` §6.1), suspension livrée par `D-543` ; même motif, non touché.

## Prochaine action exacte

Intégrateur : servir la PR après « prête @<sha> ». File D : les lots suivants
de la réconciliation, quand le carnet les sert.

## Interdits encore actifs

- Aucun texte de règle, seuil, classe ou hiérarchie du guide ; le seuil de
  vitamine D du besoin 2 et le récit du plafond restent au Mac.
