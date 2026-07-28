# Registre des décisions Wellneuro

> Append-only. Ajouter une nouvelle décision en tête de la section active.

## Décisions actives

### D-006 — Migration HDS : bascule tout-Scalingo, données réelles dès la phase de test, découplée du calendrier juridique

- Date : 2026-07-28
- Statut : accepté (décision du **responsable de traitement**), **sous les réserves listées ci-dessous**
- Domaine : architecture, hébergement et conformité (HDS, RGPD)
- Décision : la migration vers **Scalingo** (hébergeur certifié HDS 2.0 — certificat LNE n° 38436‑2, valable 11/09/2028 ; infrastructure sous‑traitante Outscale, certifiée HDS) s'applique **aux patients réels dès la phase de test**, sans attendre la finalisation du volet juridique. **Cette décision lève explicitement le gate documenté « F (juridique) conditionne le GO données réelles »** (`CHECKLIST_FINALISATION.md` §F) : les items AIPD, DPA des sous‑traitants et pentest, qui conditionnaient ce GO, deviennent des **réserves à lever en parallèle** — arbitrage que le responsable de traitement est en droit de rendre, consigné comme tel ici. Base invoquée par le responsable : **consentements patients déjà recueillis** et **information RGPD** (conservation des données, droit d'accès, de consultation, de révocation) **déjà actée** sur l'implantation Vercel actuelle. Cohérence : les données réelles sont **déjà** hébergées sur Vercel/Supabase **non‑HDS** sous la dérogation en vigueur (échéance 2026‑10‑21, qui couvre l'implantation **Vercel** actuelle) ; les déplacer vers Scalingo **améliore** la posture — mais **seulement une fois l'annexe HDS en vigueur et le périmètre HDS de la région cible confirmé** (voir Conséquences). Corollaire : **pas de double‑implantation permanente** — Vercel/Supabase gardés chauds comme **filet de rollback court**, puis décommissionnés avec **preuve d'effacement écrite** (registre RGPD). Cible : **Scalingo seul**.
- Conséquences : **ordre imposé** — l'app prod HDS ne reçoit des données réelles **qu'après** (a) e‑signature du **DPA Scalingo** (l'annexe HDS s'y attache — volet hébergeur de F) **et** (b) confirmation que la **région cible porte le périmètre HDS**. Migrer du réel avant (a) créerait un intervalle couvert **ni** par la dérogation (qui vise Vercel) **ni** par un contrat HDS signé. **Note région :** `osc-fr1` est **conforme HDS** selon Scalingo, mais l'audit recommandait la région **plus stricte** `osc-secnum-fr1` (Outscale **SecNumCloud**, souveraine) ; `osc-fr1 --hds-resource` reste **HDS mais non SecNumCloud** — à confirmer acceptable par le responsable. Les patients réels ne doivent atterrir que sur l'**app prod HDS** dûment provisionnée (`--hds-resource`, `DB_SSL_CA`, secrets prod, contrôles d'accès de niveau prod), **pas** sur un staging au sens lâche. Aucun garde runtime n'empêche les données réelles : le passage au réel est la **migration de données du bloc D** (dump Supabase → restore Scalingo), acte ops du responsable, **subordonné à l'ordre ci‑dessus**. **Réserves :** (1) **e‑signer le DPA Scalingo** — *avant toute donnée réelle* ; (2) **confirmer le périmètre HDS de la région** cible — *avant toute donnée réelle* ; (3) **confirmation DPO recommandée** sur « patients réels sur Scalingo en phase de test » — plus lourd que le RLS (D‑005) ; (4) DPA des **autres sous‑traitants** (Anthropic, SMTP, Google, Sentry), **AIPD**, **pentest léger** (item F) ; (5) la conformité des **consentements/information** est une **certification du responsable**, non vérifiée indépendamment ici. Le gate dur `WN_CB_RESULTS_ENABLED` (résultats biologiques réels) **reste distinct** et ne s'ouvre qu'après attestation HDS effective.
- Référence : `docs/claude/propositions/2026-07-24-audit-migration-hds/` (AUDIT, RUNBOOK §4/§5, CHECKLIST_FINALISATION F/D/E), `docs/DECISIONS.md` D‑005 (RLS), `docs/FEATURE_FLAGS.md`

### D-005 — RLS (exig. 3 HDS) : le deny-all documenté comme contrôle suffisant (posture A)

- Date : 2026-07-27
- Statut : accepté — **confirmé par le DPO le 2026-07-27** (posture A : deny-all base + gardes applicatifs satisfait l'exigence 3)
- Domaine : sécurité et conformité (HDS, exigence 3 — cloisonnement d'accès aux données)
- Confirmation : le DPO a confirmé le 2026-07-27 que la posture A (deny-all base + gardes applicatifs) satisfait l'exigence 3 pour une application mono-domaine sans API de données ouverte ; confirmation relayée par le responsable (à archiver par écrit au dossier d'audit). La **posture B** reste le repli si un audit ultérieur exige une isolation au niveau base indépendante du code.
- Décision : le socle **deny-all** déjà en place — RLS activée sans policy et sans `FORCE` sur 71 tables `public` (migration `20260707123710_enable_rls_security`, état prod vérifié le 2026-07-27 : 0 policy, 0 `FORCE`, app connectée en `postgres` = propriétaire) — **plus** les gardes applicatifs (portail résolu par `session.idPatient` sur cookie signé depuis #397, session praticien Google restreinte `@wellneuro.fr`) couvrent l'exigence 3. La **posture B** (`FORCE` + policies par principal, isolation ligne à ligne au niveau base) n'est **pas retenue à ce stade** : disproportionnée pour une application mono-domaine sans API de données ouverte ni multi-tenant à cloisonner en base, et à fort risque de régression silencieuse.
- Conséquences : **aucun code base**. La justification tient au fait que le vecteur réellement adressé par la RLS Supabase — l'API de données managée (PostgREST, rôles `anon`/`service`) — est neutralisé par le deny-all, tandis que l'isolation ligne à ligne reste **applicative** et déterministe. Garde-fous : ne pas connecter l'app sous un rôle propriétaire différent sans revoir cette décision ; ne pas créer de policy partielle **sans** `FORCE` (sans effet sur le rôle propriétaire, elle donnerait une fausse impression de couverture). Si l'audit exige une isolation base indépendante du code, basculer vers la **posture B** — chantier sous 🚪 go explicite + fenêtre dédiée, à démarrer tôt vu l'échéance de dérogation (2026-10-21).
- Référence : `docs/claude/propositions/2026-07-24-audit-migration-hds/ADDENDUM_RLS_EXIG3.md`, `docs/claude/propositions/2026-07-24-audit-migration-hds/NOTE_DPO_RLS_EXIG3.md`, `CHECKLIST_FINALISATION.md` (section C)

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
