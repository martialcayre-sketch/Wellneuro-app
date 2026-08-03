# Handoff — 2026-08-03

## Git

- Branche `main`, arbre propre.
- PR **#546** (squash, mergée, branche distante supprimée) : code du lot.
- PR **#547** (squash, mergée, branche distante supprimée) : clôture
  (`SESSION_LOG.md` + statut du lot).
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`
  **inchangée dans son ensemble** : ce lot correspond à la partie
  cognition/intestin de `LOT-02` (fichier mis à jour), pas au reste de la
  campagne.

## Objectif de ce lot

Brancher les rayons corpus « cognition » (notebook 05) et « intestin »
(notebook 07) — désormais 100 % validés en base — à un écran praticien réel,
demande explicite de l'utilisateur. Notebook 06 (douleurs, aussi visé par
`LOT-02`) volontairement laissé de côté : pas encore validé.

## Décisions prises, et pourquoi

- **Vérifié en base plutôt que sur un doc de campagne** : `execute_sql` direct
  (join `rag_corpus_chunks`→`rag_corpus_claim_sources`→`rag_corpus_claims`) a
  confirmé NB05 = 1114/1114 VALIDE, NB07 = 370/370 VALIDE. Le doc
  `INVENTAIRE_SOURCES_INTERVENTION.md` donnait des ratios plus bas (60/295,
  0/50) : il porte sur un **sous-ensemble différent** (« sources
  d'intervention », campagne distincte), pas le corpus général — piège à ne
  pas répéter, documenté dans la mémoire `claims-ingestion-chaine`.
- **`RayonComplementsPanel` n'est pas un navigateur de corpus générique** :
  c'est l'écran du catalogue produit (140 148 fiches), le corpus n'y apparaît
  qu'en tiroir justificatif. Nouveau composant simple à la place
  (`RechercheCorpusRayonPanel`) : un rayon, une requête libre, les claims.
- **Gate produit sorti de `servirRayonCorpus()`** : la fonction forçait
  `WN_C4_ENABLED` pour **tout** rayon demandé, pas seulement micronutrition —
  couplage caché qui aurait éteint cognition/intestin avec le catalogue de
  compléments. Le gate vit désormais dans la couche accès de chaque route.
- **Nouveau flag `WN_RECHERCHE_CORPUS_ENABLED`** (éteint par défaut, dark
  launch comme tous les rayons précédents), nommé pour ne pas se confondre
  avec `WN_ENABLE_CORPUS_CLINIQUE_V1` (double-verrou clinique sans rapport) —
  documenté dans `docs/FEATURE_FLAGS.md`.
- **Défaut bloquant trouvé par une revue adversariale (`wn-reviewer`), corrigé
  avant merge** : la nouvelle route validait `rayon` par une simple regex
  syntaxique, ce qui l'aurait laissée servir n'importe quel rayon de la carte
  — micronutrition compris — en contournant `WN_C4_ENABLED`. Corrigé par une
  allowlist dédiée `RAYONS_RECHERCHE_CORPUS`, testée (`?rayon=micronutrition`
  → 400).
- **Autres correctifs issus de la même revue** : claims restés affichés après
  un changement de rayon (composant corrigé + testé) ; fonction d'accès
  `getPractitionerRechercheCorpusAccess` non testée alors qu'un commentaire
  affirmait le contraire (`access.test.ts` créé) ; clé React collisionnable
  (`claimId` seul → `claimId-versionClaim`).

## Fichiers modifiés

- `web/src/lib/supplement-library/rayonCorpus.ts` (+ `.test.ts`) — mapping,
  allowlist `RAYONS_RECHERCHE_CORPUS`, retrait du gate C4.
- `web/src/lib/supplement-library/featureFlag.ts` (+ `.test.ts`), `access.ts`
  (+ nouveau `access.test.ts`) — flag et accès dédiés.
- `web/src/app/api/praticien/corpus/rayons/route.ts` (+ `.test.ts`) — nouvelle
  route.
- `web/src/components/corpus/RechercheCorpusRayonPanel.tsx` (+ `.test.tsx`) —
  nouvel écran.
- `web/src/app/dashboard/bibliotheque/page.tsx` (+ `.test.tsx`) — section
  branchée.
- `docs/FEATURE_FLAGS.md`, `changelog.d/2026-08-03-rayons-cognition-intestin.md`.
- `docs/claude/SESSION_LOG.md`, `docs/claude/campagnes/…/LOT-02-…md` (statut).

## Validations exécutées

- `npm run check` (T1) — vert.
- `npm run test:worktree -- --fast` (T2) — vert (335 fichiers Vitest, 3341
  tests) ; seul échec : le flake E2E connu et documenté
  `e2e/portail-lien-magique.spec.ts` (défense temps-constant sous charge),
  sans rapport avec ce diff.
- CI GitHub (`verify` + Vercel) verte sur les deux PR avant merge.

## Problèmes ouverts

- **Calibration non vérifiée** : `minSimilarity`/`matchCount` de
  `servirRayonCorpus` ont été réglés pour une requête fiche-produit
  (nom de complément) ; leur pertinence sur une recherche en langage libre
  (« mémoire de travail ») n'a pas été validée manuellement.
- **Aucun E2E** ne couvre le nouvel écran (non bloquant, flag éteint par
  défaut — à faire avant armement en prod).
- **Notebook 06** (douleurs) reste hors périmètre : même route déjà générique,
  il suffira d'étendre `RAYON_VERS_NOTEBOOK` et `RAYONS_RECHERCHE_CORPUS` une
  fois ses claims validés.

## Prochaine action exacte

Brancher `douleur` (notebook 06) dès que ses claims sont validés en base —
même patron, pas de nouveau lot nécessaire. Sinon, reprendre LOT-01/05/06 de
la campagne moteur d'intervention.

## Interdits encore actifs

- Pas d'armement de `WN_RECHERCHE_CORPUS_ENABLED` en prod sans décision
  explicite (reste dark par défaut).
- Pas de rayon supplémentaire sans appelant réel dans le même lot.
- Pas de contournement du filtre `VALIDE` (barrière D-003, `match_wellneuro_
  rag_claims`) — non touché par ce lot.
- Pas de fusion de `RAYONS_RECHERCHE_CORPUS` avec `RAYON_VERS_NOTEBOOK` : la
  seconde carte reste plus large que ce qu'une route donnée doit servir.
