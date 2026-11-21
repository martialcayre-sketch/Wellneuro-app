### Corpus : un lot de claims plafonné à 10 au contrat (autonomie-pieges-restes, partie 8, 2026-11-21)

La route interne `/api/internal/rag/claims/ingest` écrit tout le lot dans une
seule transaction Prisma, au délai par défaut de 5 s. Le contrat acceptait
64 claims, plafond partagé avec les chunks. Contre la base de production,
50 claims ont fait expirer la transaction (500, rollback complet, aucun claim
écrit) ; 10 passaient. Et l'outil `tools/corpus/claims/ingest.mjs` envoyait
64 par défaut.

- **`RAG_MAX_CLAIMS_BATCH_SIZE = 10`** (`web/src/lib/rag/claims/validation.ts`)
  juge désormais le lot de claims. Au-delà, la route répond 422, avant tout
  embedding et toute transaction. Le message donne la taille reçue et la
  consigne : « envoyer par paquets de 10 au plus ». Le plafond des chunks
  (`RAG_MAX_BATCH_SIZE`, 64) ne bouge pas.
- `ingest.mjs`, `ingest-devlocal.mjs` et `draft.mjs` lisent cette constante,
  au lieu de recopier 64. `--lot` permet toujours de descendre, jamais de
  monter.
- Tests dans `validation.test.ts` : la borne (10 acceptés, 11 refusés avec le
  message). Un banc textuel rougit aussi si l'un des trois outils écrit une
  taille de lot en chiffres. Une mutation (64 remis dans `ingest.mjs`) le fait
  rougir.
- Ce que le contrôle ne couvre pas : un script hors du dépôt qui découpe
  lui-même ses paquets. Celui-là reçoit le 422 et sa consigne, et non plus
  un 500 après 5 s.
