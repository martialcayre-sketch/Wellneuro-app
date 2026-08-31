---
paths:
  - "web/prisma/**"
  - "supabase/**"
  - "web/src/lib/prisma.ts"
  - "web/src/app/api/**"
---

# Base de données, Prisma et API

## Lire la base de production

**La production est sur Scalingo depuis le cutover du 2026-08-22** (`osc-fr1`,
`--hds-resource`). Elle se lit depuis un conteneur one-off :
`scalingo run -d "npx prisma migrate status"` (ou `db execute --file …`),
sortie relue par `scalingo logs --filter one-off-N` — le mode détaché lève
l'exigence de TTY. La base Supabase gelée au cutover et son outil MCP
`execute_sql` **n'existent plus** : décommissionnement `D-080` exécuté le
2026-09-01 (`D-120`, preuve au registre RGPD, rubrique 12). L'unique base est
la production Scalingo, et elle ne se lit que par conteneur.

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

## Éditer `schema.prisma`

- **Ne jamais lancer `npx prisma format`.** Le fichier n'est pas au format
  canonique : la commande réaligne une centaine de lignes étrangères au diff
  (colonnes de `Patient`, `SupplementIngredient`, `Assignation`…), ce que la
  règle « changements minimaux » interdit et qui noie la revue d'une PR
  migration sous du réalignement. Éditer le bloc touché à la main, en alignant
  seulement lui.
- Vérifier avec **`npx prisma validate`**, jamais `format`. La parité
  schéma↔migration se juge par `prisma migrate diff`, joué dans T3 sous
  « Dérive schéma ↔ migrations » — attendu : *No difference detected*.
- **La RLS n'est pas modélisée par Prisma** : une table patient neuve doit
  porter son `ENABLE ROW LEVEL SECURITY` dans la migration, et son contrat SQL
  doit l'assertionner. Sans cela, l'omission ne fait rougir personne — c'est
  ainsi qu'`arbitrages_biologiques` est restée trois jours la seule table de
  `public` sans RLS ([[D-072]]).

## Écrire (migrations)

- Aucune modification de `schema.prisma`, migration ou SQL sans demande
  explicite et confirmation distincte (le hook « demande » la matérialise).
- **Le chemin vers la production depuis le cutover (`D-087`, qui supplante
  `D-086` §1-2)** : migration committée → PR relue (`wn-reviewer`) → merge
  sur `main` → l'auto-deploy Scalingo déploie le **code seul** (le
  `postdeploy` ne migre plus sous `WN_MIGRATIONS_PAR_RELEASE_DB=1`) → le
  workflow `release-db`, proposé automatiquement, applique la migration **en
  one-off dans l'image de production, après approbation humaine**
  (préflights, sentinelles liées au run, empreinte des migrations re-vérifiée
  dans le conteneur). **Le gate humain est l'approbation `release-db`** —
  aucune URL de base ne transite par GitHub. Détail :
  `docs/DEPLOIEMENT_RELEASE_DB.md` (séquence de mise en service comprise).
- Migration et code dépendant : PR séparées, ou drapeau éteint — le code se
  déploie AVANT que la migration soit approuvée ; un ADD se protège par
  drapeau éteint, et le code qui consomme le schéma n'arrive qu'après
  l'application **constatée** par conteneur (précédent : incident du
  2026-08-05, PR #574, à l'époque via le build Vercel).

## Routes API

- Authentifier et autoriser les routes praticien ; valider les entrées côté
  serveur, ne jamais faire confiance au client.
- Ne jamais journaliser token, email patient complet, chaîne de connexion ou
  contenu clinique sensible.
- Préserver la compatibilité des données existantes ; éviter toute suppression
  destructive.
- Lectures de packs : registre relationnel puis fallback legacy, tant que
  cette stratégie est documentée comme active.
