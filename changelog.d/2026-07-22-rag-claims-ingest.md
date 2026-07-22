### Ajouté

- **Ingestion des claims du corpus** : route interne `/api/internal/rag/claims/ingest`
  (même authentification que l'ingest verbatim). Les claims entrent
  systématiquement `EN_ATTENTE_VALIDATION` — l'ingestion ne peut ni poser ni
  altérer une validation praticien (D-003). Une version de claim est immuable :
  ré-envoi identique = no-op ; texte, attributs cliniques ou ensemble de sources
  divergents = refus explicite (422) avec consigne d'incrémenter la version.
  Chaque lien vers un chunk source épingle l'empreinte du verbatim au moment du
  rattachement (audit de dérive), et la santé des claims expose les liens dont la
  version citée a été supersédée. Preuve exécutable dev-local :
  `tools/corpus/claims/devlocal.mjs` (immuabilité + barrière D-003 incluses).
