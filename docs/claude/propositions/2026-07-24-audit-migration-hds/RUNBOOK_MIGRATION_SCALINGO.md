# Runbook — Migration vers Scalingo (HDS)

Compagnon opérationnel de `AUDIT_MIGRATION_HDS.md`. Décrit les gestes **ops** (à
faire par le responsable du traitement dans la console/CLI Scalingo — hors
dépôt) pour provisionner un environnement, valider les lots de code déjà mergés,
migrer les données et basculer. Rappel : le code de préparation est **inerte**
tant que Scalingo n'est pas provisionné (défauts = comportement Vercel actuel).

## Prérequis
- Compte Scalingo, région **`osc-secnum-fr1`** (HDS), contrat + annexe HDS signés.
- CLI Scalingo installée et authentifiée (`scalingo login`).
- Dépôt connecté (déploiement par push, ou intégration GitHub).

## Lots de code de préparation (état)
| Lot | PR | Effet |
|---|---|---|
| Build/release (Procfile, `db:deploy`, `start:scalingo`) | #342 mergé | Scalingo sait builder + migrer en postdeploy |
| Connexion PostgreSQL portable (`SCALINGO_POSTGRESQL_URL`, `DB_POOL_MAX`, `DB_SSL_CA`) | #344 mergé | L'app se connecte à un Postgres Scalingo |
| Observabilité neutre (`WN_DEPLOY_ENV`, `WN_RELEASE_SHA`) | #345 | Sentry/journal tagués correctement |
| Synthèse en streaming (routeur 30 s) | à venir | La synthèse IA passe le routeur Scalingo |
| Textes RGPD sous-traitant (Vercel→Scalingo) | à venir | Transparence patient |

## Étape 1 — App staging (données FICTIVES d'abord)

1. **Créer l'app** en région HDS :
   `scalingo create wellneuro-staging --region osc-secnum-fr1`
2. **Monorepo** — le code est dans `web/` :
   `scalingo --app wellneuro-staging env-set PROJECT_DIR=web`
3. **Add-on PostgreSQL** (plan HDS ; le badge HDS est sur les plans Business) :
   `scalingo --app wellneuro-staging addons-add postgresql <plan-hds>`
   → injecte `SCALINGO_POSTGRESQL_URL` (l'app la lit via `resolveDatabaseUrl`).
4. **Activer pgvector** (une fois, en CLI — dispo v0.8.2). La migration le crée
   dans le schéma `extensions` ; **ne pas** le pré-créer en `public` (sinon les
   fonctions `match_*` casseraient). Vérifier seulement que le rôle a le droit :
   `scalingo --app wellneuro-staging pgsql-console`
   puis `SELECT * FROM pg_available_extensions WHERE name='vector';`
5. **Variables d'environnement** (voir tableau §3).
6. **Déployer la branche** (push ou depuis GitHub). Le build lance
   `vercel-build.sh` (branche `else` : pas de migration au build), puis le
   **postdeploy** applique les 33 migrations sur la base staging vierge.

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
| `RAG_INTERNAL_SECRET` | ≥ 32 car. | |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | embeddings | |
| `RAG_EMBEDDING_MODEL` / `RAG_EMBEDDING_DIMENSIONS` | modèle / `1536` | |
| Flags produit (`WN_C5_ENABLED`, `WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`, `WN_PORTAIL_TOKEN_TTL_JOURS`…) | **recopier les valeurs prod actuelles** | ne pas allumer de nouveaux flags ici |
| Flags de streaming (`WN_SYNTHESE_STREAM`, `WN_CLAIMS_QUESTIONNAIRE_STREAM`) | **`true`** | **à l'inverse** : à allumer *seulement* sur Scalingo, pour que les routes longues passent le routeur 30 s (défaut off = JSON, Vercel) |

`DATABASE_URL` n'a pas à être posée : `SCALINGO_POSTGRESQL_URL` (add-on) suffit.

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
  `engines` n'est pas posé — décision séparée pour aligner sur 22 (CI).
