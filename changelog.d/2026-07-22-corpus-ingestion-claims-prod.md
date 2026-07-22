### Ajouté

- **Corpus RAG — ingestion HTTP des claims** : `tools/corpus/claims/ingest.mjs`
  envoie un lot rédigé (`draft-*.json`) vers `/api/internal/rag/claims/ingest`
  par requêtes ≤ 64 claims sous `RAG_INTERNAL_SECRET`, avec mode `--validate`
  hors-ligne (contrat serveur `parseRagClaimsIngestPayload` rejoué sans réseau).
  Pendant claims de `tools/corpus/ingest/ingest.mjs` (chunks) ; arrêt au premier
  échec, ré-envoi idempotent (version de claim immuable côté serveur).
