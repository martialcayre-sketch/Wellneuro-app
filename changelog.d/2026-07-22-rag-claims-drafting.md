### Ajouté

- **Étage de rédaction des claims du corpus** (`tools/corpus/claims/`, outillage hors
  runtime) : `draft.mjs` rédige les claims à partir du verbatim avec deux IA jamais
  fusionnées (A6/A7) — Sonnet 5 rédige, GPT-5.4 contre-vérifie la fidélité de chaque
  claim à son chunk source (désaccord → exclu, versé dans une file de revue). Au plus
  8 claims substantiels par extrait, dosages préservés. `ingest-devlocal.mjs` ingère le
  lot rédigé dans une base pgvector locale (contrat serveur réel + réplique du store),
  prouvant la chaîne verbatim→claims et la barrière D-003 hors production. Sorties et
  clés hors dépôt.
