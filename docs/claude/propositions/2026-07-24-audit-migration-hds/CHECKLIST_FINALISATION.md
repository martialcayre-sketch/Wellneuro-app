# Checklist — Finalisation de la migration HDS/Scalingo

Compagnon de `AUDIT_MIGRATION_HDS.md` et `RUNBOOK_MIGRATION_SCALINGO.md`.
Liste de contrôle de bout en bout pour **lever la dérogation du 2026-10-21**.
État arrêté le 2026-07-27 (staging provisionné ; fondation + P0 + **tout le code B**
mergés — P1 #356, P2 #377, A4/A5 #382 ; jeton portail retiré au titre de
l'exig. 4 par #397). **Il ne reste plus qu'un seul item de code sur le chemin
critique : RLS exig. 3 (C).**

**Légende de responsabilité**
- 🤖 **code** — assistant, 1 PR par lot, derrière flag, inerte pour Vercel, revue adversariale (`wn-reviewer`) avant merge
- ⚙️ **config/ops** — responsable, console/CLI Scalingo (hors dépôt)
- 🖥️ **validation navigateur** — responsable (hors portée CLI)
- 🚪 **porte** — nécessite un « go explicite » du responsable
- ⚖️ **juridique** — responsable ; conditionne la levée de dérogation, pas la faisabilité technique

Chemin critique le plus court vers un go : **A → 🚪 C → D → E** (B‑P1 est fait
par #356). **F (juridique)** court en parallèle et conditionne le « GO données
réelles ».

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

- [x] 🤖 **P1 — claims questionnaire en SSE + heartbeat** : livré #356 (flag `WN_CLAIMS_QUESTIONNAIRE_STREAM`). La route porte `maxDuration:120`, ouvre un `ReadableStream` `text/event-stream` et émet un battement `: battement` toutes les 10 s — *seul point qui cassait réellement sous le routeur 30 s de Scalingo*.
- [x] 🤖 **P2 — timeout sur le fetch embeddings** : livré #377 — `AbortSignal.timeout(DELAI_EMBEDDINGS_MS)` (30 s) sur `web/src/lib/rag/embeddings.ts`, qui n'avait aucun timeout.
- [x] 🤖 **P2 — envois SMTP bornés** : livré #377 — helper commun `creerTransportSmtp` (timeouts connexion/greeting/socket 10/10/20 s) sur les 5 routes d'envoi. **Résolu par un timeout, pas en fire-and-forget** : le « best-effort non bloquant » d'origine a été écarté, il masquerait l'échec d'e-mails qui *sont* le livrable. La fenêtre routeur est tenue par la borne, l'échec reste visible.
- [x] 🤖 **A4 — journalisation exig. 5** : tranché le 2026-07-26 — le `GET` agenda `rendez-vous` **n'est pas journalisé** (liste opérationnelle, pas une lecture de dossier de santé nommé ; `motif` = note d'agenda du praticien). Décision documentée dans `route.ts`, surface d'exposition verrouillée par un test. Révocable par le responsable.
- [x] 🤖 **A5 — tests d'authz exig. 7** : couvert le 2026-07-26 — 13 routes praticien authentifiées qui n'avaient **aucun** test reçoivent un test « sans session → 401 » (dont metrics, patients-pg, trust qui portent de la donnée patient). Audit `wn-explorer` : les 8 autres routes qu'il signalait « manque 401 » avaient déjà le test (faux positifs, vérifiés).
- [ ] 🤖 (À trancher) Sentry **client** (bundle navigateur, variables inlinées — non couvert par #345)

## C. Migrations Prisma — 🚪 go explicite requis

> Protocole obligatoire : **revue adversariale indépendante AVANT**, **vérification de la base de production APRÈS** (`execute_sql`).

- [x] 🚪🤖 **Jeton `patients.access_token`** exig. 4 — **résolu par #397** selon l'option 2 de l'`ADDENDUM_JETON_PORTAIL.md` (achever la bascule G4/G5, ne pas hacher isolément). Le cookie de session signé `wn_portail` devient l'**unique credential** ; le jeton permanent n'est plus relu ni reconstruit en URL. Aucune migration (colonnes conservées, rollback `git revert`), vérifié en prod post-merge (schéma intact, 14 actifs / 0 révoqué). **Résidu** : les valeurs en clair, désormais dormantes (aucun accès accordé), subsistent en base → `DROP COLUMN access_token*` en **PR 2** après fenêtre de stabilité, avec réintroduction d'un drapeau de révocation de remplacement.
- [ ] 🚪🤖 **RLS** exig. 3 — **seul item de code restant sur le chemin critique, et c'est une décision de périmètre, pas un chantier vierge.** Un socle **deny-all** est **déjà en place** sur les tables patient (`patients`, `assignations`, `questionnaire_reponses`, `correspondances_patient`…) depuis la migration `20260707123710_enable_rls_security` — `ENABLE ROW LEVEL SECURITY`, **zéro policy et zéro `FORCE`** volontairement (« deny-all par défaut = posture voulue »). Effet réel : un rôle **non-propriétaire** (ex. rôle public/anon) est bloqué ; le rôle **propriétaire** de l'app contourne la RLS faute de `FORCE`. À trancher pour l'exig. 3 : ce deny-all suffit-il, ou faut-il **`FORCE` + policies par principal** (isolation ligne à ligne y compris pour le rôle applicatif, ce qui impose une connexion sous rôle non-propriétaire + variable de session) ? Si arbitrage « renforcer » : protocole complet (revue adversariale avant, `execute_sql` après) + 🚪 go explicite. **Détail + les deux postures chiffrées : `ADDENDUM_RLS_EXIG3.md`** (état prod vérifié le 2026-07-27 : 71 tables RLS activée, 0 policy, 0 `FORCE`, app connectée en `postgres` = propriétaire).

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

Fondation build/release **#342** · connexion PG portable **#344** · observabilité neutre **#345** · synthèse IA en SSE **#347** · audit + runbook **#346** · staging provisionné et validé au boot (build + 35 migrations + boot OK) · pseudonymisation de l'appel Anthropic **#335** · retrait du motif de consultation des e-mails **#336** · claims questionnaire en SSE + heartbeat P1 **#356** · bornes I/O (embeddings + SMTP) P2 **#377** · journalisation A4 + tests authz A5 **#382** · jeton portail retiré, cookie de session = unique credential exig. 4 **#397**.

**En un coup d'œil, ce qui reste côté assistant (🤖) :** un seul item de code sur
le chemin critique — **RLS exig. 3 (C)**, et c'est un arbitrage de périmètre
(deny-all déjà en place). Hors chemin critique : Sentry **client** (B, à trancher)
et la **PR 2** `DROP COLUMN access_token*` (après fenêtre de stabilité). Tout le
reste est ⚙️ ops (A, D, E) ou ⚖️ juridique (F), à la main du responsable.
