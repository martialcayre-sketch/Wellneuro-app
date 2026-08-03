# Registre des décisions Wellneuro

> Append-only. Ajouter une nouvelle décision en tête de la section active.

## Décisions actives

### D-010 — La barrière D-003 se garde au point de passage, pas chez ses lecteurs

- Date : 2026-08-03
- Statut : accepté (clôture du LOT-01 de la campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`) — le contrat qui matérialise cette décision a été mergé par la **PR #553** le 2026-08-03 (`cd7c1b9b`) : la décision et sa mise en œuvre sont toutes deux sur `main`.
- Domaine : architecture, corpus et sécurité clinique
- Décision : la fermeture de la barrière D-003 — aucun claim non signé ne remonte vers une restitution — est **éprouvée sur `public.match_wellneuro_rag_claims`**, seule voie de restitution du corpus, par le contrat `web/prisma/checks/rag_claim_barriere_d003_v1.sql`. Elle n'est **pas** obtenue en imposant un filtre `statut` à chaque module qui lit `rag_corpus_claims`. Le contrat assère aussi ce qui empêche de **contourner** la fonction : `EXECUTE` refusé à `anon` et `authenticated`, RLS active sur les deux tables.
- Conséquences : quatre modules (`revue.ts`, `recherche.ts`, `questionnaire.ts`, `evaluation.ts`) lisent la table sans filtrer `statut`, et **ce n'est pas un défaut** — ce sont l'établi de validation, qui doit voir un claim non signé pour le présenter au praticien. Ils sont documentés comme tels dans `docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md`, pas gardés par du code. En contrepartie, **toute nouvelle voie de restitution doit passer par la fonction** : un `SELECT` direct sur la table depuis une surface de consultation échapperait au garde, qui ne le verrait pas. C'est le prix de ce dessin, et il est assumé — un garde au point de passage tient quel que soit le nombre de lecteurs, une allowlist se périme au premier module ajouté.
- Réserves : le refus d'`EXECUTE` n'est assérable que si les rôles PostgREST existent — la clause est donc **vide sur la base éphémère du CI et mordante en production**. C'est le piège déjà rencontré avec `REVOKE FROM PUBLIC` : la partie du contrat qui protège le plus est celle que le CI ne joue pas. Deux des cinq conditions de la fonction (`patient_identifiable = false`, `compartment = 'ACTIF'`) ne sont pas falsifiables par fixture — tenues par des `CHECK` de table — et sont assérées structurellement dans `pg_constraint`.
- Référence : [web/prisma/checks/rag_claim_barriere_d003_v1.sql](web/prisma/checks/rag_claim_barriere_d003_v1.sql), [.github/workflows/ci.yml](.github/workflows/ci.yml), [docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md](docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md), PR #553

### D-009 — Écart de restitution de l'IA : on journalise, on ne censure pas

- Date : 2026-08-03
- Statut : accepté (clôture du LOT-06 de la même campagne)
- Domaine : clinique et IA (prolonge **D-003**, ne le contredit pas)
- Décision : quand un détecteur constate un écart entre la synthèse **rédigée par l'IA** et le matériel déterministe qui lui a été transmis — un pack ou un questionnaire cité sans avoir été fourni —, l'écart est **consigné** dans les métadonnées de la synthèse, au dossier. La synthèse n'est ni supprimée, ni tronquée, ni masquée au praticien. Le détecteur est un instrument de mesure, pas une censure.
- Conséquences : le praticien voit la synthèse **et** l'écart, et tranche. Le garde ne s'exécute que si le bloc d'orientation a réellement été injecté (`orientationInjectee`) : sans injection, il n'y a pas de matériel de référence, donc pas d'écart mesurable — seulement une accusation possible. L'allowlist est dérivée des **trois** sources réellement transmises, dont les questionnaires que la consigne système cite elle-même : reprocher au modèle d'avoir repris ce qu'on lui a donné revient à l'accuser d'avoir inventé ce qu'il a lu.
- Réserves : ce dessin est né d'un défaut mesuré, pas d'un principe. Pendant le LOT-06, le détecteur tournait avec une allowlist vide sur le seul chemin de production et comparait la prose à 16 titres de packs, dont quatre sont des tournures cliniques françaises ordinaires (« digestif et intestin-cerveau », « stress chronique et burnout ») : **une synthèse fidèle a été accusée, et l'accusation persistée au dossier**. Un détecteur qui peut se tromper ne doit pas avoir le pouvoir de supprimer. S'il gagne un jour ce pouvoir, ce sera par une décision distincte, pas par dérive.
- Référence : [web/src/lib/clinical/verifierRestitutionOrientation.ts](web/src/lib/clinical/verifierRestitutionOrientation.ts), [web/src/app/api/praticien/synthese/route.ts](web/src/app/api/praticien/synthese/route.ts), PR #550

### D-008 — Contrat V3 des compléments : validation structurelle au runtime, à la persistence et à la relecture

- Date : 2026-08-03
- Statut : accepté (lot C4, session de consolidation)
- Domaine : architecture, protocoles et rayon compléments
- Décision : le contrat V3 des références catalogue de compléments est désormais validé de bout en bout sur la construction du draft, la persistence côté API praticien et la relecture depuis PostgreSQL. Un payload V3 mal formé est refusé explicitement ; les versions V1/V2 restent inchangées, et le chemin C5 ne se mélange pas au contrat V3.
- Conséquences : la contrainte structurelle est désormais appliquée au point d’entrée d’écriture et au point de reconstitution des protocoles, ce qui évite qu’un draft invalide soit persisté ou réhydrater sans rejet. La gouvernance du rayon compléments reste fail-closed tant qu’aucune activation métier n’est décidée.
- Référence : [docs/claude/campagnes/2026-08-02-rayon-complements-alimentaires/HANDOFF.md](docs/claude/campagnes/2026-08-02-rayon-complements-alimentaires/HANDOFF.md), [web/src/lib/clinical-engine/protocolDraft.ts](web/src/lib/clinical-engine/protocolDraft.ts), [web/src/app/api/praticien/protocoles/route.ts](web/src/app/api/praticien/protocoles/route.ts), [web/src/lib/protocol/fromPrisma.ts](web/src/lib/protocol/fromPrisma.ts)

### D-007 — Orientation adaptative : A-009 amendé, seule la perfusion reste hors moteur

- Date : 2026-08-01 (amendement) — 2026-08-02 (consignation)
- Statut : accepté (arbitrage du praticien-propriétaire, rendu en session)
- Domaine : clinique et corpus (frontière du moteur d'orientation)
- Décision : la décision **A-009** du manifeste plaçait quatre domaines hors moteur — perfusion, sevrages médicamenteux, psychotropes, maladie d'Alzheimer. Pour l'**orientation adaptative** (axe 3 de la campagne `2026-07-25-certification-corpus-questionnaires`, question *f* du cadrage), ce périmètre est **amendé** : seule la **perfusion** reste exclue. Les sevrages médicamenteux, les psychotropes et Alzheimer sont **réintégrés** dans le drafting des claims d'orientation. Motif : ces domaines relèvent de l'exercice courant du cabinet et leur exclusion en bloc privait le moteur de sources que le praticien mobilise en consultation ; la perfusion, elle, désigne un acte que WellNeuro n'a pas vocation à orienter.
- Conséquences : **la voie lente est inchangée** — chaque claim reste soumis à la validation praticien individuelle avant d'exister pour le moteur (barrière **D-003**) ; l'amendement élargit ce qui est *proposé* à la validation, jamais ce qui la contourne. **La quarantaine sanitaire reste un garde-fou, mais elle n'est plus un blocage absolu pour l'orientation** : les sources prescriptives du périmètre sont réintégrées par la levée actée le 2026-08-02 ; les sources non prescriptives restent exclues. Cette distinction est matérialisée dans `tools/corpus/claims/lib/filtre-orientation.mjs` et éprouvée par deux bancs. Matérialisation en base : migration `20260801200000_rag_claim_usage_orientation` (marquage `metadata.usage = 'orientation'`, prescriptifs réintégrés, perfusion épargnée — vérifié en production le 2026-08-02).
- Réserves : le périmètre est **figé dans une liste** au 2026-08-02 ; sa dérive est surveillée par `tools/corpus/claims/lib/perimetre-orientation.test.mjs`, qui échoue dès que le registre s'en écarte — les sources entrant en quarantaine après coup restent exclues si elles ne sont pas prescriptives.
- Référence : `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md` (§5, question *f*), PR #518 et #519

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
