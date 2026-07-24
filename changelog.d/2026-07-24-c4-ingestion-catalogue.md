### Ajouté

- **C4 / voie d'ingestion du catalogue de compléments** : route interne
  `POST /api/internal/supplements/ingest` (logique dans
  `web/src/lib/supplement-library/`), sur le patron de la chaîne corpus
  (`/api/internal/rag/ingest`). Authentification par **secret partagé**
  (nouvelle variable `SUPPLEMENTS_INTERNAL_SECRET`, min. 32 caractères,
  fail-closed : 503 si non configurée, 401 sinon). Payload = un lot de fiches
  produit normalisées (produit + composition), validé strictement dans le style
  du dépôt (Zod absent) : provenance ∈ {complalim, dgccrf, saisie_praticien},
  unités ∈ {µg, mg, g, mL, UI}, niveau de complétude ∈ {bien_documentee,
  partielle, lacunaire} — alignés sur les CHECK de la migration catalogue.
  Écriture en **brouillons uniquement** (décision n°11 du moteur d'intention :
  une source externe ne produit que des candidats) — `statut_fiche` forcé à
  `'importee'`, jamais `verifiee`/`inactive` ; `verifie_par`, `verifie_le` et
  `date_derniere_verification` jamais écrits ; aucune alerte ni règle clinique
  activée. **Idempotence** par empreinte déterministe `contenu_sha256`
  (attributs sourcés + composition + doses) : même empreinte → no-op ;
  empreinte différente → nouvelle `version_formulation` **et** déplacement du
  pointeur `supplement_product_versions_courantes` dans la **même transaction
  Prisma** (`$transaction`), les versions antérieures conservées (append-only).
  Violations d'unicité (P2002) et de FK (P2003) traduites en réponse claire,
  sans faire échouer le lot.
- **Client d'ingestion** `tools/supplements/ingest/` : `ingest.mjs` (production —
  lit `SUPPLEMENTS_INTERNAL_SECRET` et l'URL depuis l'environnement, jamais en
  dur ni affiché, lots ≤ 500, mode `--dry-run`) et `ingest-devlocal.mjs`
  (variante dev-locale directe Postgres, réplique de la logique serveur
  pointeur/versionnage, refuse toute cible non locale). Réutilise la sortie
  NDJSON de `tools/supplements/import/parse.mjs`.
