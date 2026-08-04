# Handoff — 2026-08-03 — Les deux promotions : attente du CI exécutable, et deux décisions au registre

Écrit sur la branche vivante, avant le merge de #556.

## Git

- Worktree `.claude/worktrees/promotions-attente-ci`, branche
  `worktree-promotions-attente-ci`, partie de `main` à `059fcaaa` (après #555).
- PR **#556** — `verify` vert en 8 min 37 s sur la tête précédente ; `main` a été
  fusionné depuis (#553 mergée), **le CI est donc à relire sur la nouvelle tête**.
- Hors campagne : dette de clôture de LOT-06 et LOT-01. Rien sous `web/src/`.
- **#553 a été mergée** (`cd7c1b9b`) pendant cette session, sur autorisation
  expresse. Son worktree est supprimé, sa branche distante aussi.

## Objectif atteint

Honorer les deux promotions que `/wn-finish` impose d'examiner à chaque clôture,
proposées à la clôture de LOT-06 puis de LOT-01, et jamais écrites.

## Où en est la série

L'idiome documenté attendait que plus rien ne soit `pending`, puis lisait
`gh pr checks`. Il ne distinguait pas **« aucun check en attente »** de
**« aucun check du tout »** : il rendait la main sur deux checks Vercel verts
quand `verify` — seul check obligatoire de la protection de `main` — n'avait
jamais été créé. C'est arrivé sur #550 ; le correctif a été refait **à la main**
sur #553. Une règle oubliée deux fois devient exécutable.

`npm run check` vert dans les **deux** positions de `WN_AGENDA_ALI`. **T3 complet
vert en 2 min 6 s** : PostgreSQL éphémère, `prisma migrate deploy` — le SQL manuel
réellement exécuté —, **drift check `migrate diff --exit-code`**, contrats SQL,
seed, 108 E2E.

1. **Six codes de sortie, et `0` seul autorise à annoncer une PR prête.**
   `1` échec · `2` n'a pas tourné (absent ou gelé) · `3` délai · `4` indéterminé
   · `5` vert mais PR en conflit. Chaque cas où l'on ne peut pas affirmer le vert
   a son code : aucun ne se replie sur `0`.
2. **La liste des checks attendus vient de la protection de branche**, jamais
   d'une constante. Si elle est illisible, `verify` sert encore à diagnostiquer
   mais plus à conclure — verdict `4`.
3. **Expirer n'est pas réussir.** Une boucle d'attente qui rend `0` au bout de
   son délai ne prouve que sa propre patience. Et l'absence d'un check rend `2`
   même quand c'est le délai qui met fin à l'attente : l'absence est
   l'information utile.
4. **Les entrées homonymes sont agrégées, pas dédupliquées.** `ci.yml` se
   déclenche sur `push` *et* `pull_request` : une PR issue de `campaign/**` porte
   **deux** runs nommés `verify` (constaté sur #528). Un nom n'est vert que si
   toutes ses entrées le sont.
5. **Fonction pure + faits injectés.** Toute la décision est dans
   `diagnostiquer()`, testable sans réseau ; `collecter()` ne fait que lire `gh`.
   C'est ce dessin qui a rendu les défauts trouvables.
6. **Écarté** : un contrôle CI bloquant réclamant l'usage du script — il
   bloquerait un correctif urgent, dessin déjà écarté pour le handoff.

## Ce qui est en place

- `scripts/wn-attendre-ci.mjs` + banc **31 cas**, câblé dans `ci.yml` hors filtre
  `docs_only` — **5 bancs déclarés avant, 6 après**.
- L'idiome remplacé dans `CLAUDE.md`, `/wn-pr`, `/wn-merge`, et les **deux**
  protocoles de `docs/ROLES_MACHINES.md`.
- `docs/DECISIONS.md` : **D-012** (la barrière D-003 se garde au point de
  passage, pas chez ses lecteurs) et **D-011** (un écart de restitution de l'IA
  se journalise, ne se censure pas).
- `docs/ROLES_MACHINES.md` affirmait `enforce_admins` **désactivé** : faux depuis
  le 2026-07-21, démenti par la lecture directe du réglage.

## Ce que la revue adversariale a corrigé

- Banc 31/31 · **19 mutations, aucune ne survit** · T1 vert (340 fichiers,
  3459 tests) · anti-secrets, cross-invocation, blocs `!`, audit campagnes : 0.
- Exécution réelle : #553 en conflit → `5` · #550 mergée → `4` · numéro
  inexistant → `4` · #556 → `0`, **le script a attendu son propre CI**.
- **Deux revues adversariales** : NO-GO (3 bloquants) puis GO.

## Problèmes ouverts

- **Un banc vert ne prouve que ce qu'il sait interroger.** Le banc à 18 cas
  laissait survivre deux mutations et trois faux verts ; c'est la revue qui les a
  trouvés. Deux de mes mutations ne mutaient rien (`'' || x` vaut `x`) : le
  pilote de falsification doit lui-même être falsifiable.
- **Un commit de tête Copilot n'a PAS gelé le run de #553**, contrairement à la
  doctrine de `CLAUDE.md`. Observation unique, non généralisée — mais l'un des
  deux énoncés est faux.
- La jq de la protection lit `.checks[].context` et **jette `app_id`**, auquel la
  protection est pourtant liée : un commit status homonyme posté par un autre
  acteur satisferait le script et pas GitHub. Théorique.
- `mergeStateStatus: 'DRAFT'` rend `0`, comme `BLOCKED` : cohérent tant que `0`
  signifie « les checks sont verts et rien de connu n'invalide ce vert ». Si `0`
  devait un jour signifier « fusionnable », `DRAFT` rejoindrait `DIRTY`.
- **Le handoff de LOT-01 n'a pas atteint `main`** : Copilot avait résolu les
  conflits de #553 avant moi et gardé la version de #555 sur ce fichier à
  créneau unique. Sa substance est dans `SESSION_LOG` et le changelog.
- Le faux négatif connu de `skill-cross-invocation.test.mjs` (un drapeau en
  commentaire lui échappe) reste ouvert — hors périmètre.
- Hérités : les six règles du LOT-05 ne sont pas signées cliniquement, sans quoi
  le LOT-06 livré n'affiche rien.

## Prochaine action exacte

Relire le `verify` de #556 sur la tête actuelle — `node scripts/wn-attendre-ci.mjs 556`,
code `0` exigé — puis merger si l'autorisation est donnée. Ensuite **LOT-07**,
dernier lot de la campagne : reliquat de certification, documentaire, sans
dépendance. Repartir de `main`, jamais de la branche squashée.

## Interdits encore actifs

- Aucune migration, aucune écriture Supabase, rien sous `web/src/`.
- Ne pas merger sur les seuls checks Vercel : `verify` absent **bloque**, et
  `enforce_admins` est actif — personne ne passe outre, propriétaire compris.
- Ne pas ajouter de contrôle CI bloquant réclamant le script (cf. décision 6).
- Ne jamais forcer un `push` sur une branche qu'un autre agent a résolue.
