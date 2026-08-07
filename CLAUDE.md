# CLAUDE.md — Wellneuro NNPP2

Contexte pour Claude Code sur ce dépôt. Lu automatiquement à chaque session.

## Stack

- Next.js 14 (App Router)
- Prisma + PostgreSQL (Supabase)
- NextAuth — OAuth Google restreint au domaine `@wellneuro.fr`
- Déploiement Vercel (`app.wellneuro.fr`)

## Contexte projet

Wellneuro-app est une application de consultation en neuronutrition en production.

**Google Apps Script et Google Sheets sont décommissionnés** (GAS le 2026-07-03, Sheets le 2026-07-07) : plus aucune dépendance runtime, scope OAuth réduit à `openid email profile`, `SHEET_ID` n'est plus requis, tout passe par PostgreSQL via Prisma. Code GAS archivé dans `archive/gas-legacy/` (référence seule). Détail : `docs/claude/PROJET_CONTEXTE.md`.

Priorité absolue : stabilité de l'application en production, pas de nouvelle migration technologique sans demande explicite.

## Règles non négociables

- **Jamais de secret en dur** : clés API, tokens, mots de passe. Utiliser les variables d'environnement (`web/.env.local` en dev, variables Vercel en production — jamais committés).
- **UI en français** : tout texte visible par l'utilisateur (labels, messages d'erreur, placeholders) est en français.
- **Changements minimaux** : ne pas refactorer au-delà de ce qui est demandé. Pas de renommage, réorganisation de fichiers ou changement de style de code non sollicité.
- **Pas de migration Prisma sans demande explicite** : ne jamais lancer `prisma migrate dev`, `prisma db push`, ou modifier `schema.prisma` sans confirmation explicite dans la conversation.
- **Pas de SQL destructif** sans confirmation explicite (DROP, DELETE sans WHERE, TRUNCATE).
- **Pas de modification de la logique clinique ou des seuils** sans demande explicite et documentation dans `CHANGELOG.md`.
- **La base de production ne se modifie que par une migration relue** : migration committée → PR relue → merge sur `main` → application **hors du build** via le workflow GitHub Actions `release-db`, **proposé automatiquement** dès qu'une migration atterrit sur `main` et gaté par l'environnement protégé `release-db`. L'automatisation porte sur le *déclenchement*, jamais sur l'*approbation* : le run attend un relecteur requis. **Le build Vercel n'écrit plus en base.** Aucun autre chemin. Voir `docs/DEPLOIEMENT_RELEASE_DB.md`.
- **Une migration et le code qui en dépend ne voyagent pas dans la même PR** — ou alors ce code part derrière un drapeau éteint. L'ordre attendu est « migration d'abord, code ensuite », mais le merge qui pose la migration sur `main` **déclenche aussi le déploiement Vercel** : dans une PR unique, le code dépendant est en production avant que la release ait pu être approuvée. C'est arrivé le 2026-08-05 (#574, page « Mon bilan » sans drapeau).

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

- Application Next.js : `web/src/app/` (routes `dashboard/*` praticien, `portail/[token]` portail patient courant, `patient/[idAssignation]` flux legacy conservé, `api/*` routes serveur)
- Schéma base de données : `web/prisma/schema.prisma`
- Catalogue questionnaires et scoring : `web/src/lib/questions.ts`
- Auth praticien (NextAuth, Google OAuth) : `web/src/lib/auth.ts`
- Client Prisma : `web/src/lib/prisma.ts`
- Code GAS legacy (référence uniquement, non maintenu) : `archive/gas-legacy/`

## Documentation de référence

- Vue d'ensemble : `docs/claude/README.md`
- Handoffs de lot (un fragment daté par lot, jamais de fichier partagé) : `docs/claude/handoffs/README.md`
- Contexte projet et état actuel : `docs/claude/PROJET_CONTEXTE.md`
- Règles de sécurité et clinique : `docs/claude/REGLES_CRITIQUES.md`
- Workflow de dev : `docs/claude/WORKFLOW_DEVELOPPEMENT.md`
- Templates de prompts : `docs/claude/TEMPLATES_PROMPTS.md`
- Runbook incident Vercel/DNS : `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
- Rôles des machines et des sessions (worktrees, garde-fous de test) : `docs/ROLES_MACHINES.md`
- Architecture technique système : `docs/ROADMAP_TECHNIQUE.md`
- Historique des chantiers techniques (lots R0→R10) : `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md`
- Roadmap produit (séries D/R/E, priorités) : `docs/ROADMAP_PRODUIT.md`

Aucune des trois n'est dépréciée : périmètres disjoints, frontière écrite en
tête de chacune. **Le préfixe `R` désigne trois séries sans rapport** —
technique (R6 = stabilisation build/tests, historique dans
`HISTORIQUE_CHANTIERS_TECHNIQUES.md`), produit (R6 = workflow RDV) et réserves
d'audit (R6 = double source roadmap). Toujours qualifier la série ; un `R6` nu
est ambigu.

## Économie de contexte — le poste de dépense réel

Mesuré le 2026-08-01 : **chaque requête relit ~202 000 tokens de contexte pour
produire ~600 tokens de réponse**, dont 0,03 % de texte neuf (détail de la
mesure : `changelog.d/2026-08-01-economie-de-contexte-mesuree.md`).

D'où la seule règle qui compte : **un token entré dans le contexte est repayé à
chaque tour suivant** (~37 tours par session). Un fichier de 50 000 tokens lu au
tour 3 coûte 34 relectures, pas une lecture.

Trois gestes, par rendement décroissant :

1. **Ne pas faire entrer le volume.** `Grep`/`Glob` pour localiser *avant* de
   lire ; `Read` avec `offset`/`limit` sur un gros fichier ; rediriger une sortie
   volumineuse vers un fichier et n'en lire que la partie utile.
2. **Déléguer l'investigation volumineuse à un sous-agent.** Son contexte est
   jeté à la fin : rien de ce qu'il a lu n'est jamais repayé. Mesuré — un appel
   `wn-explorer` (44 k de contexte) coûte **28 fois moins** qu'un appel Opus
   (224 k). C'est le contexte isolé qui paie, pas le tarif du modèle.
3. **`/clear` entre deux sujets sans rapport.** Une session longue repaie son
   début à chaque tour.

**Ce qui ne paie pas :** raccourcir les réponses (la sortie est 8,5 % du coût),
et router les lectures vers un modèle bon marché sans les isoler (la lecture pure
est 3,5 %). Écrire court reste utile pour la lisibilité — pas pour la dépense.

**La délégation est déjà là, sous deux formes — ne pas la réinventer.** `/wn-plan`,
`/wn-debug` et `/wn-review` portent `context: fork` dans leur frontmatter : ils <!-- mention-seule: wn-plan, wn-debug, wn-review -->
s'exécutent en contexte isolé, leur lecture n'est jamais repayée par la session.
`/wn-lot`, qui ne forke pas, prescrit à la place des appels `Agent(...)` <!-- mention-seule: wn-lot -->
explicites avec modèle épinglé. Ajouter une étape de délégation dans un skill qui
forke déjà n'économise rien et ajoute un saut.

## Parcours type d'une tâche

| Étape | Geste | Qui |
|---|---|---|
| 1. Situer | localiser les fichiers, vérifier les hypothèses contre le dépôt | **sous-agent** (`wn-explorer`) dès que ça dépasse deux ou trois fichiers |
| 2. Cadrer | périmètre, risques, palier de test, gardes applicables | session (`/wn-plan`, ou `/wn-lot` sur un lot de campagne) |
| 3. Écrire | mode Plan, puis édition bornée au périmètre | session |
| 4. Valider | palier T1/T2/T3, sortie redirigée puis relue | session |
| 5. Revoir | diff, sécurité, clinique | `/wn-review` ; sous-agent `wn-reviewer` si migration/auth |
| 6. Clore | statut, journal, promotions, fragment `docs/claude/handoffs/` | `/wn-finish` puis `/wn-handoff write` |
| 7. Livrer | PR, CI, merge | `/wn-pr` puis `/wn-merge` |

L'étape 1 est celle qui décide du coût de toutes les autres : ce qu'elle fait
entrer dans le contexte est relu jusqu'à la fin de la session.

## Commandes utiles

```bash
cd web && npm run dev              # serveur local
cd web && npx prisma studio        # inspection DB en lecture seule (ne pas laisser ouvert en prod)
cd web && npx prisma generate      # régénérer le client après modif du schéma
cd web && npm run check            # T1 : type-check + lint + Vitest + anti-secrets indexés (~15 s)
cd web && npm test                 # tests unitaires Vitest (n'inclut PAS les E2E)
cd web && npm run test:e2e         # parcours E2E Playwright seuls (démarre next dev)
cd web && npm run test:worktree    # réplique locale du job CI verify, E2E inclus
bash scripts/check_no_secrets.sh          # anti-secrets, dépôt entier
bash scripts/check_no_secrets.sh --staged # anti-secrets, lignes indexées seules
node scripts/wn-cycle.mjs                 # phase du cycle de lot et geste suivant
node scripts/wn-cycle.mjs --appliquer     # + resynchronise ACTIVE_CAMPAIGN.md et .wn/state.json
```

### Trois paliers de validation

| Palier | Commande | Durée | Quand |
|---|---|---|---|
| T1 | `npm run check` | ~15 s | après chaque édition |
| T2 | `npm run test:worktree -- --fast` | ~1 min 20 | avant tout commit UI ou API |
| T3 | `npm run test:worktree` | ~5 min | avant une PR portant migration, scoring ou clinique |

**Le lint est dans les trois paliers depuis le 2026-07-21** (LOT-01b) : un palier
qui ne couvre pas ce que le CI vérifie ne protège de rien.

**Une seule passe Vitest est complète, et c'est celle de la production** — la
suite entière tourne sous `WN_ALI_01_SIIN57=true` (`test:siin57`), le drapeau
étant allumé sur les trois environnements. La position éteinte (`test:court14`)
est réduite aux 18 specs dont le verdict dépend du drapeau, liste gardée par
`scripts/specs-drapeau-ali01.test.mjs`. « T3 vert aux deux positions du drapeau »
reste vrai ; « la suite entière deux fois », non.

**T1 ne joue plus de suite complète du tout** : liste restreinte et specs du diff
(`test:changed`). La passe entière est à partir de T2 — `test:worktree`, `--fast`
compris. C'est T2 qu'il faut lancer avant de conclure qu'une suite est verte.

Ne jamais relancer une suite pour en relire la sortie : rediriger une fois vers
un fichier (`--reporter=dot`), puis relire ce fichier.

`test:worktree` provisionne un PostgreSQL éphémère et exporte son propre
`NEXTAUTH_SECRET` de test : aucun secret ni base à préparer. Linux et macOS pris
en charge (PostgreSQL via `apt-get` ou Homebrew — `brew install postgresql@15`,
la version du CI). La séquence rapide (`-- --fast`) tourne en ~1 min 20 s et
exécute les 26 tests E2E source (2 projets Chromium/iPhone 13, soit jusqu'à
52 exécutions). Prérequis et options : `web/e2e/README.md`.

**Les E2E sont l'exclusivité du Mac.** `npm run test:e2e` réinitialise le patient
fictif `PAT_SEED_03` dans la base partagée : deux runs simultanés s'effacent
leurs fixtures. Jamais depuis le PC, jamais deux runs en parallèle. Rôles :
`docs/ROLES_MACHINES.md`.

## Avant de committer

- Vérifier qu'aucun secret n'a été introduit (`bash scripts/check_no_secrets.sh`).
- Vérifier que les textes UI ajoutés sont en français.
- Ne pas committer de fichier `.env*`.
- Pas de régression visible dans le parcours praticien ou patient. Sur un
  changement d'UI, le vérifier en rejouant les E2E (`npm run test:worktree`,
  `-- --fast` pour une passe courte) : **une suite Vitest verte ne prouve rien
  sur les parcours**, elle n'exécute pas Playwright.
- **Handoff par fragments, comme le changelog.** `/wn-handoff write` pose <!-- mention-seule: wn-handoff -->
  `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug.md` ; le handoff courant est le
  dernier au tri. Un créneau unique que deux branches réécrivent entre en conflit
  à tous les coups (trois handoffs perdus le 2026-08-04). Convention :
  `docs/claude/handoffs/README.md`.
- **La clôture passe avant la PR, pas après le merge.** `/wn-finish` puis <!-- mention-seule: wn-finish, wn-handoff -->
  `/wn-handoff write` s'écrivent sur la branche vivante et partent dans la PR du
  lot. Le merge étant un squash, ce qui s'écrit ensuite n'est plus dans
  l'ascendance de `main` et coûte une seconde PR de doc (PR #547 et #548, le
  2026-08-03). En cas de doute sur la phase : `node scripts/wn-cycle.mjs`, qui
  sort en échec quand la fenêtre est fermée. Une fois fermée, écrire depuis
  `main`, **jamais** en rebranchant sur la branche squashée.
- Ouvrir la PR avec un corps via `--body-file` et un diff d'une seule finalité,
  puis **attendre son CI sans le sonder en boucle** (idiome ci-dessous) ; avant
  d'annoncer une PR prête à merger, en **lire** le résultat — les E2E n'y sont pas
  couverts par `npm test`.
- **Changelog par fragments.** Ne pas éditer le haut de `CHANGELOG.md` : poser un
  fichier `changelog.d/AAAA-MM-JJ-slug.md` (le bloc `###` qui irait sous
  `## Non publié`). Deux PR n'entrent alors plus en conflit sur le même fichier
  (cinq merges cassés le 2026-07-21). Détail : `changelog.d/README.md`.

### Attendre le CI d'une PR, revue et merge — le détail est sorti d'ici

```bash
node scripts/wn-attendre-ci.mjs <N>     # un seul appel bloquant, en tâche de fond
```

Jamais de `gh pr checks` en boucle. **`0` est le seul code de sortie qui autorise
à annoncer une PR prête** ; les cinq autres disent, chacun à sa façon, qu'on ne
peut pas l'affirmer. `verify` est un check **obligatoire** et `enforce_admins`
est actif : une PR gelée bloque le merge au lieu de ressembler à un succès — ne
jamais forcer.

**La revue, le merge et la suppression des branches appartiennent à Copilot**
(décision du 2026-07-21), sauf autorisation transitoire en cours. Sur une PR de
migration ou d'authentification, une revue adversariale `wn-reviewer` avant et
une vérification de la base de production après sont dues dans tous les cas.

**Tout le détail — table des six codes de sortie, effet de bord `action_required`,
`strict` désactivé, idiome de merge de la période transitoire, exception
migration/auth — est dans [`docs/claude/REGLES_PR_MERGE.md`](docs/claude/REGLES_PR_MERGE.md)**,
que `/wn-merge` charge en entier. Ces règles ne servent qu'au moment de merger ; <!-- mention-seule: wn-merge -->
les garder ici les faisait payer à chaque requête de chaque session.

## Définition de done pour une tâche standard

- Changement limité au périmètre demandé.
- Pas de secret ni donnée sensible introduits.
- Documentation mise à jour si nécessaire.

## Début de session

Si `docs/claude/SESSION_LOG.md` existe, lire sa dernière entrée avant de répondre à la première question de la session, sans qu'on ait besoin de le demander. Ne pas résumer ce contenu à voix haute sauf si c'est demandé — l'utiliser silencieusement comme contexte de reprise.

Avant de répondre à la toute première demande de la session — démarrage ou juste après `/clear` —, invoquer silencieusement le skill `wn-route` sur cette demande. Il combine en une passe la route (`/wn`), le modèle (`/wn-model`) et le mode d'exécution (`/wn-ultra`). Ne l'afficher que s'il dévie du défaut (règle d'économie du skill) ; une fois par session, pas à chaque message.

**Une session = un worktree.** Avant d'écrire quoi que ce soit dans le dépôt, ouvrir son propre worktree (outil `EnterWorktree`, ou `git worktree add`). Plusieurs sessions peuvent travailler en parallèle, jamais dans la même copie — un checkout partagé a produit le 2026-07-20 une PR à deux périmètres et un commit sur la branche d'une autre session. Ne jamais faire `git checkout` / `git switch` dans un worktree qu'une autre session utilise. `npm run test:worktree` est conçu pour ce mode. Détail : `docs/ROLES_MACHINES.md`.

**Se baser sur `origin/main` fraîchement fetché, jamais sur le `main` local.** Le
`main` local traîne derrière `origin` dès que les merges passent par GitHub, et un
pointage pris sur lui est faux (constaté à ahead 50 / behind 51 le 2026-08-07).
`node scripts/wn-cycle.mjs` fait désormais ce fetch lui-même — tolérant au
hors-ligne, il le signale au lieu d'échouer — et affiche l'écart ahead/behind.
`git fetch` seulement : jamais de `pull`, `merge` ou `rebase` automatique, un
`main` divergent se réconcilie par arbitrage humain. (Règle locale, sans rapport
avec `strict`, délibérément désactivé sur la protection de branche.)

## Fin de session

Sur demande d'un "résumé de session" : produire un résumé (<150 mots) — décisions prises, options écartées et pourquoi, prochaine action prioritaire, questions ouvertes — puis l'ajouter directement (append, jamais d'écrasement) à la fin de `docs/claude/SESSION_LOG.md`, précédé d'un titre `## [date] — [sujet]`. Créer le fichier s'il n'existe pas. Ne pas demander de confirmation pour cet ajout : fichier de log interne au projet, sans donnée sensible.
