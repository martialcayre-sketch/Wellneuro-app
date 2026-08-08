---
paths:
  - "web/prisma/**"
  - "supabase/**"
  - "web/src/lib/prisma.ts"
  - "web/src/app/api/**"
---

# Base de données, Prisma et API

## Lire la base de production

Uniquement l'outil MCP Supabase `execute_sql` — jamais `psql`, ni une commande
Bash. Le hook `.claude/hooks/guard-supabase-mcp.mjs` autorise les lectures sans
interruption et refuse toute écriture ou DDL ; les outils MCP mutants sont
refusés par `.claude/settings.json`.

**Un nom de migration porte plusieurs lignes dans `_prisma_migrations`.** Un
échec suivi d'un `migrate resolve --applied` laisse la ligne annulée en place
et en ajoute une seconde (`applied_steps_count = 0`). Lire une ligne isolée
fait conclure à tort qu'une migration manque. Toujours agréger par nom :

```sql
SELECT migration_name,
       bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) AS appliquee,
       count(*) AS tentatives, max(started_at) AS derniere
FROM _prisma_migrations GROUP BY migration_name
ORDER BY max(started_at) DESC LIMIT 5;
```

Une base saine ne rend rien à la requête inverse — celle qui liste les
migrations dont *aucune* tentative n'a abouti :

```sql
SELECT migration_name FROM _prisma_migrations GROUP BY migration_name
HAVING bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) IS NOT TRUE;
```

## Écrire (migrations)

- Aucune modification de `schema.prisma`, migration ou SQL sans demande
  explicite et confirmation distincte (le hook « demande » la matérialise).
- Le seul chemin vers la production : migration committée → PR relue → merge
  sur `main` → workflow `release-db`, déclenché automatiquement et gaté par un
  relecteur requis. Le build Vercel n'écrit pas en base. Détail :
  `docs/DEPLOIEMENT_RELEASE_DB.md`.
- Migration et code dépendant : PR séparées, ou drapeau éteint (le merge
  déclenche le déploiement Vercel avant l'approbation de la release —
  incident du 2026-08-05, PR #574).

## Routes API

- Authentifier et autoriser les routes praticien ; valider les entrées côté
  serveur, ne jamais faire confiance au client.
- Ne jamais journaliser token, email patient complet, chaîne de connexion ou
  contenu clinique sensible.
- Préserver la compatibilité des données existantes ; éviter toute suppression
  destructive.
- Lectures de packs : registre relationnel puis fallback legacy, tant que
  cette stratégie est documentée comme active.
