### Ajouté

- **Le socle pgvector du RAG cesse d'être invérifié : un contrat SQL le tient,
  en CI et en préflight de release.** Tout ce qui porte la recherche
  vectorielle vit en SQL brut, invisible du drift check Prisma : l'extension
  `vector`, les deux index HNSW cosinus (`rag_corpus_chunks`,
  `rag_corpus_claims`) et les deux fonctions `match_wellneuro_rag_*` — dont
  celle qui PORTE la barrière D-003. Un index perdu ou laissé invalide par un
  rebuild interrompu aurait dégradé la recherche en scan séquentiel — mêmes
  résultats, latence dégradée — sans qu'aucune suite ne rougisse.

  `web/prisma/checks/rag_pgvector_structure_v1.sql` (lecture seule,
  `BEGIN READ ONLY … ROLLBACK`) assère l'extension dans le schéma
  `extensions`, les deux index — méthode `hnsw`, colonne `embedding`,
  operator class `vector_cosine_ops` (un rebuild en L2 laisserait un index
  présent mais ignoré par l'`ORDER BY` cosinus), validité au catalogue — et
  les signatures exactes des deux `match_*`, STABLE et set-returning. Il
  rejoue aussi la leçon de `20260721230000` : `EXECUTE` refusé à PUBLIC
  (un `CREATE OR REPLACE` futur qui oublierait le REVOKE lèverait dès la base
  du CI, où `proacl` NULL suffit), et à `anon`/`authenticated` là où ces rôles
  existent. Câblé dans `ci.yml` (donc dérivé automatiquement dans le palier
  local T2/T3) et en préflight fail-closed de `release-db.yml` — vérifié
  conforme sur la production le 2026-08-09 avant ce câblage.
