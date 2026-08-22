# Checklist — Finalisation de la migration HDS/Scalingo

Compagnon de `AUDIT_MIGRATION_HDS.md` et `RUNBOOK_MIGRATION_SCALINGO.md`.
Liste de contrôle de bout en bout pour **lever la dérogation du 2026-10-21**.
État arrêté le 2026-07-27 (staging provisionné ; fondation + P0 + **tout le code B**
mergés — P1 #356, P2 #377, A4/A5 #382 ; jeton portail retiré au titre de
l'exig. 4 par #397). **Plus aucun item de code sur le chemin critique : RLS exig. 3 (C)
tranché le 2026-07-27 — posture A, deny-all documenté, aucun code base.**

**Légende de responsabilité**
- 🤖 **code** — assistant, 1 PR par lot, derrière flag, inerte pour Vercel, revue adversariale (`wn-reviewer`) avant merge
- ⚙️ **config/ops** — responsable, console/CLI Scalingo (hors dépôt)
- 🖥️ **validation navigateur** — responsable (hors portée CLI)
- 🚪 **porte** — nécessite un « go explicite » du responsable
- ⚖️ **juridique** — responsable ; conditionne la levée de dérogation, pas la faisabilité technique

Chemin critique le plus court vers un go : **A → D → E** (tout le code B/C est fait — B par #356/#377/#382,
C RLS tranché posture A le 2026-07-27, jeton exig. 4 par #397). **F (juridique)** court en parallèle et conditionne le « GO données
réelles ».

---

## A. Config & validation staging (débloque tout le reste)

- [x] ⚙️ Recopier les **flags produit** prod → staging : `WN_C5_ENABLED`, `WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT` — fait le 2026-08-21. `WN_PORTAIL_TOKEN_TTL_JOURS` n'existe plus dans le code (jeton portail retiré par #397) ; référence laissée pour mémoire, rien à poser.
- [ ] ⚙️ Réconcilier **`DATABASE_URL`** posée sur staging (doublon de l'add-on à confirmer, sinon retirer) — elle a **priorité** sur `SCALINGO_POSTGRESQL_URL` (`resolveDatabaseUrl()`) et peut masquer la vraie voie de connexion Scalingo
- [ ] ⚙️ (Optionnel staging) `WN_RELEASE_SHA` au déploiement ; aligner `CLAUDE_MODEL` / `WN_CLAIMS_CLAUDE_MODEL` sur le modèle épinglé prod ; `SENTRY_TRACES_SAMPLE_RATE`
- [x] 🖥️ **Login praticien réel** via OAuth Google (URI de callback staging enregistrée côté Google) — fait le 2026-08-21, après correction de `GOOGLE_CLIENT_ID` et redémarrage explicite des conteneurs. Détail : `RAPPORT_RECETTE_STAGING.md`
- [x] 🖥️ Générer une **synthèse IA** en observant le **SSE sous le routeur 30 s** (premier octet < 30 s, génération 15–40 s qui aboutit) — premier octet tenu (77–344 ms sur 3 essais), durée totale hors fenêtre (50,6–54,4 s) mais **jugée acceptable par le responsable le 2026-08-22**. Détail : `RAPPORT_RECETTE_STAGING.md`
- [x] 🖥️ Parcours Fil / fiche patient / RAG santé (`/api/internal/rag/health`) sur données fictives — fait le 2026-08-21. Détail : `RAPPORT_RECETTE_STAGING.md`

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
- [x] 🚪🤖 **RLS** exig. 3 — **tranché le 2026-07-27 : posture A retenue** (deny-all documenté comme suffisant, **aucun code base**). Le socle **deny-all** déjà en place — RLS activée, **zéro policy et zéro `FORCE`** sur 71 tables `public` (migration `20260707123710_enable_rls_security`, état prod vérifié : app connectée en `postgres` = propriétaire) — neutralise le vecteur réel (API de données managée Supabase, rôles `anon`/`service`) ; l'isolation ligne à ligne reste **applicative** (portail par `session.idPatient`, praticien Google `@wellneuro.fr`). Posture B (`FORCE` + policies par principal) **écartée à ce stade** (disproportionnée pour une app mono-domaine, risque de régression). Décision inscrite au registre : **`docs/DECISIONS.md` D-005**. **Confirmée par le DPO le 2026-07-27** — la posture A (deny-all base + gardes applicatifs) satisfait l'exigence 3 (note `NOTE_DPO_RLS_EXIG3.md` envoyée ; confirmation relayée par le responsable, à archiver par écrit au dossier d'audit). Plus de résidu RLS. Si un audit ultérieur exige l'isolation base : bascule posture B (🚪 go + fenêtre dédiée, protocole renforcé, à démarrer tôt). **Détail + les deux postures chiffrées : `ADDENDUM_RLS_EXIG3.md`.**

## D. App PROD HDS + migration des données (⚙️ responsable, runbook §4)

- [x] ⚙️ Provisionner l'app **prod HDS** : `osc-fr1`, `--hds-resource` **à la création**, add-on PostgreSQL Business, `PROJECT_DIR=web`, **tous les secrets prod + `DB_SSL_CA`** (durcissement TLS, non posé en staging) — **fait le 2026-08-21** (app `wellneuro`, PostgreSQL Business 512, secrets posés par le responsable sans transit par l'assistant, `DB_SSL_CA` posé).
- [x] ⚙️ `migrate deploy` sur la cible **AVANT** le chargement des données (les objets pgvector exigent l'extension présente) — **fait le 2026-08-21** par le `postdeploy` du déploiement initial ; preuve en creux pendant le restore de la nuit : FK et déclencheur clinique étaient en place (c'est même lui qui a refusé le `COPY`).
- [x] ⚙️ Dump logique Supabase → restore data-only → **reconstruire/valider les index HNSW** → contrôler comptes de lignes + fonctions `match_*` (dont les 4 tables `rag_corpus_*`, externes Prisma) — **fait le 2026-08-22** (bascule 03:24:09 CEST, comptes exacts vs référence gelée, dont 8 144 `rag_corpus_claim_decisions` revalidées par la re-pose de la FK). **Ce que cette case ne dit pas** : HNSW et `match_*` n'ont pas été re-testés unitairement sur la cible — exercés par la recette RAG staging sur le même schéma, à confirmer au premier usage RAG réel en prod.

## E. Cutover & décommission (⚙️ responsable, runbook §5)

- [x] ⚙️🤖 **Textes RGPD sous-traitant** Vercel→Scalingo (`gouvernance.ts`, `contenus/registre.ts` versionné+hash) — **AU CUTOVER seulement** (les changer avant mentirait au patient sur l'hébergeur réel) — **fait au cutover, le 2026-08-22** : `DONNEES_CONFIDENTIALITE_V2` publiée (**#732**), v1 conservée au registre immuable.
- [x] ⚙️ TTL DNS réduit → fenêtre de gel → delta-sync → `migrate status` vert sur la cible → bascule DNS `app.wellneuro.fr` → Vercel/Supabase gardés chauds (rollback) — **fait le 2026-08-22** : delta-sync sans objet (17 tables vivantes identiques, zéro écart), bascule DNS ~04:05 CEST, Vercel/Supabase gardés chauds jusqu'au 2026-09-01 (`D-080`). **Chronologie assumée** : le `migrate status` formel **sur conteneur prod** a été joué a posteriori le même jour (one-off-602, 11:44 CEST — 56 migrations, « Database schema is up to date! ») ; avant bascule, seuls les logs de `postdeploy` en tenaient lieu.
- [ ] ⚙️ Après stabilité : **preuve d'effacement écrite** (registre RGPD) → merge des PR de nettoyage (`clone_env_vars.py`, `vercel.json`, scripts `supabase:*`)
- [ ] 🤖 (Séparé) Décision pin `engines` Node 22 pour aligner sur le CI

## F. Juridique / conformité — ⚖️ responsable (conditionne le « GO données réelles » et la levée de dérogation)

- [ ] ⚖️ ~~**Arbitrage fournisseur**~~ **rendu** (Scalingo — `D-006`, confirmé `D-037`, migration engagée par `D-078` le 2026-08-19) + devis écrit → **contrat + annexe HDS signés : TOUJOURS PENDANTS** (annexe demandée le 2026-08-12, relancée le 2026-08-19, sans réponse). La case reste ouverte : c'est la signature qui la ferme, pas l'arbitrage.
- [ ] ⚖️ **AIPD** · **DPA** à signer/archiver (hébergeur, Anthropic, SMTP, Google, Sentry) · **pentest léger** (exig. 7 G-TRUST-04)
- [ ] ⚖️ Identifier le **fournisseur SMTP réel** + localisation/DPA ; vérifier **résidence UE Sentry** (audit §7.4)
- [x] ⚖️ **Acte de levée de G-TRUST-04** — **fait le 2026-08-19** (`D-078` ; source : `CHECKLIST_ACTIVATION_G_TRUST_04.md` §« Décision du responsable du traitement — 2026-08-19 »). **Attention à ce que cette case dit et ne dit pas** : c'est une levée **par écart assumé**, pas la levée-conformité que cette puce visait — les sept exigences sont inchangées (une ❌, six partielles, aucune ✅). **L'échéance de revue reste le 2026-10-21.**

---

## Déjà fait ✅

Fondation build/release **#342** · connexion PG portable **#344** · observabilité neutre **#345** · synthèse IA en SSE **#347** · audit + runbook **#346** · staging provisionné et validé au boot (build + 35 migrations + boot OK) · pseudonymisation de l'appel Anthropic **#335** · retrait du motif de consultation des e-mails **#336** · claims questionnaire en SSE + heartbeat P1 **#356** · bornes I/O (embeddings + SMTP) P2 **#377** · journalisation A4 + tests authz A5 **#382** · jeton portail retiré, cookie de session = unique credential exig. 4 **#397** · RLS exig. 3 tranché **posture A** (deny-all documenté, `docs/DECISIONS.md` D-005), **confirmée par le DPO le 2026-07-27**.

**En un coup d'œil, ce qui reste côté assistant (🤖) :** plus aucun item de code
sur le chemin critique — **RLS exig. 3 tranché posture A le 2026-07-27** (deny-all
documenté, D-005 ; **confirmée par le DPO le 2026-07-27**, plus de résidu RLS). Hors chemin
critique : Sentry **client** (B, à trancher), la **PR 2** `DROP COLUMN access_token*`
(après fenêtre de stabilité) et les **textes RGPD** au cutover (E). Tout le reste
est ⚙️ ops (A, D, E) ou ⚖️ juridique (F), à la main du responsable.
