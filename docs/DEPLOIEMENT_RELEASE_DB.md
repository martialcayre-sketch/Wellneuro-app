# Release DB — appliquer migrations et imports hors du build Vercel

Ce document décrit le workflow GitHub Actions [`release-db.yml`](../.github/workflows/release-db.yml)
et son runbook. Il sépare l'**écriture en base de production** (migrations Prisma,
import de nomenclature NABM) du **build applicatif Vercel**.

## Pourquoi

`web/scripts/vercel-build.sh` appliquait historiquement les migrations et les
imports **au build**. Deux défauts :

1. **Fail-open** — `MIGRATE_DATABASE_URL` absente : le build avertissait puis
   **continuait**. Du code pouvait se déployer sur une base en retard, sans échec.
2. **Rouge ≠ rien écrit** — le contrat CB-02a s'exécutait **après le COMMIT** de
   l'import : un échec de contrat laissait la donnée écrite et le build rouge.

Le workflow `release-db` porte l'écriture ; le build redevient un pur `next build`
sans effet de bord (voir le lot de bascule qui allège `vercel-build.sh`). Il
s'aligne sur le modèle déjà en place côté Scalingo (`web/scripts/db-deploy.sh` +
`postdeploy` du Procfile), où les migrations tournent **après** le build sur un
conteneur dédié.

## Ce que le workflow fait

Déclenché à la main (`workflow_dispatch`), gaté par l'environnement protégé
`production` (required reviewers = **second gate humain**, en plus de la revue de
la PR qui a mergé la migration). Séquence, reprise telle quelle du build :

```
préflight (lecture seule) → migrate deploy → [import-cb] advisors → import NABM → contrat
```

Deux modes :

| Mode | Effet |
|---|---|
| `migrate-only` | préflight + `prisma migrate deploy` |
| `import-cb` | idem + advisors Supabase (`--fail-on warn`) + import NABM CB-02a + contrat catalogue |

`migrate deploy` n'invente jamais de SQL : il applique les migrations committées
(relues en PR). L'import NABM est **transactionnel et idempotent** : rejouable
sans risque, il sort sans écrire si le millésime+empreinte sont déjà servis.

### Pourquoi l'import C5 CIQUAL n'est PAS câblé ici

Volontaire. L'import C5 (`prisma/importCiqual2025.ts`) garde son écriture derrière
`VERCEL_ENV === 'production'` — un contrôle qui **ne tient pas hors Vercel** et
qu'il faudrait désarmer (`--allow-non-production`) pour le lancer en Actions, ce
qui reviendrait au faux-garde que l'import NABM a précisément remplacé par
`--base`. Avant de brancher C5 ici, refaire son garde à la manière de NABM (nommer
l'hôte visé) — petit refactor à revoir en adversarial. En pratique, C5 est déjà
importé (append-only, idempotent) et re-semé par **dump/restore** côté Scalingo,
donc sans besoin immédiat d'un chemin d'exécution.

## Étapes ops (une seule fois — responsable)

Ces gestes se font dans l'interface, hors code :

1. **GitHub → Settings → Environments → `production`** : créer l'environnement,
   activer **Required reviewers** (les personnes autorisées à approuver une
   écriture prod).
2. **Secrets de l'environnement `production`** :
   - `MIGRATE_DATABASE_URL` — URL directe Supabase (session mode, port 5432).
   - `WN_CB_NABM_IMPORT_CONFIRMATION` — jeton `CB-02A-IMPORT-NABM-V105-MC-2026-07-26-v1`
     (doit être **identique** à la constante épinglée dans le code, sinon l'import
     refuse).
3. **Retirer de Vercel** (scope Production) `MIGRATE_DATABASE_URL` et les jetons
   d'import `WN_C5_CIQUAL_IMPORT_CONFIRMATION` / `WN_CB_NABM_IMPORT_CONFIRMATION` /
   `WN_CB_NABM_IMPORT_BASE`. Depuis l'allègement, le build ne les lit plus : ce
   retrait est de l'hygiène (ne pas laisser traîner la connexion de prod), pas une
   condition de correction.

> **Ordre de bascule.** `release-db` est désormais l'**unique** chemin d'écriture :
> le build ne migre plus. Les étapes 1–2 (environnement + secrets) doivent donc
> être faites **avant** de merger le lot qui allège `vercel-build.sh` — sinon
> aucune migration future n'a de chemin d'application et la base fige. Le workflow
> étant manuel, il ne fait rien tant qu'on ne le déclenche pas.

## Déclencher une release

Interface : **Actions → Release DB → Run workflow**, choisir le `mode` (et
`nabm_base` pour `import-cb` : l'hôte de `MIGRATE_DATABASE_URL`). Ou :

```bash
# Migration seule
gh workflow run release-db.yml -f mode=migrate-only

# Import NABM (nommer l'hôte visé — garde --base)
gh workflow run release-db.yml -f mode=import-cb -f nabm_base=<hote-de-MIGRATE_DATABASE_URL>
```

L'exécution reste **en attente d'approbation** tant qu'un reviewer de
l'environnement `production` ne l'a pas approuvée.

## Ordonnancement — expand/contract

Une migration **additive** s'applique via `release-db` **avant** le déploiement du
code qui en dépend (garder la PR de migration séparée de la PR fonctionnelle,
comme déjà pratiqué). Le build tolère une base « en avance » ; jamais une base
« en retard » sur du code qui exige le nouveau schéma. Ordre type :

1. Merger la PR de migration → déclencher `release-db` (`migrate-only`) → approuver.
2. Vérifier la base (ci-dessous).
3. Merger/déployer la PR fonctionnelle qui consomme le schéma.

## Vérifier après coup

Lecture seule via l'outil MCP Supabase `execute_sql` (voir `CLAUDE.md` → « Lire la
base de production ») :

- **Migration appliquée** — agréger `_prisma_migrations` par nom (une migration
  porte plusieurs lignes) :
  ```sql
  SELECT migration_name,
         bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) AS appliquee
  FROM _prisma_migrations GROUP BY migration_name
  ORDER BY max(started_at) DESC LIMIT 5;
  ```
- **Pointeur NABM cohérent** (après `import-cb`) :
  ```sql
  SELECT v.version_source, v.nombre_entrees,
         (SELECT count(*) FROM biology_nabm_actes a WHERE a.version_source = v.version_source) AS actes
  FROM biology_catalog_versions_courantes v WHERE v.source_provenance = 'nabm_smt_ans';
  ```
  `nombre_entrees` doit égaler le compte d'actes du millésime servi.

Cette vérification post-déploiement est **obligatoire** pour une release de
migration ou d'import (exception migration/auth de `CLAUDE.md`).
