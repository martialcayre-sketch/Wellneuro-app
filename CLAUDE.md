# CLAUDE.md — Wellneuro NNPP2

Contexte pour Claude Code sur ce dépôt. Lu automatiquement à chaque session.

## Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL (Supabase)
- NextAuth — OAuth Google restreint au domaine `@wellneuro.fr`
- Déploiement Vercel (`app.wellneuro.fr`)

## Contexte projet

Wellneuro-app est une application de consultation en neuronutrition en production.

Le déploiement Google Apps Script (GAS) historique a été décommissionné le 2026-07-03 (web app + déclencheurs arrêtés) ; le code est archivé dans `archive/gas-legacy/` à titre de référence et n'est plus exécuté.

**Décommission Google Sheets terminée (2026-07-07)** : la dépendance à l'API Google Sheets a été entièrement retirée du runtime. Le scope OAuth se limite désormais à `openid email profile`, la route `migrate-historique` a été supprimée, et toutes les routes praticien (`metrics`, `patients`, `assignations`, `questionnaires`, `reponses`, `packs`…) lisent/écrivent exclusivement PostgreSQL via Prisma. `SHEET_ID` n'est plus une variable d'environnement requise. Le code GAS reste archivé dans `archive/gas-legacy/` (référence seule) — voir `docs/claude/PROJET_CONTEXTE.md`.

Priorité absolue : stabilité de l'application en production, pas de nouvelle migration technologique sans demande explicite.

## Règles non négociables

- **Jamais de secret en dur** : clés API, tokens, mots de passe. Utiliser les variables d'environnement (`web/.env.local` en dev, variables Vercel en production — jamais committés).
- **UI en français** : tout texte visible par l'utilisateur (labels, messages d'erreur, placeholders) est en français.
- **Changements minimaux** : ne pas refactorer au-delà de ce qui est demandé. Pas de renommage, réorganisation de fichiers ou changement de style de code non sollicité.
- **Pas de migration Prisma sans demande explicite** : ne jamais lancer `prisma migrate dev`, `prisma db push`, ou modifier `schema.prisma` sans confirmation explicite dans la conversation.
- **Pas de SQL destructif** sans confirmation explicite (DROP, DELETE sans WHERE, TRUNCATE).
- **Pas de modification de la logique clinique ou des seuils** sans demande explicite et documentation dans `CHANGELOG.md`.
- **La base de production ne se modifie que par une migration relue** : migration committée → PR relue → merge sur `main` → `web/scripts/vercel-build.sh`. Aucun autre chemin.

## Lire la base de production

Utiliser l'outil MCP Supabase `execute_sql` — jamais `psql`, ni une commande
Bash. Un hook (`.claude/hooks/guard-supabase-mcp.mjs`) y autorise les lectures
sans interruption et refuse toute écriture ou DDL ; les outils MCP mutants
(`apply_migration`, `*_branch`, `pause_project`…) sont refusés par
`.claude/settings.json`. Vérifier une migration déployée coûte donc une requête
et rien d'autre :

**Un nom de migration porte plusieurs lignes.** Un échec suivi d'un
`migrate resolve --applied` laisse la ligne annulée en place et en ajoute une
seconde (`applied_steps_count = 0`). Lire une ligne isolée fait donc conclure à
tort qu'une migration manque — c'est arrivé le 2026-07-20 sur
`r8_lite_consent_fields`, jugée non appliquée alors que ses colonnes existaient.
Toujours agréger par nom :

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

## Garde-fous d'écriture

Les hooks rendent trois verdicts, plus un mur unique :

- **refus** — `.env*`, `.git/`, `node_modules/` ; commandes destructives ou
  exposant des secrets. Sans dérogation pour les fichiers. Le scan porte sur la
  commande brute, littéraux compris : `bash -c "rm -rf /"` est attrapé, et
  `echo 'DROP TABLE'` l'est aussi — faux positif assumé. Seule exception, le
  corps d'un heredoc est traité comme de la donnée lorsque **la structure de la
  commande** — tout sauf les corps de heredoc — ne contient aucun interpréteur.
  `cat >> journal.md <<'FIN'` écrit du texte ; `cat <<'FIN' | bash` reste
  attrapé, le `| bash` étant sur la ligne d'ouverture. Ce que le corps *raconte*
  n'entre pas dans la décision : un journal citant `npm run check` reste du
  texte. Banc de test : `node --test .claude/hooks/block-risky-commands.test.mjs`.
- **demande** — `schema.prisma`, `prisma/migrations/`, `supabase/migrations/` ;
  `prisma migrate`, `supabase db push`, push forcé. Autorisation en un clic,
  dans la session : c'est elle qui matérialise la « confirmation explicite »
  exigée plus haut.
- **silence** — tout le reste.

Il n'existe plus de variable d'environnement désactivant la protection des
fichiers : `WN_ALLOW_PROTECTED_WRITE` neutralisait le hook pour la session
entière et non pour la migration qui l'avait motivée.

## Données patients

- Seuls ces patients fictifs peuvent apparaître dans le code, les seeds, les tests ou les données de démo : **Sophie Nicola, Jennifer Martin, Michel Dogné**.
- Ne jamais générer, dériver ou "compléter" des données patient réelles, même si elles apparaissent dans un fichier ouvert ou un log collé par erreur dans la conversation.

## Fichiers cœur à connaître

- Application Next.js : `web/src/app/` (routes `dashboard/*` praticien, `patient/[idAssignation]` portail patient, `api/*` routes serveur)
- Schéma base de données : `web/prisma/schema.prisma`
- Catalogue questionnaires et scoring : `web/src/lib/questions.ts`
- Auth praticien (NextAuth, Google OAuth) : `web/src/lib/auth.ts`
- Client Prisma : `web/src/lib/prisma.ts`
- Code GAS legacy (référence uniquement, non maintenu) : `archive/gas-legacy/`

## Documentation de référence

- Vue d'ensemble : `docs/claude/README.md`
- Contexte projet et état actuel : `docs/claude/PROJET_CONTEXTE.md`
- Règles de sécurité et clinique : `docs/claude/REGLES_CRITIQUES.md`
- Workflow de dev : `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts : `docs/claude/TEMPLATES_PROMPTS.md`
- Runbook incident Vercel/DNS : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
- Rôles des machines et des sessions (worktrees, garde-fous de test) : `docs/ROLES_MACHINES.md`
- Roadmap technique (consolidation R0→R10) : `docs/ROADMAP_TECHNIQUE.md`
- Roadmap produit (séries D/R/E, priorités) : `docs/ROADMAP_PRODUIT.md`

## Commandes utiles

```bash
cd web && npm run dev              # serveur local
cd web && npx prisma studio        # inspection DB en lecture seule (ne pas laisser ouvert en prod)
cd web && npx prisma generate      # régénérer le client après modif du schéma
cd web && npm run check            # T1 : type-check + Vitest + anti-secrets indexés (~10 s)
cd web && npm test                 # tests unitaires Vitest (n'inclut PAS les E2E)
cd web && npm run test:e2e         # parcours E2E Playwright seuls (démarre next dev)
cd web && npm run test:worktree    # réplique locale du job CI verify, E2E inclus
bash scripts/check_no_secrets.sh          # anti-secrets, dépôt entier
bash scripts/check_no_secrets.sh --staged # anti-secrets, lignes indexées seules
```

### Trois paliers de validation

| Palier | Commande | Durée | Quand |
|---|---|---|---|
| T1 | `npm run check` | ~10 s | après chaque édition |
| T2 | `npm run test:worktree -- --fast` | ~1 min 20 | avant tout commit UI ou API |
| T3 | `npm run test:worktree` | ~5 min | avant une PR portant migration, scoring ou clinique |

Ne jamais relancer une suite pour en relire la sortie : rediriger une fois vers
un fichier (`--reporter=dot`), puis relire ce fichier.

`test:worktree` provisionne un PostgreSQL éphémère et exporte son propre
`NEXTAUTH_SECRET` de test : aucun secret ni base à préparer. Linux et macOS pris
en charge (PostgreSQL via `apt-get` ou Homebrew — `brew install postgresql@15`,
la version du CI). La séquence rapide (`-- --fast`) tourne en ~1 min 20 s et
exécute les 34 tests E2E. Prérequis et options : `web/e2e/README.md`.

**Les E2E sont l'exclusivité du Mac.** `npm run test:e2e` réinitialise le patient
fictif `PAT_SEED_03` dans la base pointée par `DATABASE_URL`, partagée entre les
postes : deux runs simultanés s'effacent mutuellement leurs fixtures et
produisent des échecs erratiques. Ne jamais le lancer depuis le PC, ni deux runs
E2E en parallèle. Répartition des rôles : `docs/ROLES_MACHINES.md`.

## Avant de committer

- Vérifier qu'aucun secret n'a été introduit (`bash scripts/check_no_secrets.sh`).
- Vérifier que les textes UI ajoutés sont en français.
- Ne pas committer de fichier `.env*`.
- Pas de régression visible dans le parcours praticien ou patient. Sur un
  changement d'UI, le vérifier en rejouant les E2E (`npm run test:worktree`,
  `-- --fast` pour une passe courte) : **une suite Vitest verte ne prouve rien
  sur les parcours**, elle n'exécute pas Playwright.
- Avant d'annoncer qu'une PR est prête à merger, lire son CI (`gh pr checks`) :
  les E2E n'y sont pas couverts par `npm test`.

## Définition de done pour une tâche standard

- Changement limité au périmètre demandé.
- Pas de secret ni donnée sensible introduits.
- Documentation mise à jour si nécessaire.

## Début de session

Si `docs/claude/SESSION_LOG.md` existe, lire sa dernière entrée avant de répondre à la première question de la session, sans qu'on ait besoin de le demander. Ne pas résumer ce contenu à voix haute sauf si c'est demandé — l'utiliser silencieusement comme contexte de reprise.

**Une session = un worktree.** Avant d'écrire quoi que ce soit dans le dépôt, ouvrir son propre worktree (outil `EnterWorktree`, ou `git worktree add`). Plusieurs sessions peuvent travailler en parallèle, jamais dans la même copie : le 2026-07-20, deux sessions partageant le checkout principal ont produit une PR à deux périmètres et un commit atterri sur la branche d'une autre session. Ne jamais faire `git checkout` / `git switch` dans un worktree qu'une autre session utilise. `npm run test:worktree` est déjà conçu pour ce mode (ports et base éphémère dérivés du chemin du worktree). Détail : `docs/ROLES_MACHINES.md`.

## Fin de session

Sur demande d'un "résumé de session" : produire un résumé (<150 mots) — décisions prises, options écartées et pourquoi, prochaine action prioritaire, questions ouvertes — puis l'ajouter directement (append, jamais d'écrasement) à la fin de `docs/claude/SESSION_LOG.md`, précédé d'un titre `## [date] — [sujet]`. Créer le fichier s'il n'existe pas. Ne pas demander de confirmation pour cet ajout : fichier de log interne au projet, sans donnée sensible.
