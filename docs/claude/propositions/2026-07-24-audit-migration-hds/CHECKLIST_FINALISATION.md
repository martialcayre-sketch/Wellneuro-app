# Checklist — Finalisation de la migration HDS/Scalingo

Compagnon de `AUDIT_MIGRATION_HDS.md` et `RUNBOOK_MIGRATION_SCALINGO.md`.
Liste de contrôle de bout en bout pour **lever la dérogation du 2026-10-21**.
État arrêté le 2026-07-24 (staging provisionné, fondation + P0 mergés).

**Légende de responsabilité**
- 🤖 **code** — assistant, 1 PR par lot, derrière flag, inerte pour Vercel, revue adversariale (`wn-reviewer`) avant merge
- ⚙️ **config/ops** — responsable, console/CLI Scalingo (hors dépôt)
- 🖥️ **validation navigateur** — responsable (hors portée CLI)
- 🚪 **porte** — nécessite un « go explicite » du responsable
- ⚖️ **juridique** — responsable ; conditionne la levée de dérogation, pas la faisabilité technique

Chemin critique le plus court vers un go : **A → B‑P1 → 🚪 C → D → E**.
**F (juridique)** court en parallèle et conditionne le « GO données réelles ».

---

## A. Config & validation staging (débloque tout le reste)

- [ ] ⚙️ Recopier les **flags produit** prod → staging : `WN_C5_ENABLED`, `WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`, `WN_PORTAIL_TOKEN_TTL_JOURS` — sinon le staging n'exerce pas le périmètre fonctionnel de la prod
- [ ] ⚙️ Réconcilier **`DATABASE_URL`** posée sur staging (doublon de l'add-on à confirmer, sinon retirer) — elle a **priorité** sur `SCALINGO_POSTGRESQL_URL` (`resolveDatabaseUrl()`) et peut masquer la vraie voie de connexion Scalingo
- [ ] ⚙️ (Optionnel staging) `WN_RELEASE_SHA` au déploiement ; aligner `CLAUDE_MODEL` / `WN_CLAIMS_CLAUDE_MODEL` sur le modèle épinglé prod ; `SENTRY_TRACES_SAMPLE_RATE`
- [ ] 🖥️ **Login praticien réel** via OAuth Google (URI de callback staging enregistrée côté Google)
- [ ] 🖥️ Générer une **synthèse IA** en observant le **SSE sous le routeur 30 s** (premier octet < 30 s, génération 15–40 s qui aboutit)
- [ ] 🖥️ Parcours Fil / fiche patient / RAG santé (`/api/internal/rag/health`) sur données fictives

> Rappel piège : `scalingo env-set` réaffiche la valeur posée dans son stdout —
> **rediriger la sortie** (`> /dev/null 2>&1`) pour toute valeur sensible.

## B. Code restant (1 PR par lot, flag, inerte Vercel, revue adversariale)

- [ ] 🤖 **P1 — claims questionnaire en SSE + heartbeat** (`web/src/app/api/praticien/corpus/claims/questionnaire/route.ts`, `maxDuration:120`, appels LLM parallèles) — *seul point qui casse réellement sous le routeur Scalingo*
- [ ] 🤖 **P2 — timeout `AbortController`** sur le fetch embeddings (`web/src/lib/rag/embeddings.ts`, aucun timeout aujourd'hui)
- [ ] 🤖 **P2 — envois SMTP best-effort non bloquants** (aujourd'hui `await transport.sendMail` dans le chemin de requête — un relais lent tient la requête au-delà de la fenêtre routeur)
- [ ] 🤖 **A4 — journalisation exig. 5** : trancher l'exposition du `GET` agenda `rendez-vous`
- [ ] 🤖 **A5 — tests d'authz exig. 7**
- [ ] 🤖 (À trancher) Sentry **client** (bundle navigateur, variables inlinées — non couvert par #345)

## C. Migrations Prisma — 🚪 go explicite requis

> Protocole obligatoire : **revue adversariale indépendante AVANT**, **vérification de la base de production APRÈS** (`execute_sql`).

- [ ] 🚪🤖 **Hachage `patients.access_token`** exig. 4 — traité comme critère de sortie de la bascule liens magiques G4/G5 (voir `ADDENDUM_JETON_PORTAIL.md`), pas comme un hachage isolé
- [ ] 🚪🤖 **RLS** exig. 3

## D. App PROD HDS + migration des données (⚙️ responsable, runbook §4)

- [ ] ⚙️ Provisionner l'app **prod HDS** : `osc-fr1`, `--hds-resource` **à la création**, add-on PostgreSQL Business, `PROJECT_DIR=web`, **tous les secrets prod + `DB_SSL_CA`** (durcissement TLS, non posé en staging)
- [ ] ⚙️ `migrate deploy` sur la cible **AVANT** le chargement des données (les objets pgvector exigent l'extension présente)
- [ ] ⚙️ Dump logique Supabase → restore data-only → **reconstruire/valider les index HNSW** → contrôler comptes de lignes + fonctions `match_*` (dont les 4 tables `rag_corpus_*`, externes Prisma)

## E. Cutover & décommission (⚙️ responsable, runbook §5)

- [ ] ⚙️🤖 **Textes RGPD sous-traitant** Vercel→Scalingo (`gouvernance.ts`, `contenus/registre.ts` versionné+hash) — **AU CUTOVER seulement** (les changer avant mentirait au patient sur l'hébergeur réel)
- [ ] ⚙️ TTL DNS réduit → fenêtre de gel → delta-sync → `migrate status` vert sur la cible → bascule DNS `app.wellneuro.fr` → Vercel/Supabase gardés chauds (rollback)
- [ ] ⚙️ Après stabilité : **preuve d'effacement écrite** (registre RGPD) → merge des PR de nettoyage (`clone_env_vars.py`, `vercel.json`, scripts `supabase:*`)
- [ ] 🤖 (Séparé) Décision pin `engines` Node 22 pour aligner sur le CI

## F. Juridique / conformité — ⚖️ responsable (conditionne le « GO données réelles » et la levée de dérogation)

- [ ] ⚖️ **Arbitrage fournisseur** (Scalingo recommandé, 41–83 € HT/mois) + devis écrit → **contrat + annexe HDS signés**
- [ ] ⚖️ **AIPD** · **DPA** à signer/archiver (hébergeur, Anthropic, SMTP, Google, Sentry) · **pentest léger** (exig. 7 G-TRUST-04)
- [ ] ⚖️ Identifier le **fournisseur SMTP réel** + localisation/DPA ; vérifier **résidence UE Sentry** (audit §7.4)
- [ ] ⚖️ **Acte de levée de G-TRUST-04** (checklist) — **échéance dérogation : 2026-10-21**

---

## Déjà fait ✅

Fondation build/release **#342** · connexion PG portable **#344** · observabilité neutre **#345** · synthèse IA en SSE **#347** · audit + runbook **#346** · staging provisionné et validé au boot (build + 35 migrations + boot OK) · pseudonymisation de l'appel Anthropic **#335** · retrait du motif de consultation des e-mails **#336**.
