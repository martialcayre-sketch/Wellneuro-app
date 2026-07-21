# RAG WellNeuro — pgvector de production

Version initiale : 2026-07-21

## Objet

Cette couche indexe uniquement les chunks actifs du corpus WellNeuro après validation NotebookLM. Les données patient, candidats, projections NotebookLM, chunks d'audit et documents de gouvernance sont refusés avant génération des embeddings.

## Architecture

- PostgreSQL Supabase, extension `vector`.
- Table `public.rag_corpus_chunks`.
- Embeddings de 1 536 dimensions.
- Index HNSW en distance cosinus.
- Ingestion idempotente et versionnée.
- Recherche interne filtrable par notebook, source et lot.
- Test de récupération obligatoire avant le statut `INDEXE_RAG_PRODUCTION`.

## Variables Vercel

Configurer dans Development, Preview et Production selon le besoin :

- `RAG_PGVECTOR_ENABLED` : `true` pour activer ; toute autre valeur ferme les routes.
- `RAG_INTERNAL_SECRET` : secret aléatoire d'au moins 32 caractères partagé avec Apps Script.
- `OPENAI_API_KEY` : clé du projet d'embeddings.
- `OPENAI_BASE_URL` : base API, par défaut `https://api.openai.com/v1` ; une base régionale peut être utilisée si elle est activée pour le projet.
- `RAG_EMBEDDING_MODEL` : `text-embedding-3-small` par défaut.
- `RAG_EMBEDDING_DIMENSIONS` : obligatoirement `1536` pour cette migration.
- `DATABASE_URL` : pooler Supabase pour le runtime Vercel.

Ne **pas** créer de variable `DIRECT_URL` dans Vercel : les migrations de
production passent exclusivement par `MIGRATE_DATABASE_URL` (scope Production,
URL Supabase en session mode, port 5432), appliquée par
`web/scripts/vercel-build.sh` lors du build. C'est le seul chemin autorisé —
voir « La base de production ne se modifie que par une migration relue »
(`CLAUDE.md`).

Aucune valeur réelle ne doit être ajoutée au dépôt, aux journaux ou aux procès-verbaux.

## Migration

En production : merge sur `main` → build Vercel → `web/scripts/vercel-build.sh`
applique `prisma migrate deploy` via `MIGRATE_DATABASE_URL`. Aucune commande
manuelle.

En local ou CI (base éphémère uniquement) :

```bash
cd web
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
```

La migration :

1. crée le schéma `extensions` si nécessaire ;
2. active l'extension `vector` ;
3. crée `rag_corpus_chunks` avec ses contraintes de confidentialité ;
4. crée l'index HNSW cosinus ;
5. crée la fonction SQL `match_wellneuro_rag_chunks`.

## Contrôle de santé

```bash
curl -H "Authorization: Bearer $RAG_INTERNAL_SECRET" \
  https://app.wellneuro.fr/api/internal/rag/health
```

Le résultat attendu contient :

- `ok: true` ;
- une version pgvector non vide ;
- l'index `rag_corpus_chunks_embedding_hnsw_idx` ;
- les décomptes de chunks, lots et sources.

## Contrat d'ingestion

`POST /api/internal/rag/ingest`

```json
{
  "chunks": [
    {
      "batchId": "LOT_013_2026-07-20",
      "sourceId": "WN-SRC-0056",
      "chunkId": "WN-CH-0056-001",
      "versionSource": "v1.0",
      "versionChunk": "v1.0",
      "notebook": "09 — Nutrition et aliments vedettes",
      "section": "Oméga-3",
      "content": "Markdown normalisé du chunk actif",
      "contentSha256": "empreinte canonique sur 64 caractères",
      "sourceDriveId": "identifiant Drive du support actif",
      "metadata": {
        "arbitrages": "D352-D356"
      },
      "compartment": "ACTIF",
      "indexationAutorisee": true,
      "patientIdentifiable": false
    }
  ]
}
```

La route :

1. authentifie la requête par secret partagé ;
2. normalise le texte selon la règle WellNeuro ;
3. recalcule et compare le SHA-256 ;
4. refuse tout compartiment non actif et toute donnée identifiable ;
5. génère les embeddings ;
6. désactive les anciennes versions du même chunk ;
7. insère ou rejoue idempotemment la version courante ;
8. exécute un test de récupération en base ;
9. renvoie `INDEXE_RAG_PRODUCTION` uniquement si le test est conforme.

Une requête contient un seul lot et au maximum 64 chunks.

## Recherche interne

`POST /api/internal/rag/search`

```json
{
  "query": "Quels garde-fous encadrent une complémentation ?",
  "notebook": "10 — Micronutrition et compléments",
  "sourceIds": ["WN-SRC-0062"],
  "batchIds": ["LOT_013_2026-07-20"],
  "matchCount": 8,
  "minSimilarity": 0.55
}
```

La réponse retourne le texte, les versions, les empreintes et la similarité. Cette route est interne : elle ne doit pas être appelée directement depuis le navigateur patient.

## Intégration Apps Script

Après `MATERIALISE_RAG_MD`, Apps Script doit :

1. construire le tableau `chunks` uniquement depuis `chunks_actifs` ;
2. appeler `/api/internal/rag/ingest` avec le secret conservé dans les propriétés du script ;
3. vérifier `ok: true`, le nombre indexé et le test de récupération ;
4. inscrire `INDEXE_RAG_PRODUCTION` dans le journal ;
5. clôturer le lot seulement après cette preuve.

En cas de réponse 4xx ou 5xx, le lot reste `MATERIALISE_RAG_MD` ou passe en état bloqué documenté ; il n'est jamais déclaré indexé par déduction.

## Rattrapage des anciens lots

Traiter les lots 000 à 012 un par un. Chaque lot doit posséder une preuve NotebookLM exploitable et des chunks actifs cohérents. Un lot sans preuve reste bloqué et n'est pas indexé automatiquement.

## Retour arrière

Mettre `RAG_PGVECTOR_ENABLED=false` ferme immédiatement les routes sans supprimer les données. Ne pas supprimer la table ni l'extension pendant un incident ; conserver les preuves et appliquer une migration corrective versionnée.
