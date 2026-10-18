# Handoff — 2026-10-18 — F80, PR 3 : la proposition lit les compositions signées

## Branche et état Git

- Branche `lot/f80-proposition`, depuis `origin/main` 7ee0e0b7 (#1541) ;
  worktree `file-d1-suite` (session concurrente, cycle en git/gh direct).
- Lot F80 : PR 0 #1529 (D-323), PR 1 #1540 (migration, release-db constatée
  par conteneur), PR 2 #1541 (signature) mergées. Cette PR clôt le code du lot.

## Objectif

D-323 §2-§4 : un groupe signé fait une ligne avec son acte et ses
constituants ; un constituant seul est proposé par son groupe ; un calculé ou
un regroupement hérite du remboursement de ses mesures et le dit — au
courrier, au document patient, à l'écran de la proposition et à la fiche
d'analyte.

## Décisions prises

- D-323 ; aucune décision neuve. Choix d'exécution, relus contre la décision :
  ordre de faiblesse non évalué < hors nomenclature < si groupé < remboursable ;
  un groupe ajouté pour un constituant range aussi les autres constituants du
  bilan (sans « demandée pour » pour ceux qui ont leur acte) ; les
  constituants à un seul groupe sont placés les premiers (bicarbonates →
  1610, le sodium du même bilan l'y rejoint) ; seul un `groupe` remplace, un
  regroupement n'a pas d'acte ; le code d'acte n'est dit que sur la ligne d'un
  groupe (le reste de D-309 §1 reste à F55).
- Sans composition signée, sortie identique (contre-épreuves au moteur, au
  service et au catalogue).
- Revue `wn-reviewer` : no-go levé. Borne des attentes (D-305 §4) gardée sur
  ce que le bilan proposait ; groupe non remboursable ne remplace pas ;
  « non évalué » nomme la mesure ; fiche d'analyte et écran disent les
  mesures ; « analyse demandée pour » ; composants inactifs non cités.
- Arbitrage du responsable (2026-10-18) : tous les constituants dits, borne
  de consignation 8 000 → 12 000 (D-323 §7) ; la constante est partagée avec
  la correspondance saisie à la main.

## Fichiers modifiés

- `web/src/lib/biology-library/compositionsProposition.ts` (neuf, pur) :
  regroupement des lignes, héritage, textes communs ;
- `remboursable.ts` : `deriverRemboursementParMesures`, champ `parMesures` ;
- `statuts.ts` (`composerAnalytes`, champs `constituants`, `demandeePour`,
  entrée `compositions`), `propositionService.ts`, `catalogue.ts`,
  `compositionsAnalytes.ts` (`chargerCompositionsSignees`) ;
- `courrier.ts`, `documentPatient.ts`, `PropositionBilanPanel.tsx`,
  `FicheAnalytePanel.tsx`, `attentesBornees.ts`, `ClinicalRuntimeSection.tsx` ;
- borne : `correspondanceMedecin.ts` (`LONGUEUR_MAX_TEXTE`), route du document
  patient, messages des routes courrier, adressage, correspondance ;
- `docs/DECISIONS.md` : D-323 §7 ;
- bancs : `compositionsProposition.test.ts`, `remboursable.test.ts`,
  `statuts.test.ts`, `propositionService.test.ts`, `catalogue.test.ts`,
  `courrier.test.ts`, `documentPatient.test.ts`,
  `PropositionBilanPanel.test.tsx` ;
- `docs/claude/MATRICE_CONSOMMATION.md` régénérée ; fiche F80 et dette des
  alias au §8 du plan ; fragment `changelog.d/2026-10-18-f80-composition-proposition.md`.

## Validations exécutées

- Bancs ciblés verts ; contre-épreuves par mutation (appel de regroupement
  retiré du moteur : rouge ; ancienne borne des attentes : rouge) ; banc de
  longueur au pire cas avec les quatre groupes : au-delà de 8 000, sous
  12 000.
- T1 (`npm run check:rapide`) vert ; T3 (`npm run test:worktree`) et revue
  `wn-reviewer` : verdicts dans la PR.

## Problèmes ouverts

- Signature des compositions par le responsable, à l'écran : tant qu'aucune
  n'est signée, rien ne change en production.
- Alias d'import des sept fiches de D-323 §6 : dette au §8 du plan.
- Cas non tranchés par D-323, laissés tels quels : un bilan qui propose le
  1609 et les bicarbonates fait ajouter le 1610 (sodium dit deux fois) ; le
  regroupement se fait par ligne de bilan, deux lignes peuvent citer deux
  ionogrammes ; la vue par analyte ne montre pas les constituants rangés.
- Après le merge : pages de suivi file A et BioFlow (n14).

## Prochaine action exacte

Merger après CI vert et revue CodeRabbit sur la tête ; constater le
déploiement ; mettre à jour les pages file A et BioFlow ; puis gestes de la
file D faisables par l'assistant.

## Interdits encore actifs

Aucune composition, signature ou constat écrits par script ou migration ;
aucune règle d'indication ni bilan gelé modifiés ; aucune identité réelle ;
aucun lien d'artefact dans le dépôt ; jamais de pull ni rebase automatique ;
jamais `prisma format`.
