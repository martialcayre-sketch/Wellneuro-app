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

- Application Next.js : `web/src/app/` (routes `dashboard/*` praticien, `patient/[idAssignation]` portail patient, `api/*` routes serveur)
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

Mesuré le 2026-08-01 sur 13 jours et 35 194 appels : **chaque requête relit
~202 000 tokens de contexte pour produire ~600 tokens de réponse.** 93 % de la
consommation est côté entrée, dont **0,03 % de texte neuf** — tout le reste est
du contexte déjà lu, relu à chaque tour.

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

**Le lint est dans les trois paliers depuis le 2026-07-21.** Il n'y était pas :
le CI le lançait, `npm run check` non, et une PR verte en local cassait en CI
(LOT-01b). Un palier qui ne couvre pas ce que le CI vérifie ne protège de rien.

Ne jamais relancer une suite pour en relire la sortie : rediriger une fois vers
un fichier (`--reporter=dot`), puis relire ce fichier.

`test:worktree` provisionne un PostgreSQL éphémère et exporte son propre
`NEXTAUTH_SECRET` de test : aucun secret ni base à préparer. Linux et macOS pris
en charge (PostgreSQL via `apt-get` ou Homebrew — `brew install postgresql@15`,
la version du CI). La séquence rapide (`-- --fast`) tourne en ~1 min 20 s et
exécute les 26 tests E2E source (2 projets Chromium/iPhone 13, soit jusqu'à
52 exécutions). Prérequis et options : `web/e2e/README.md`.

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
- **Handoff par fragments, comme le changelog.** Ne pas réécrire un fichier de
  reprise partagé : `/wn-handoff write` pose
  `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug.md`, et le handoff courant est le
  dernier au tri. Même motif que `changelog.d/` — un créneau unique que deux
  branches réécrivent entre en conflit à tous les coups, et le 2026-08-04 en a
  perdu trois. Convention : `docs/claude/handoffs/README.md`.
- **La clôture passe avant la PR, pas après le merge.** `/wn-finish` puis
  `/wn-handoff write` s'écrivent sur la branche vivante, et partent dans la PR du
  lot. Le merge est un squash (`--squash --delete-branch`) : ce qui s'écrit
  ensuite n'est plus dans l'ascendance de `main` et coûte une seconde PR de doc —
  c'est ce qui a produit les PR #547 et #548 le 2026-08-03, après #545. En cas de
  doute sur la phase, `node scripts/wn-cycle.mjs` ; il sort en échec quand la
  fenêtre est déjà fermée. Une fois fermée, écrire depuis `main`, **jamais** en
  rebranchant sur la branche squashée.
- Ouvrir la PR avec un corps via `--body-file` et un diff d'une seule finalité,
  puis **attendre son CI sans le sonder en boucle** (idiome ci-dessous) ; avant
  d'annoncer une PR prête à merger, en **lire** le résultat — les E2E n'y sont pas
  couverts par `npm test`.
- **Changelog par fragments.** Ne pas éditer le haut de `CHANGELOG.md` : poser un
  fichier `changelog.d/AAAA-MM-JJ-slug.md` (le bloc `###` qui irait sous
  `## Non publié`). Deux PR n'entrent alors plus en conflit sur le même fichier —
  c'est ce qui a fait échouer cinq merges le 2026-07-21. Repli : `node
  scripts/changelog-collate.mjs`. Détail : `changelog.d/README.md`.

### Attendre le CI d'une PR — un script, plus un idiome

```bash
node scripts/wn-attendre-ci.mjs <N>     # un seul appel bloquant, en tâche de fond
```

Un seul appel bloquant remplace le sondage répété (le 2026-07-20, une session a
produit 81 appels de `gh pr checks` pour l'information que cet appel rend en un
seul). Mais la boucle `until … bucket=="pending"` qui tenait ce rôle jusqu'au
2026-08-03 **ne distinguait pas « aucun check en attente » de « aucun check du
tout »** : elle rendait la main sur deux checks Vercel verts quand `verify`
n'avait jamais été créé. C'est arrivé sur la PR #550, et le correctif a dû être
refait à la main sur #553. Une règle oubliée deux fois devient exécutable.

| Code | Sens | Geste |
|---|---|---|
| `0` | les checks **obligatoires** ont tourné et sont verts | annoncer la PR prête |
| `1` | un check obligatoire a échoué | lire le log, corriger |
| `2` | un check obligatoire **n'a pas tourné** — absent, ou gelé en `action_required` | le script nomme **toutes** les causes applicables ; ne pas merger |
| `3` | délai dépassé sans conclusion | expirer n'est pas réussir |
| `4` | **indéterminé** — PR illisible ou mergée, `gh` muet, ou liste des checks obligatoires illisible | aucun verdict ; ne pas merger |
| `5` | les checks sont verts mais la PR est **en conflit** | ce vert porte sur un commit qui n'est pas le résultat fusionné |

**`0` est le seul code qui autorise à annoncer une PR prête.** Les cinq autres
disent, chacun à sa façon, qu'on ne peut pas l'affirmer — y compris `4`, qui
couvre le cas où la liste des checks obligatoires n'a pas pu être lue : ne
sachant plus ce qu'il fallait attendre, le script se tait plutôt que de replier
en silence sur `verify`.

La liste des checks attendus vient de la **protection de branche** (`verify`
aujourd'hui), pas d'une constante : un second check rendu obligatoire est suivi
sans toucher au script. Ce qu'il ne fait pas : merger, ou dire s'il faut merger.
Un même nom porté par **deux runs** (le cas des branches `campaign/**`, que
`ci.yml` déclenche sur `push` *et* sur `pull_request`) n'est vert que si les
deux le sont — le rouge ne se laisse pas écraser par l'ordre du tableau.

Gabarit de corps de PR et check-list complète : le skill `/wn-pr` (invocation
manuelle ; ces idiomes valent pour **toute** ouverture de PR, `/wn-pr` invoqué ou non).

## Revue, merge et suppression des branches — le ressort de Copilot

**Décision du 2026-07-21.** La revue de code, le merge des PR et la suppression
des branches appartiennent à **Copilot**. L'assistant ouvre la PR, vérifie que le
CI est vert, annonce l'état — et s'arrête là.

Deux raisons, données ensemble : un **regard différent** sur le code (une revue
par l'agent qui vient de l'écrire est une relecture, pas une revue), et le **coût
en tokens** — suivre un CI, relancer, merger puis nettoyer consomme des
allers-retours pour un travail qu'un autre outil fait sans eux.

En pratique : pas de `gh pr merge`, pas de `git push origin --delete`, pas de
suppression de worktree rattaché à une PR ouverte. Le nettoyage post-merge n'est
pas une tâche en attente côté assistant.

**Effet de bord à connaître.** Quand le commit de tête d'une PR est attribué au
bot Copilot (un merge de `main` résolu par lui, par exemple), GitHub met le run
`pull_request` en `action_required` et **n'exécute rien** sans approbation
humaine. `gh pr checks` n'affiche alors que les checks Vercel, **sans `verify`** :
la PR paraît verte alors que la vérification n'a jamais tourné. Vérifier la
présence de `verify`, et débloquer en poussant un commit sous le compte du dépôt
— `POST /actions/runs/{id}/approve` ne s'applique qu'aux PR issues de forks.

Une PR gelée ne peut pas être mergée pour autant : `verify` est un **check
obligatoire** de la protection de `main`, et `enforce_admins` est actif depuis le
2026-07-21 — **personne ne passe outre, propriétaire compris**. Un run gelé
bloque donc le merge au lieu de ressembler à un succès. Pour un correctif
d'urgence, il faut désactiver le réglage explicitement avant de merger
(`gh api -X DELETE repos/<dépôt>/branches/main/protection/enforce_admins`), puis
le remettre. Ce geste doit rester visible et rare.

`strict` reste **désactivé** délibérément : une PR peut être mergée sans avoir
été remise à jour sur `main`. Peu de PR tournent en parallèle ici, et l'activer
imposerait une resynchronisation et un nouveau CI à chaque merge concurrent —
friction quotidienne pour un incident rare.

### Période transitoire — cycle PR complet côté assistant (idiome de merge)

Tant qu'une autorisation en cours confie le suivi du CI, le merge et le nettoyage
à l'assistant (retour au ressort Copilot ci-dessus prévu à l'échéance), cet idiome
**prime sur le « pas de `gh pr merge` » plus haut**. Une fois le CI vert lu (idiome
d'attente dans « Avant de committer »), enchaîner en un minimum d'allers-retours :

1. **Vérifier que `verify` a réellement tourné**, pas seulement les checks Vercel
   (effet de bord `action_required` décrit plus haut) ; sans `verify`, ne pas merger.
2. `gh pr merge <N> --squash --delete-branch` — merge et suppression de la branche
   distante en un geste.
3. Supprimer le worktree rattaché une fois la PR fermée (`ExitWorktree`, ou
   `git worktree remove`).
4. **Repartir de `main` pour le lot suivant**, jamais de la branche squashée :
   sinon la PR suivante ré-embarque le lot précédent, la fusion conflictue et
   GitHub ne crée aucun run.

`enforce_admins` reste actif et `verify` obligatoire (plus haut) : une PR gelée
bloque le merge au lieu de ressembler à un succès — ne jamais forcer. Sur une PR
de migration ou d'authentification, appliquer d'abord l'exception ci-dessous.

### L'exception : migration ou authentification

Copilot revoit et merge **aussi** ces PR. Mais avant de lui passer la main, sur
une PR qui porte une migration ou touche l'authentification :

1. **Une passe de revue adversariale indépendante** (sous-agent `wn-reviewer`).
   C'est elle qui a trouvé, le 2026-07-21 sur la PR #202, un backfill manquant
   dont l'absence défaisait silencieusement une révocation d'accès. Il n'y avait
   aucune ligne fautive à pointer : le défaut était ce que la migration **ne
   faisait pas**. Une revue de diff ne voit pas cette classe-là.
2. **Après le merge, vérifier la base de production** — la migration s'est-elle
   appliquée, et le backfill a-t-il fait ce qu'il annonçait ? Une lecture
   `execute_sql` suffit (voir « Lire la base de production » plus haut). Sans
   cela, un `migrate deploy` ou un import qui a échoué à mi-course lors de la
   release (`release-db`) ne se voit nulle part ailleurs.

Le coût de ces deux gestes se compte en minutes ; celui d'un raté sur
l'authentification ou une migration se compte en accès patients rompus.

## Définition de done pour une tâche standard

- Changement limité au périmètre demandé.
- Pas de secret ni donnée sensible introduits.
- Documentation mise à jour si nécessaire.

## Début de session

Si `docs/claude/SESSION_LOG.md` existe, lire sa dernière entrée avant de répondre à la première question de la session, sans qu'on ait besoin de le demander. Ne pas résumer ce contenu à voix haute sauf si c'est demandé — l'utiliser silencieusement comme contexte de reprise.

Avant de répondre à la toute première demande de la session — démarrage ou juste après `/clear` —, invoquer silencieusement le skill `wn-route` sur cette demande. Il combine en une passe la route (`/wn`), le modèle (`/wn-model`) et le mode d'exécution (`/wn-ultra`). Ne l'afficher que s'il dévie du défaut (règle d'économie du skill) ; une fois par session, pas à chaque message.

**Une session = un worktree.** Avant d'écrire quoi que ce soit dans le dépôt, ouvrir son propre worktree (outil `EnterWorktree`, ou `git worktree add`). Plusieurs sessions peuvent travailler en parallèle, jamais dans la même copie : le 2026-07-20, deux sessions partageant le checkout principal ont produit une PR à deux périmètres et un commit atterri sur la branche d'une autre session. Ne jamais faire `git checkout` / `git switch` dans un worktree qu'une autre session utilise. `npm run test:worktree` est déjà conçu pour ce mode (ports et base éphémère dérivés du chemin du worktree). Détail : `docs/ROLES_MACHINES.md`.

## Fin de session

Sur demande d'un "résumé de session" : produire un résumé (<150 mots) — décisions prises, options écartées et pourquoi, prochaine action prioritaire, questions ouvertes — puis l'ajouter directement (append, jamais d'écrasement) à la fin de `docs/claude/SESSION_LOG.md`, précédé d'un titre `## [date] — [sujet]`. Créer le fichier s'il n'existe pas. Ne pas demander de confirmation pour cet ajout : fichier de log interne au projet, sans donnée sensible.
