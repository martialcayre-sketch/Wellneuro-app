# Handoff — 2026-10-03 — BIO-INGEST LOT-02, mise en production et clôture (D-260)

## Branche et état Git

- Branche `feat/bio-ingest-lot02-premier-compte-rendu-reel`, partie de
  `origin/main` à `81dd1aaf`. Commit et PR à suivre.
- Campagne `2026-09-30-bio-ingest` ; LOT-02 **terminé**, lot actif **LOT-06**.

## Objectif

Mettre l'import en production et vérifier qu'il fonctionne, intégrer ce que le
premier compte rendu réel a appris, puis clore le LOT-02.

## Décisions prises

- Drapeau `WN_BIO_INGEST_ENABLED` posé par le responsable (06:30 UTC). Il est
  devenu effectif au redémarrage des conteneurs web (`scalingo restart web`,
  08:53 UTC). Une variable Scalingo ne s'applique qu'au redémarrage.
- **[[D-260]]** :
  - trois libellés réels ajoutés au resolver, qui est re-signé (SHA
    `5f95d167…80b9`, 101 entrées) ;
  - « µg/L » et « ng/mL » sont une même notation : liste fermée
    `NOTATIONS_EQUIVALENTES`, une paire par arbitrage ;
  - « Valider » est pré-positionné sur les lignes rapprochées sans écart.
- Le dépôt de `PAT030` est **gardé comme outil de travail** : c'est un
  compte rendu réel, d'une source officielle. Pas de retrait.
- LOT-06 créé à la demande du responsable : catalogue étendu aux analyses
  d'un compte rendu courant. Il demande une migration avec confirmation.

## Constats de production (par conteneur, par identifiant)

- La v4 et la v12 sont servies comme versions courantes, et relues contre le
  comportement livré : conformes. Deux écarts mineurs sont consignés à la
  fiche du LOT-02.
- `PAT030` : `extrait` en 20 s, 58 lignes, 6 rapprochées, 0 résultat écrit.

## Fichiers modifiés

- `valeurLue.ts` (+ test) : notations équivalentes.
- `resolverLibellesV1.ts` (+ test) : trois libellés réels et la nouvelle
  signature.
- `ImportCompteRenduPanel.tsx` (+ test) : `choixInitial`.
- `compte-rendu/route.test.ts` : l'exemple d'unité divergente passe à
  pmol/L.
- Documentation : `DECISIONS.md` (D-260), `FEATURE_FLAGS.md`, fiche du
  LOT-02 (Résultats), `LOT-06-catalogue-compte-rendu-courant.md`,
  `CAMPAGNE.md`, `.wn/state.json`, `ACTIVE_CAMPAIGN.md` (régénéré), le
  fragment de changelog et `SESSION_LOG.md`.

## Validations

- T1 complet vert, après `wn-cycle --appliquer` pour la vue de campagne.
- T2 rapide vert : 11 388 Vitest et 225 E2E.
- Audit de campagne du CI vert (un seul avertissement, ancien, sur une autre
  campagne).

## Problèmes ouverts

- LOT-06 à cadrer : l'unité retenue par analyte, alors que le laboratoire en
  imprime deux ; « U/L » face à « UI/L » ; « G/L » et « T/L » face à
  « 10^9/L » et « 10^12/L » ; « g/dL » et « mL/min/1,73 m² » absents du
  vocabulaire ; le sort des quatre panels sans unité.
- Hémoglobine en g/dL et Ferritine en pmol/L restent refusées : ce sont des
  conversions, que D-157 interdit.
- Toujours en suspens : la rétention des sauvegardes Scalingo, l'iodurie sur
  échantillon, le cortisol salivaire 8h/20h.

## Prochaine action exacte

PR, CI en fond, lecture des commentaires en ligne, merge. Puis, après
`/clear`, le LOT-06 en mode Plan.

## Interdits actifs

- Aucune migration sans demande explicite ; `release-db` reste humain.
- Aucune conversion d'unité. Une équivalence de notation exige un arbitrage
  par paire.
- Ne jamais retoucher le resolver sans re-signature `D-xxx` ; le SHA reste un
  littéral.
- Dossiers réels : désignés par identifiant seulement, jamais par nom.
