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
2026-09-01 (`D-120`, preuve au registre RGPD, rubrique 12). Le connecteur MCP
Supabase est débranché de claude.ai (constaté le 2026-10-21, plan `D/5`) : les
refus `mcp__claude_ai_Supabase__*` de `.claude/settings.json` sont retirés,
seule reste la garde `guard-supabase-mcp.mjs` sur `execute_sql`, filet si le
connecteur revenait. L'unique base est la production Scalingo, et elle ne se
lit que par conteneur.

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

- **Autorisation permanente bornée (`D-523`, 2026-11-14)** : toute session
  édite `schema.prisma` et écrit par Edit/Write une migration **non
  destructive** (CREATE, ADD COLUMN, index, contrainte, UPDATE ou DELETE
  avec WHERE) sans approbation ; elle lit `prisma migrate status|diff` et
  migre sa base locale par `bash scripts/wn-dev-db.sh --migrate`, lancé
  seul, sans demande. Un mot destructif cité en commentaire ne demande
  plus : le crochet lit le SQL lexé (`D-523` §3.1).
  Restent à la confirmation du responsable, que le hook « demande »
  matérialise : une migration **destructive** (DROP, TRUNCATE, DELETE ou
  UPDATE sans WHERE, RENAME, ALTER … TYPE, MERGE, `EXECUTE` dynamique,
  déclencheur, règle ou RLS désarmés), une migration écrite par
  Bash (son SQL ne se juge pas), `prisma migrate deploy|dev|reset|resolve`,
  `migrate diff --from-migrations|--to-migrations|-o|--shadow…|--config`, `db push`,
  `db execute` hors enveloppe locale, et toute écriture en
  production hors `release-db`. Le SQL destructif en Bash reste refusé.
- **Le chemin vers la production depuis le cutover (`D-087`, qui supplante
  `D-086` §1-2, amendée par `D-520`)** : migration committée → PR
  contre-revue (Codex P0 déposé, GO de `wn-reviewer` sur la tête) → merge
  sur `main` → le **code seul** se déploie (le `postdeploy` ne migre plus
  sous `WN_MIGRATIONS_PAR_RELEASE_DB=1`) → le workflow `release-db` part de
  lui-même et applique la migration **en one-off dans l'image de
  production, sans approbation humaine** (minuteur de 5 min, préflights,
  sentinelles liées au run, empreinte des migrations re-vérifiée dans le
  conteneur). **La porte est le merge** : ce que l'approbation vérifiait se
  vérifie avant lui (`D-520` §2), et aucune URL de base ne transite par
  GitHub. Une migration à la fois, suivie jusqu'au constat par conteneur
  (`D-520` §3). Détail : `docs/DEPLOIEMENT_RELEASE_DB.md` (séquence de mise
  en service comprise).
- **Période transitoire** (`D-520` §6) : tant que l'environnement
  `release-db` garde ses relecteurs requis (lu par `gh api
  repos/{owner}/{repo}/environments/release-db --jq '.protection_rules'`),
  le run attend en `waiting` que l'intégrateur l'approuve, sous la délégation
  du 2026-11-14. Le retrait vient après le lot de gardes (§8), sur un accord
  daté du responsable. Ensuite, le run part seul après le minuteur.
- **Ce que la sonde exige** (`scripts/wn-sonde-release-db.mjs`, `D-520` §3
  et §3 bis) : une migration de `main` qu'aucun run attesté « appliqué » ne
  porte gèle toute PR sur un chemin déclencheur, sauf le revert pur de cette
  migration. Une PR qui ajoute une migration attend le constat de la
  précédente : après la lecture par conteneur, la file écrit sur la PR de
  cette migration la ligne `WN_CONSTAT_RELEASE_DB run=<id du run>`.
- Migration et code dépendant : PR séparées, ou drapeau éteint — le code se
  déploie AVANT que la migration soit appliquée ; un ADD se protège par
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
