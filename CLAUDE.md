# CLAUDE.md — Wellneuro NNPP2

Contexte pour Claude Code, lu à chaque session. Chaque ligne est repayée à
chaque tour : rester court, pointer les détails. Les règles spécifiques à un
sous-système vivent dans `.claude/rules/` (chargées quand les fichiers
concernés sont touchés).

## Stack

- Next.js 14 (App Router) — code dans `web/`
- Prisma + PostgreSQL (Supabase)
- NextAuth — OAuth Google restreint au domaine `@wellneuro.fr`
- Déploiement Vercel (`app.wellneuro.fr`)

Application de consultation en neuronutrition **en production**. Google Apps
Script et Google Sheets sont décommissionnés (code archivé dans
`archive/gas-legacy/`, référence seule). Priorité absolue : stabilité en
production, pas de migration technologique sans demande explicite. État
courant : `docs/claude/PROJET_CONTEXTE.md`.

## Règles non négociables

- **Jamais de secret en dur** (clés API, tokens, mots de passe) : variables
  d'environnement uniquement (`web/.env.local` en dev, Vercel en prod), jamais
  committées.
- **UI en français** : tout texte visible par l'utilisateur.
- **Changements minimaux** : pas de refactoring, renommage ou réorganisation
  non demandés.
- **Pas de migration Prisma sans demande explicite** : jamais
  `prisma migrate dev` / `db push` ni modification de `schema.prisma` sans
  confirmation explicite dans la conversation.
- **Pas de SQL destructif** sans confirmation explicite (DROP, DELETE sans
  WHERE, TRUNCATE).
- **Pas de modification de la logique clinique ou des seuils** sans demande
  explicite, documentée dans `changelog.d/`.
- **La base de production ne se modifie que par une migration relue** :
  migration committée → PR relue → merge sur `main` → workflow `release-db`
  (déclenchement automatique, approbation humaine requise). Le build Vercel
  n'écrit pas en base. Aucun autre chemin. Voir `docs/DEPLOIEMENT_RELEASE_DB.md`.
- **Une migration et le code qui en dépend ne voyagent pas dans la même PR** —
  ou ce code part derrière un drapeau éteint : le merge déclenche le
  déploiement Vercel avant que la release ait pu être approuvée.
- **Lire la production uniquement via l'outil MCP Supabase `execute_sql`** —
  jamais `psql` ni Bash. Les hooks y autorisent les lectures et refusent toute
  écriture/DDL. Requêtes et pièges : `.claude/rules/db-prisma.md`.

## Données patients

Seuls ces patients fictifs peuvent apparaître dans le code, les seeds, les
tests ou les démos : **Sophie Nicola, Jennifer Martin, Michel Dogné**.
Ne jamais générer, dériver ou « compléter » des données patient réelles, même
si elles apparaissent dans un fichier ouvert ou un log collé par erreur.

## Constitution clinique (extrait permanent)

Ces règles valent pour tout ce qui produit, transforme ou restitue du savoir
clinique — moteurs, prompts, tables de règles, scoring. Elles sont
**opposables en revue** (`D-043`) ; aucune n'est encore gardée par un banc, et
la constitution nomme cette dette règle par règle. Détail et audit :
`docs/claude/doctrine/` (58 règles `DC-nn`) ; rappel automatique sur les
chemins cliniques via `.claude/rules/clinique-scoring.md`.

- **Aucune règle clinique sans provenance certifiée** — un LLM applique,
  combine, hiérarchise ou explique ; il n'invente jamais (`DC-01`, `DC-02`).
- **Aucun seuil, dose, poids ou borne clinique inventé** ; un chiffre purement
  technique doit être identifié comme tel (`DC-19`, `DC-20`).
- **Association ≠ causalité ; score ≠ diagnostic** (`DC-27`).
- **Une donnée absente n'est jamais zéro ni normale** (`DC-24`).
- **Un questionnaire isolé ne suffit pas à conclure** (`DC-28`).
- **Une discordance se signale, jamais ne se moyenne ni ne se supprime**
  (`DC-30`).
- **Un signal de sécurité prime sur tout score** et n'ajoute pas de points
  (`DC-12`, `DC-23`).
- **Diagnostic, hypothèse et orientation sont trois objets distincts** ; le
  diagnostic reste hors périmètre (`DC-31`, `DC-32`).
- **Respecter la population et les limites d'un claim** ; l'absence de
  population déclarée est une restriction (`DC-14`).
- **Les règles cliniques vivent dans le registre, jamais seulement dans le
  code** (`DC-26`).
- **Toute sortie clinique importante est explicable par données + claims**, y
  compris quand elle s'abstient (`DC-34`, `DC-35`).
- **Données insuffisantes ⇒ réduire la conclusion, jamais l'inventer**
  (`DC-25`).
- Conflit non résolu entre sources ⇒ escalade praticien (`DC-54`, `DC-55`) —
  *proposition, pas encore opposable* : `D-041` la réserve jusqu'au banc.
- **Toute modification clinique exige une décision explicite `D-xxx` et un
  fragment `changelog.d/`** — y compris une seule ligne de TypeScript dans une
  table signée, des poids ou un cut-off (`DC-17`, `DC-18`).

## Comportement par défaut — développeur senior

<!-- Hiérarchie de maintenance (retirée du contexte par Claude Code) :
1. hook/permission/test pour toute précondition objectivement vérifiable ;
2. CLAUDE.md pour un comportement transversal à toutes les sessions ;
3. .claude/rules/ pour une règle limitée à des chemins ;
4. skill pour une procédure invoquée ; agent pour une relecture spécialisée.
Ne pas recopier une règle d'un étage dans les suivants. -->

- Comprendre avant de modifier ; commencer par l'hypothèse la plus simple.
- Limiter l'investigation au périmètre utile : `Grep`/`Glob` pour localiser
  avant de lire, `Read` borné sur les gros fichiers.
- Changement minimal ; pas de refactoring « au passage », pas d'élargissement
  spontané du périmètre, pas d'abstraction sans bénéfice concret.
- Une décision confirmée ne se reformule qu'une fois : l'exécuter ensuite,
  sauf fait nouveau qui change réellement le choix.
- Ne questionner l'utilisateur que sur une ambiguïté qui change le résultat et
  que le dépôt, Git/GitHub ou les outils disponibles ne peuvent pas résoudre.
- Budget de narration : communiquer seulement un résultat intermédiaire utile,
  un blocage, un risque nouveau ou un changement de plan — pas chaque lecture,
  recherche, édition ou test attendu.
- Aller droit au résultat vérifiable ; tester proportionnellement au risque.
- Signaler rapidement un blocage réel plutôt que le contourner en silence.
- `/clear` entre deux sujets sans rapport. Le développement courant reste
  solo ; déléguer à un sous-agent quand l'investigation est réellement
  volumineuse (nombreux fichiers, sorties longues) ou porte une classe à
  risque — son contexte est jeté, ce qu'il lit n'est jamais repayé, et ce qui
  remonte est la conclusion.

## Modèle, effort, mode d'exécution

**Défaut : Sonnet 5 + effort high + exécution solo.** Couvre le développement
courant : TypeScript, React, Next.js, docs, tests, CRUD, corrections
localisées, Git/GitHub. Ne jamais escalader sans signal concret.

- **Opus** quand le risque ou la difficulté le justifie : sécurité, auth,
  revue critique, migration ou Prisma sensible, scoring/clinique, bug
  résistant.
- **Fable** : exceptionnel (< 10 % des tâches), sur au moins deux signaux
  forts — architecture transverse, arbitrage difficile entre solutions
  plausibles, cause racine introuvable après investigation sérieuse, décision
  engageant plusieurs lots. Jamais pour du CRUD, des docs, des tests, une
  clôture de session ou un bug déjà localisé.
- **Ultracode** = largeur parallélisable (audit exhaustif, transformation
  massive de fichiers indépendants), jamais la profondeur d'un bug local.
  Opt-in explicite uniquement.
- Exploration générique : agent natif `Explore` (léger, lecture seule) ;
  `wn-explorer` reste disponible.
- Planification : mode Plan natif ; `opusplan` (Opus pour le plan, Sonnet pour
  l'exécution) quand le plan est le morceau difficile. Ne pas cumuler
  `/wn-plan` et le mode Plan natif sur la même tâche.
- Revue ordinaire : `/code-review`. Revue à fort risque (migration, auth,
  permissions, clinique) : agent `wn-reviewer` (Opus). Angle sécurité :
  `/security-review`.
- Les agents `.claude/agents/` épinglent leur modèle en frontmatter
  (wn-reviewer/wn-debugger → opus, wn-explorer → haiku, wn-fable → fable) ;
  ce frontmatter fait foi. Re-routage manuel : `/wn-route`, `/wn-model`,
  `/wn-ultra`.

## Garde-fous d'écriture (hooks)

Trois verdicts : **refus** (`.env*`, `.git/`, `node_modules/`, commandes
destructives ou exposant des secrets — sans dérogation), **demande**
(`schema.prisma`, `prisma/migrations/`, `supabase/migrations/`,
`prisma migrate`, push forcé — l'autorisation en un clic dans la session
matérialise la « confirmation explicite »), **silence** (le reste). Aucune
variable d'environnement ne désactive la protection. Nuances (heredocs, faux
positifs assumés) : `.claude/rules/hooks-garde-fous.md`.

## Validation

| Palier | Commande | Durée | Quand |
|---|---|---|---|
| T1 | `cd web && npm run check` | ~15 s | après chaque édition |
| T2 | `npm run test:worktree -- --fast` | ~1 min 20 | avant tout commit UI ou API |
| T3 | `npm run test:worktree` | ~5 min | avant une PR migration/scoring/clinique |

- T1 ne joue pas de suite complète ; la première passe entière est T2 — c'est
  T2 qu'il faut lancer avant de conclure qu'une suite est verte. Une suite
  Vitest verte ne prouve rien sur les parcours (Playwright est dans
  `test:worktree` seulement).
- **Les E2E (`npm run test:e2e`) sont l'exclusivité du Mac** — base partagée,
  jamais deux runs en parallèle. Rôles : `docs/ROLES_MACHINES.md`.
- Rediriger la sortie d'une suite vers un fichier (`--reporter=dot`) puis la
  relire ; ne jamais relancer une suite pour en relire la sortie.
- `test:worktree` provisionne son PostgreSQL éphémère et son secret de test.
  Prérequis et options : `web/e2e/README.md`.

## Commandes utiles

```bash
cd web && npm run dev              # serveur local
cd web && npx prisma generate      # régénérer le client après modif du schéma
bash scripts/check_no_secrets.sh   # anti-secrets (--staged : lignes indexées)
node scripts/wn-cycle.mjs          # phase du cycle de lot (--appliquer : resynchronise l'état)
node scripts/wn-etat-reel.mjs      # état réel du dépôt — rapporte, ne répare jamais
```

## Avant de committer

- `bash scripts/check_no_secrets.sh` ; aucun fichier `.env*` ; textes UI en
  français ; pas de régression visible dans les parcours (changement d'UI →
  rejouer les E2E via T2).
- **Changelog et handoffs par fragments** (`changelog.d/`,
  `docs/claude/handoffs/`) — jamais d'édition du haut de `CHANGELOG.md`, jamais
  de fichier de handoff partagé. Détail : `.claude/rules/docs-changelog.md`.
- **La clôture passe avant la PR, pas après le merge** : `/wn-finish` puis
  `/wn-handoff write` s'écrivent sur la branche vivante (le merge est un
  squash). En cas de doute sur la phase : `node scripts/wn-cycle.mjs`.

## PR, CI, merge

- Ouvrir la PR avec `--body-file` et un diff d'une seule finalité.
- Attendre le CI en un seul appel bloquant :
  `node scripts/wn-attendre-ci.mjs <N>` — jamais de `gh pr checks` en boucle.
  **`0` est le seul code de sortie qui autorise à annoncer une PR prête.**
- La revue, le merge et la suppression des branches appartiennent à Copilot,
  sauf autorisation transitoire en cours. PR migration/auth : revue
  `wn-reviewer` avant, vérification de la base de production après. Tout le
  détail : `docs/claude/REGLES_PR_MERGE.md` (chargé par `/wn-merge`).

## Documentation de référence

- `docs/claude/README.md` (vue d'ensemble) · `PROJET_CONTEXTE.md` (état
  courant) · `REGLES_CRITIQUES.md` (sécurité/clinique) ·
  `WORKFLOW_DEVELOPPEMENT.md` · handoffs : `docs/claude/handoffs/README.md`
- `docs/ROLES_MACHINES.md` (machines, worktrees, E2E) ·
  `docs/ROADMAP_TECHNIQUE.md` · `docs/HISTORIQUE_CHANTIERS_TECHNIQUES.md` ·
  `docs/ROADMAP_PRODUIT.md`
- **Le préfixe `R` désigne trois séries sans rapport** (technique, produit,
  réserves d'audit) : toujours qualifier la série, un `R6` nu est ambigu.

## Début de session

- Si `docs/claude/SESSION_LOG.md` existe, lire silencieusement sa dernière
  entrée avant de répondre à la première question.
- **Une session = un worktree** (outil `EnterWorktree`, ou `git worktree add`)
  — jamais de `checkout`/`switch` dans le worktree d'une autre session.
- **Avant la première édition, vérifier branche, HEAD et `origin/main` après un
  `git fetch origin main` réussi.** Le hook de fraîcheur Git l'impose à chaque
  démarrage/reprise : si la branche ne contient pas le nouvel `origin/main`,
  arrêter les éditions et faire arbitrer la remise à niveau. Jamais de
  pull/merge/rebase automatique ; un historique divergent se réconcilie par
  arbitrage humain.

## Fin de session

Sur demande d'un « résumé de session » : < 150 mots (décisions, options
écartées et pourquoi, prochaine action, questions ouvertes), ajouté en append
à `docs/claude/SESSION_LOG.md` sous un titre `## [date] — [sujet]`, sans
demander confirmation (log interne, sans donnée sensible).

## Définition de done

Changement limité au périmètre demandé ; pas de secret ni donnée sensible
introduits ; documentation mise à jour si nécessaire.
