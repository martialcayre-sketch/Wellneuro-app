### Ajouté

- **Journal des décisions de revue des claims** (migration
  `rag_claim_decisions_journal_v1`, Atelier v2 — PR A) : table append-only
  `rag_corpus_claim_decisions` traçant chaque acte praticien — décisions
  individuelles avec motif (dette v1 comblée), tirages d'échantillon,
  signatures de lot (VALIDE seul) et bascules en revue individuelle de la
  procédure « validation à deux vitesses ». Garanties portées par la base :
  triggers append-only (UPDATE/DELETE/TRUNCATE refusés), `cree_le` non
  antidatable, une signature de lot exige son tirage (même source) et ne peut
  couvrir ni claim prescriptif ni interprété. RLS deny-all, test de contrat
  SQL joué en CI. Aucune écriture applicative encore : la lib de revue arrive
  en PR B.
