### C4 LOT-03 — moteur de résolution C4B : la lib signale, ne décide jamais (2026-07-24)

Première tranche runtime du moteur d'intention clinique (tables posées le
2026-07-06, dormantes depuis) : `web/src/lib/supplement-library/`, lib pure
sans UI, derrière `WN_C4_ENABLED` (fail-closed, motif `WN_C5_ENABLED`).

- **Résolution déterministe** (`resolution.ts`) : codes `ClinicalIntentTag` →
  règles cliniques actives **et validées praticien** (`validePar`/`valideLe`
  non nuls — motif barrière D-003, décision actée par revue), dernière
  `versionRegle` active par lignée choisie après ce filtre (append-only,
  décision actée n°5), avec ingrédient, forme préférée, doses cibles, grade
  de preuve, justification, source et marqueur `regleValidee`. L'option
  explicite `inclureNonValidees` (défaut `false`) est réservée à la
  prévisualisation du futur atelier de règles — jamais aux chemins
  protocole/patient — et marque chaque brouillon `regleValidee: false`.
  Lecture seule, ordre neutre documenté (sélection du praticien, puis
  alphabétique) — aucun score agrégé, aucun tri « meilleur choix ».
- **Sentinelle de cumul** (`sentinelle.ts`) : même ingrédient atteint par
  plusieurs intentions/règles → candidat `ProtocolReviewFlag`
  `cumul_substance` exposant les doses en présence — jamais de somme ni de
  maximum automatique (décision actée n°9). Dépassement d'un
  `IngredientFunctionalThreshold` comparé règle par règle ; si
  `basculeRisque`, l'alerte de sécurité est jointe via `safetyAlertId`, sans
  copie locale du niveau (décision n°6). La sentinelle ne s'évalue que sur
  des règles validées — une résolution de prévisualisation ne produit jamais
  de flag depuis un brouillon. Elle produit des candidats (objets), elle
  n'écrit rien en base dans cette tranche.
- **Tableau de compatibilité** (`compatibilite.ts`) : les quatre lignes actées
  (qualité de formulation / compatibilité protocole / données manquantes /
  dernière revue), valeurs qualitatives nommées, `non_evaluee` honnête pour
  tout ce qui dépend d'une fiche produit (LOT-02a à venir) — aucun verdict
  global.
- **Deux échelles de preuve jamais confondues** : l'échelle GRADE
  (fort/modere/faible/usage_traditionnel) est validée à la lecture et refuse
  explicitement A/B/C/D (échelle du moteur d'équilibre, décision actée n°1).
- 29 tests Vitest : version active seule, règles non validées exclues par
  défaut (et jamais masquantes en lignée), absence de score agrégé, cumul
  sans somme, alerte jointe par bascule, échelles étanches, drapeau
  fail-closed.
