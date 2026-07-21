# Registre des décisions Wellneuro

> Append-only. Ajouter une nouvelle décision en tête de la section active.

## Décisions actives

### D-004 — Corpus scientifique 5.0 : pgvector en production, Apps Script transitoire

- Date : 2026-07-21
- Statut : accepté
- Domaine : architecture et corpus
- Décision : le corpus scientifique (supports SIIN validés) est indexé dans PostgreSQL/pgvector (`rag_corpus_chunks`, PR #196) selon un modèle à deux couches — verbatim source immuable + claims validés praticien. Les gates G0 (droits, verdict utilisateur du 2026-07-21) et G5 (migration pgvector) sont ouverts ; détail au `docs/claude/REGISTRE_FRONTIERES.md` (A9).
- Conséquences : le pipeline Apps Script corpus v1.5 est un **appelant transitoire** de la production — il ingère le stock (lots 000-013 puis extraction croisée Sonnet 5 + GPT-5.4) et s'éteint à l'ouverture de l'Atelier corpus (`dashboard/corpus`). D-001 reste entière : aucune dépendance Sheets dans les routes applicatives ; l'ingestion passe exclusivement par `/api/internal/rag/ingest` sous secret partagé. Aucune sortie RAG n'atteint un patient sans validation praticien (D-003).
- Référence : `docs/claude/REGISTRE_FRONTIERES.md` (A9), `docs/RAG_PGVECTOR_PRODUCTION.md`, `docs/claude/propositions/2026-07-21-corpus-wellneuro-5-0/`

### D-003 — Séparation déterministe et narration IA

- Date : 2026-06-15
- Statut : accepté
- Domaine : clinique et IA
- Décision : les règles de sécurité, de scoring et de priorisation doivent rester déterministes et testables
- Conséquences : le LLM peut traduire et synthétiser, mais ne décide pas seul. Vigilances critiques codées en dur, non déléguées au LLM.
- Référence : `docs/claude/REGLES_CRITIQUES.md`

### D-002 — Portail permanent est le flux patient principal

- Date : 2026-07-03
- Statut : accepté
- Domaine : produit
- Décision : `/portail/[token]` est le parcours patient principal et unifié
- Conséquences : `/patient/[idAssignation]` reste un flux de compatibilité legacy, non augmenté de nouvelles fonctionnalités
- Référence : `docs/PROJECT_STATE.md`

### D-001 — PostgreSQL est l'unique base runtime

- Date : 2026-07-07
- Statut : accepté
- Domaine : architecture
- Décision : toutes les données runtime sont lues et écrites via Prisma dans PostgreSQL/Supabase
- Conséquences : Google Sheets ne doit pas être réintroduit dans les routes applicatives
- Référence : `docs/PROJECT_STATE.md`

## Décisions archivées

> Les décisions anciennes sont versionnées dans les entrées `SESSION_LOG.md` (voir `docs/archive/sessions/`).
