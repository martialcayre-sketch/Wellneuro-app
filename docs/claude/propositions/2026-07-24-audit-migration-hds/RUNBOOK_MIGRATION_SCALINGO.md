# Runbook — Migration vers Scalingo (HDS)

Compagnon opérationnel de `AUDIT_MIGRATION_HDS.md`. Décrit les gestes **ops** (à
faire par le responsable du traitement dans la console/CLI Scalingo — hors
dépôt) pour provisionner un environnement, valider les lots de code déjà mergés,
migrer les données et basculer. Rappel : le code de préparation est **inerte**
tant que Scalingo n'est pas provisionné (défauts = comportement Vercel actuel).

## État du staging — provisionné le 2026-07-24, revérifié le 2026-08-05

**Documenter ce staging n'est pas décider d'y aller.** L'orientation arrêtée le
2026-07-22 est de rester sur l'hébergement actuel et de borner la phase de test ;
la dérogation G-TRUST-04 court jusqu'au 2026-10-21. Ces faits sont le point de
départ du jour où cette orientation sera reprise — les redécouvrir coûterait un
second provisionnement, les écrire coûte une relecture.

Provisionné et **validé de bout en bout sur données fictives**, avant toute
migration de données réelles :

- App `wellneuro-staging`, région `osc-fr1`, `HDS: true`.
- Add-on `postgresql-business-512` (`running`), 2 containers `web` en taille `S`.
- Intégration GitHub liée, déploiement auto sur `main`.
- **Déploiement de `main` réussi** : build compilé, **35 migrations Prisma
  appliquées sans erreur sur base vierge** (elles sont 49 au 2026-08-05),
  postdeploy accepté, `https://wellneuro-staging.osc-fr1.scalingo.io` répond
  (`/login` → 200, `/api/internal/rag/health` → 503 attendu, secrets pas encore
  posés).
- **Reste à poser** avant validation fonctionnelle complète (login réel, synthèse
  IA, RAG) : les variables secrètes du tableau §3 — par le responsable, jamais en
  les faisant transiter par l'assistant.

**Revérification du 2026-08-05** (`scalingo apps-info`, `addons`, `ps`) : l'app
tourne toujours, `HDS: true`, add-on `running`, 2 containers `web:S`. Deux écarts
avec le texte d'origine, notés sans être interprétés : la stack est
`scalingo-26`, et une **seconde app `wellneuro`** existe au statut `new` — elle
n'a pas été instruite ici.

## Prérequis
- Compte Scalingo, région **`osc-fr1` + `--hds-resource`** (conforme HDS — c'est ce qui est réellement provisionné). L'audit recommandait `osc-secnum-fr1` (Outscale **SecNumCloud**, souveraine, plus strict) ; le choix `osc-fr1` reste HDS mais **non SecNumCloud** — arbitrage et réserve « périmètre HDS à confirmer par écrit » consignés dans `docs/DECISIONS.md` D‑006. DPA + annexe HDS Scalingo à **e‑signer** avant toute donnée réelle.
- CLI Scalingo installée et authentifiée (`scalingo login`) — via Homebrew
  (`brew install scalingo`, formule core, pas de tap tiers).
- Dépôt connecté par **intégration GitHub** plutôt que par remote git + push :
  évite d'ajouter un remote au `.git/config`, **partagé entre toutes les sessions
  et tous les worktrees**, et découple le déploiement de la branche courante du
  worktree qui exécute la CLI. `scalingo integrations-add github` ouvre un lien
  OAuth à valider dans un navigateur — pas de flux CLI pur.
- **Sortie d'essai gratuit** : `scalingo create` demande une confirmation
  interactive dès la 1ʳᵉ app (bascule en facturation immédiate) — décision du
  responsable, pas un défaut technique.

## Lots de code de préparation (état)
| Lot | PR | Effet |
|---|---|---|
| Build/release (Procfile, `db:deploy`, `start:scalingo`) | #342 mergé | Scalingo sait builder + migrer en postdeploy |
| Connexion PostgreSQL portable (`SCALINGO_POSTGRESQL_URL`, `DB_POOL_MAX`, `DB_SSL_CA`) | #344 mergé | L'app se connecte à un Postgres Scalingo |
| Observabilité neutre (`WN_DEPLOY_ENV`, `WN_RELEASE_SHA`) | #345 mergé | Sentry/journal tagués correctement |
| Synthèse en streaming (routeur 30 s, flag `WN_SYNTHESE_STREAM`) | #347 mergé | La synthèse IA passe le routeur Scalingo |
| Textes RGPD sous-traitant (Vercel→Scalingo) | à venir, **volontairement** | À ne poser qu'au cutover — sinon le texte patient mentirait sur l'hébergeur tant que la prod reste sur Vercel/Supabase |

Les quatre premiers lots sont mergés sur `main` et **inertes pour Vercel**
(défauts = comportement actuel). Le staging peut donc être provisionné sans rien
changer en production.

## Étape 1 — App staging (données FICTIVES d'abord)

1. **Créer l'app** en région HDS, **avec le flag HDS explicite** :
   `scalingo create wellneuro-staging --region osc-fr1 --hds-resource`
   Le flag n'est pas rattrapable après coup (voir « Pièges »).
2. **Monorepo** — le code est dans `web/` :
   `scalingo --app wellneuro-staging env-set PROJECT_DIR=web`
3. **Add-on PostgreSQL** (le badge HDS est sur les plans Business —
   `postgresql-business-512` suffit pour un staging à données fictives) :
   `scalingo --app wellneuro-staging addons-add postgresql postgresql-business-512`
   → injecte `SCALINGO_POSTGRESQL_URL` (l'app la lit via `resolveDatabaseUrl`).
   Provisioning ~30–60 s (`scalingo --app wellneuro-staging addons` jusqu'à
   `running`).
4. **pgvector : rien à faire à l'avance.** La première migration crée l'extension
   dans le schéma `extensions` ; **ne pas** la pré-créer en `public` (sinon les
   fonctions `match_*` casseraient). `pgsql-console` étant interactif (vrai
   terminal requis, inutilisable depuis un script), la vérification manuelle est
   facultative.
5. **Variables d'environnement non secrètes d'abord** (voir tableau §3) :
   `PROJECT_DIR`, `WN_DEPLOY_ENV`, `TZ`, `DB_POOL_MAX`, `WN_SYNTHESE_STREAM`,
   `RAG_PGVECTOR_ENABLED`, `RAG_EMBEDDING_DIMENSIONS`. Les **secrètes** (clés API,
   `NEXTAUTH_SECRET`, OAuth, SMTP, Sentry…) sont posées séparément, par le
   responsable, jamais en clair dans un outil tiers.
6. **Lier le dépôt** — intégration GitHub (voir Prérequis) :
   `scalingo integrations-add github`, puis
   `scalingo --app wellneuro-staging integration-link-create --branch main --auto-deploy --no-deploy-review-apps https://github.com/<owner>/<repo>`.
   Pas de review apps : coût et complexité inutiles ici.
7. **Déployer** :
   `scalingo --app wellneuro-staging integration-link-manual-deploy --follow main`
   (1ᵉʳ déploiement ; les suivants partent à chaque push sur `main`). **Le build
   n'applique aucune migration** — `vercel-build.sh` n'écrit plus en base depuis
   #435, sur aucun chemin. Sur Scalingo, ce sont les **entrées du `Procfile`** qui
   décident : `postdeploy: npm run db:deploy` applique les migrations Prisma sur
   la base staging (35 au 2026-07-24, 49 au 2026-08-05).
8. **Containers** : une app HDS impose un minimum de **2 containers web**
   (`scale web:1` échoue avec `can't scale below 2 containers`). Pour limiter le
   coût d'un staging, réduire la **taille** plutôt que le nombre :
   `scalingo --app wellneuro-staging scale web:2:S --synchronous`.
9. **Peupler les 3 patients fictifs** (Sophie Nicola, Jennifer Martin, Michel
   Dogné) : `prisma:seed` tourne en tâche ponctuelle, dans l'environnement de
   l'app (donc avec le bon `DATABASE_URL`). Utiliser `--detached` — une exécution
   attachée exige un vrai TTY, incompatible avec un script non interactif :
   `scalingo --app wellneuro-staging run --detached npm run prisma:seed`, puis
   `scalingo --app wellneuro-staging logs --filter <one-off-id>` (l'ID est rendu
   par la commande précédente). Confirmé fonctionnel malgré l'élagage des
   `devDependencies` en production (`jiti`/`dotenv` restent résolubles en
   dépendance transitive).

## Étape 2 — Validation staging (avant toute donnée réelle)
- **Build vert** ; taille < 500 Mo (sinon activer `output:'standalone'`).
- **Postdeploy** : les migrations passent ; `scalingo pgsql-console` →
  `SELECT migration_name, bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) FROM _prisma_migrations GROUP BY 1;` toutes appliquées ; extension `vector` présente.
- **Connexion** : logs `[prisma] connexion db host=… tlsNoVerify=…` — viser
  `tlsNoVerify=non` si `DB_SSL_CA` fourni.
- **Parcours** : login praticien (OAuth callback mis à jour), Fil, fiche patient
  (3 patients fictifs seedés), **génération de synthèse IA derrière le routeur**
  (mesurer le premier octet < 30 s, génération 15–40 s qui aboutit) une fois le
  lot streaming livré ; RAG (`/api/internal/rag/health`).
- **Observabilité** : Sentry tague `staging` (poser `WN_DEPLOY_ENV=staging`) et
  non `development`.

## 3 — Variables d'environnement (staging)

| Variable | Valeur | Note |
|---|---|---|
| `PROJECT_DIR` | `web` | buildpack monorepo |
| `WN_DEPLOY_ENV` | `staging` | env neutre (Sentry/journal) |
| `WN_RELEASE_SHA` | SHA du déploiement | Scalingo n'en injecte pas de fiable |
| `TZ` | `UTC` | le Fil/agenda en dépendent |
| `DB_POOL_MAX` | `5`–`10` | conteneur long-running |
| `DB_SSL_CA` | CA racine Scalingo (PEM) | durcissement TLS (vrais retours-ligne) |
| `NEXTAUTH_SECRET` | secret | session praticien |
| `NEXTAUTH_URL` | URL de l'app staging | base des liens |
| `GOOGLE_CLIENT_ID` / `_SECRET` | OAuth praticien | **ajouter l'URI de callback staging** |
| `ANTHROPIC_API_KEY` | clé | synthèse IA |
| `CLAUDE_MODEL` / `WN_CLAIMS_CLAUDE_MODEL` | modèles | comme prod |
| `SMTP_URL` | URL SMTP | optionnel (best-effort) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_TRACES_SAMPLE_RATE` | Sentry | résidence UE à vérifier (audit §7.4) |
| `RAG_PGVECTOR_ENABLED` | `true` | ouvre les routes RAG |
| `RAG_INTERNAL_SECRET` | ≥ 32 car., **généré sur place** | voir la note sous le tableau |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | embeddings | |
| `RAG_EMBEDDING_MODEL` / `RAG_EMBEDDING_DIMENSIONS` | modèle / `1536` | |
| Flags produit (`WN_C5_ENABLED`, `WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`, `WN_PORTAIL_TOKEN_TTL_JOURS`…) | **recopier les valeurs prod actuelles** | ne pas allumer de nouveaux flags ici |
| Flags de streaming (`WN_SYNTHESE_STREAM`, `WN_CLAIMS_QUESTIONNAIRE_STREAM`) | **`true`** | **à l'inverse** : à allumer *seulement* sur Scalingo, pour que les routes longues passent le routeur 30 s (défaut off = JSON, Vercel) |

`DATABASE_URL` n'a pas à être posée : `SCALINGO_POSTGRESQL_URL` (add-on) suffit.

**`RAG_INTERNAL_SECRET` ne se récupère pas, il se génère.** C'est un secret
auto-généré, comparé en interne par l'app (`web/src/lib/rag/auth.ts`), et non la
clé d'un service tiers : inutile de reprendre celui de la production, le générer
en staging (`openssl rand -hex 32`) est plus sûr et plus simple. ⚠️ `scalingo
env-set` **réaffiche la valeur en confirmation** — rediriger la sortie
(`> /dev/null 2>&1`) pour ne jamais l'exposer dans un terminal partagé ou un
historique de session ; si elle fuit malgré tout, la regénérer immédiatement
(aucune dépendance externe à resynchroniser). Health check sans jeton : `401` =
configuration valide (bon signe) ; `503 configured:false` = variable absente ou
trop courte.

## 4 — Migration des données (après staging vert, en prod HDS)
Ordre impératif : **`migrate deploy` sur la cible AVANT** le chargement des
données (les objets pgvector exigent l'extension présente). Puis dump logique
Supabase → restore data-only, **reconstruire/valider les index HNSW**, contrôler
comptes de lignes et fonctions `match_*`. Les 4 tables `rag_corpus_*`
(externes Prisma) migrent comme données. Voir audit §5 (chiffrage) et §6
(rétro-planning S1–S13).

## 5 — Cutover et décommission
TTL DNS réduit → fenêtre de gel → delta-sync → `migrate status` vert sur la cible
→ bascule DNS `app.wellneuro.fr` → Vercel/Supabase gardés chauds (rollback) →
après stabilité, **sortie propre avec preuve d'effacement écrite** (registre
RGPD) → merge des PR de nettoyage (`clone_env_vars.py`, `vercel.json`, scripts
`supabase:*`) → **acte de levée de G-TRUST-04** par le responsable (checklist).

## Pièges retenus (revues adversariales)
- **`PROJECT_DIR=web` absent** → Scalingo ne trouve pas le Procfile → le
  postdeploy ne tourne pas → base en retard, silencieusement. À vérifier au 1ᵉʳ
  déploiement.
- **Ne jamais provisionner par `migrate deploy` seul** : il ne crée que le
  schéma. Les données (C5 CIQUAL, patients) viennent du dump.
- **pgvector** : laisser la migration créer l'extension en schéma `extensions`.
- **Node** : Scalingo tourne sur son défaut (24, comme Vercel) tant que le pin
  `engines` n'est pas posé — décision séparée pour aligner sur 22 (CI). Confirmé
  au 1ᵉʳ déploiement staging (`Downloading and installing node 24.18.0`).
- **`--hds-resource` à la création, jamais après.** `scalingo create` sans ce flag
  donne une app à `HDS: false` **même en région HDS**, et aucune commande ne
  bascule le statut ensuite : le seul recours est de détruire et recréer. Sans
  risque tant que l'app est vide — c'est ce qui a été fait au 1ᵉʳ essai ici.
- **2 containers minimum sur une ressource HDS** : `scale web:1` échoue
  (`can't scale below 2 containers`). Réduire la **taille** (`web:2:S`), pas le
  nombre, pour limiter le coût d'un staging.
- **Remote git partagé** : `scalingo create` propose d'ajouter un remote
  `scalingo` au dépôt courant. Dans un worktree, ce `.git/config` est **partagé
  avec toutes les sessions** — préférer l'intégration GitHub, qui déploie une
  branche indépendamment du worktree qui pilote la CLI.
