# Runbook — Migration vers Scalingo (HDS)

Compagnon opérationnel de `AUDIT_MIGRATION_HDS.md`. Décrit les gestes **ops** (à
faire par le responsable du traitement dans la console/CLI Scalingo — hors
dépôt) pour provisionner un environnement, valider les lots de code déjà mergés,
migrer les données et basculer. Rappel : le code de préparation est **inerte**
tant que Scalingo n'est pas provisionné (défauts = comportement Vercel actuel).

## État du staging — provisionné le 2026-07-24, revérifié le 2026-08-05

**La migration est décidée.** `docs/DECISIONS.md` D-006 (2026-07-28) pose la
cible « Scalingo seul », et **D-037 (2026-08-09) la confirme** en avançant la
revue de la dette HDS du 2026-10-21 à la réponse de Scalingo au ticket du
2026-08-09. **Cette réponse est arrivée le 2026-08-11** et a été tranchée le
jour même par **D-047** : la revue attendue a donc eu lieu, et ce qu'elle a
rendu est plus bas, aux prérequis. Ce runbook a longtemps ouvert sur l'inverse — « l'orientation
arrêtée le 2026-07-22 est de rester sur l'hébergement actuel » —, formulation au
présent d'un arbitrage **antérieur de six jours à D-006** et jamais consigné au
registre. L'évènement reste vrai et daté (le 2026-07-21 instruit l'hébergement et
la dérogation, le 2026-07-22 arbitre) ; il n'est plus l'orientation courante.

La dérogation G-TRUST-04, elle, **court toujours jusqu'au 2026-10-21** — D-037
n'y touche pas.

**Ce qui suit décrit un boot technique, pas une recette.** La formule « validé de
bout en bout » employée ici a été lue comme une validation fonctionnelle : elle
ne l'est pas, et la ligne « reste à poser » ci-dessous le disait déjà. Les trois
items fonctionnels de `CHECKLIST_FINALISATION.md` §A (login praticien réel,
synthèse IA en SSE, parcours Fil/fiche/RAG) **ne sont pas cochés**, et aucun
rapport de recette sur staging n'existe.

Provisionné et **validé au boot sur données fictives**, avant toute migration de
données réelles :

- App `wellneuro-staging`, région `osc-fr1`, `HDS: true`.
- Add-on `postgresql-business-512` (`running`), 2 containers `web` en taille `S`.
- Intégration GitHub liée, déploiement auto sur `main`.
- **Déploiement de `main` réussi** : build compilé, **35 migrations Prisma
  appliquées sans erreur sur base vierge**, postdeploy accepté,
  `https://wellneuro-staging.osc-fr1.scalingo.io` répond
  (`/login` → 200, `/api/internal/rag/health` → 503 attendu, secrets pas encore
  posés).
- **Reste à poser** avant validation fonctionnelle complète (login réel, synthèse
  IA, RAG) : les variables secrètes du tableau §3 — par le responsable, jamais en
  les faisant transiter par l'assistant. S'y ajoutent les **flags produit de la
  production** : sans eux, le staging n'exerce pas le périmètre fonctionnel de la
  prod et sa recette ne prouve rien de ce qui compte.
- **L'état de schéma du staging n'est pas mesuré** depuis le 2026-07-24, où 35
  migrations avaient été appliquées sur base vierge. `main` en porte davantage
  aujourd'hui — mais on ne peut **rien en conclure** : l'intégration GitHub
  déploie automatiquement sur `main` (ci-dessus), donc le `postdeploy` a rejoué
  `db:deploy` à chaque merge. Les revérifications du 2026-08-05 et du 2026-08-09
  se sont faites par `apps-info`, `addons` et `ps` — **aucun des trois ne lit
  l'état des migrations**. Le seul contrôle valable est
  `prisma migrate status` rendant « up to date », sur un conteneur `scalingo run`.
  En interactif il exige un TTY, mais **le mode détaché s'en passe** :
  `scalingo run -d "npx prisma migrate status"`, sortie dans
  `logs --filter one-off-N` — joué ainsi sur la prod le 2026-08-22
  (one-off-602 : 56 migrations, schéma à jour).
- **Le compteur de migrations ne s'écrit pas à la main.** Une rédaction
  antérieure portait « elles sont 49 au 2026-08-05 » : le chiffre était **exact
  à sa date** (49 répertoires au commit `0c52cc1d`) et a **périmé en quatre
  jours**. Ce n'est pas la valeur qui était en cause mais le procédé — un
  compteur figé sert de contrôle à la bascule (« toutes appliquées sans erreur »)
  et dérive en silence.

**Revérification du 2026-08-05** (`scalingo apps-info`, `addons`, `ps`) : l'app
tourne toujours, `HDS: true`, add-on `running`, 2 containers `web:S`. Deux écarts
avec le texte d'origine, notés sans être interprétés : la stack est
`scalingo-26`, et une **seconde app `wellneuro`** existe au statut `new` — elle
n'a pas été instruite ici.

## Prérequis

- Compte Scalingo, région **`osc-fr1` + `--hds-resource`** (conforme HDS — c'est ce qui est réellement provisionné). L'audit recommandait `osc-secnum-fr1` (Outscale **SecNumCloud**, souveraine, plus strict) ; le choix `osc-fr1` reste HDS mais **non SecNumCloud** — arbitrage et réserve « périmètre HDS à confirmer par écrit » consignés dans `docs/DECISIONS.md` D‑006 et D‑037. **`osc-secnum-fr1` n'est pas accessible sur ce compte** : `scalingo regions` ne rend qu'`osc-fr1` (relevé le 2026-08-09), l'y basculer suppose donc une demande d'accès préalable, pas un choix de commande.
- ~~**Le DPA ne s'e‑signe pas chez ce fournisseur**~~ — **DÉMENTI PAR ÉCRIT LE 2026-08-11 (D-047), la ligne est laissée pour mémoire.** La lecture du 2026-08-09 déduisait de l'existence de la souscription que certification HDS et accord de sous‑traitance vivaient dans les **documents généraux** acceptés à la souscription, et qu'il n'y avait donc **rien à signer** — déduction marquée à l'époque « non confirmée, question de forme PAS posée au ticket ». Elle a été posée depuis, et **Scalingo répond l'inverse** : l'accord se compose du **DPA et d'une annexe HDS distincte**, à signer séparément — « l'acceptation des conditions générales seule ne suffit pas » à activer l'option HDS. **Ce qui est dû n'est donc pas une copie à archiver mais une annexe à obtenir et à signer**, puis les deux pièces à archiver. La réserve reste ouverte, et pour une raison plus lourde qu'écrit ici : une souscription inférée n'est pas une preuve produite, et elle n'est pas non plus un contrat signé. Démarche et texte de demande : `docs/claude/campagnes/2026-08-18-echeance-hds-g-trust-04/lots/LOT-01-annexe-hds-et-arbitrage.md`.
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
(rétro-planning S1–S13). **Exécutée le 2026-08-22 — le déroulé réel et ses
pièges sont en fin de document.**

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

## Ce que l'exécution de la migration des données a appris (2026-08-22)

Exécutée dans la nuit du 2026-08-21 au 2026-08-22 : dump de la source à
02:13 CEST, restore achevé sur la cible à **03:24:09 CEST** — c'est la date de
bascule consignée au dossier RGPD (rubrique 12), celle qui ouvre la fenêtre de
moindre couverture de `D-078`. Comptes conformes à la référence figée côté
source le même jour (19 patients, 118 réponses, ~360 k lignes). Dans l'ordre
des découvertes :

- **`pg_dump` 15 refuse une source PostgreSQL 17.** Les outils Homebrew par
  défaut étaient en 15.18 ; passer par `libpq` (`brew install libpq`,
  binaires sous `/opt/homebrew/opt/libpq/bin`).
- **Dumper par le Session pooler Supabase (port 5432), jamais le Transaction
  pooler (6543)** — et la « Direct connection » est souvent IPv6-seulement
  depuis un poste résidentiel. L'URL qui convient est celle de
  `MIGRATE_DATABASE_URL` (connexion directe/session), pas `DATABASE_URL`
  (poolée).
- **FK auto-référente** : `rag_corpus_claim_decisions.tirage_id → id` (même
  table) fait échouer un restore data-only. Remède propre : `DROP CONSTRAINT`
  avant, restore, `ADD CONSTRAINT` après — la re-pose revalide toutes les
  lignes d'un coup. `--jobs=1` obligatoire pour préserver l'ordre FK global.
- **Le déclencheur clinique `rag_claim_decisions_avant_insertion` rejette le
  `COPY` de `pg_restore` en bloc** (« la voie lente ne se signe jamais par
  lot ») : il traite le lot de restauration comme un lot de signatures
  applicatives. Un restore base-à-base de données déjà validées en production
  doit le **désactiver ciblément** le temps du `COPY` de cette seule table —
  **feu vert explicite du responsable requis** (accordé le 2026-08-22, séance
  tenante), réactivation immédiate vérifiée (les 3 triggers à `O`), puis
  revalidation par la re-pose de la FK. **L'alternative « respectueuse »
  ligne à ligne serait pire** : la règle du jour rejetterait ≥ 72 claims
  historiques, migrant une histoire décisionnelle amputée en silence.
- **`db-tunnel` exige une clé SSH enregistrée au compte**, et `--identity`
  relit le fichier de clé à chaque reconnexion — une clé chiffrée met le
  tunnel en boucle de passphrase. Remède : clé dédiée **sans passphrase**,
  créée pour le geste et **révoquée sitôt après** (`keys-remove`). Piège dans
  le piège : le premier `keys-remove` a répondu « deleted » sans rien
  supprimer — toujours revérifier par `scalingo keys`.
- **L'authentification du restore passe par `~/.pgpass`** rempli par le
  responsable (jamais par l'assistant), vidé sitôt le geste fini. Un
  copier-coller de mot de passe y introduit facilement un caractère
  parasite — comparer les longueurs avant d'accuser autre chose.
- **Conflits PK attendus sur `biology_*`** (`analytes`, `panels`,
  `panel_items`) : ces tables sont seedées par les migrations sur la cible,
  le dump apporte les mêmes lignes — les `duplicate key` sont sans perte,
  vérifiables par comptes identiques à la référence.
- **Aucune séquence à resynchroniser** : zéro `autoincrement` au schéma, tous
  les identifiants sont des cuid — un souci classique de migration qui,
  ici, n'existe pas.
- **Figer les comptes de la source AVANT le dump** (ici par `execute_sql`,
  lecture seule) : c'est la seule référence opposable au moment de valider le
  restore ; les tables vivantes bougent tant que l'ancienne prod écrit, le
  delta se rattrape au gel du cutover.
