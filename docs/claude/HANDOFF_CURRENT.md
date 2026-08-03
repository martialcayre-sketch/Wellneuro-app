# Handoff — 2026-08-03 — Les blocs `!` des skills ancrés à la racine

## Git

- Worktree `.claude/worktrees/skills-blocs-bang-ancres`, branche
  `worktree-skills-blocs-bang-ancres`, partie de `main` à `f3e6b73b` (après le
  merge de #552).
- Hors campagne : correctif d'outillage, aucun lot.
- Rien sous `web/` n'est touché. Aucune migration, aucune auth, aucun changement
  clinique.

## Le défaut, et pourquoi il ne se voyait pas

Le répertoire de travail des sessions est `web/`, pas la racine du dépôt. Or 32
blocs `!` de `SKILL.md` désignaient des chemins relatifs à la **racine**.

Mesuré depuis `web/` sur les 32, un par un — pas estimé :

| régime | nombre | ce qu'on voit |
| --- | ---: | --- |
| **muet** (code 0, sortie vide) | **27** | rien du tout |
| bruyant (code ≠ 0) | 5 | `MODULE_NOT_FOUND`, le skill refuse de se charger |

Les 5 bruyants sont ceux qui ont déclenché le diagnostic (`wn-context`,
`wn-finish`, `wn-handoff` ×2, `wn-conventions:13`). **Les 27 autres étaient le
vrai problème** : `/wn-route`, `/wn`, `/wn-lot`, `/wn-ultra`, `/wn-auto` et les
six `/wn-rN` rendaient « aucune campagne active », « aucun SESSION_LOG », et
planifiaient sur un état qu'ils croyaient avoir lu.

Deux formes trompeuses valent d'être retenues, parce qu'elles ressemblent à des
échecs et n'en sont pas :

- `sed -n '…' CLAUDE.md | sed '$d'` — le code de retour d'un **pipeline** est
  celui du dernier élément ; `sed '$d'` sur une entrée vide sort en 0 ;
- `git log … -- CLAUDE.md AGENTS.md` — un pathspec **littéral** non résolu depuis
  `web/` rend une sortie vide, code 0.

## Ce qui est en place

- **32 blocs ancrés** par `cd "$(git rev-parse --show-toplevel)" &&`. Vérifié, pas
  supposé : depuis un worktree, cette commande rend la racine **du worktree**
  (`--git-common-dir` pointerait, lui, vers le dépôt principal) — l'ancre est donc
  correcte dans le mode nominal, « une session = un worktree ».
- **`/wn-auto` lisait `docs/roadmap.md`, qui n'existe pas.** Le bloc serait resté
  muet même ancré — la revue l'a trouvé, et c'est exactement la classe de défaut
  que ce lot existe pour tuer. Il lit désormais les deux fichiers réels,
  `ROADMAP_PRODUIT.md` et `ROADMAP_TECHNIQUE.md`.
- **`scripts/lib/skill-bang-cwd.mjs`** + banc de 17 cas, câblés dans `verify`
  **hors filtre `docs_only`** (une PR de `SKILL.md` est classée documentaire :
  gater le contrôle reviendrait à ne jamais l'exécuter sur les PR qu'il vise).

## Décisions à ne pas rejouer

1. **La détection interroge le dépôt, pas une liste de préfixes.** Une première
   version listait six marqueurs (`scripts/`, `docs/`, `.github/`, `.claude/`,
   `CLAUDE.md`, `AGENTS.md`) et laissait donc passer `./scripts/`, `web/`,
   `changelog.d/`, `tools/`, `CHANGELOG.md` — des blocs muets sous un CI vert. La
   règle est maintenant : un jeton est un chemin de racine **si son premier segment
   existe à la racine**. Question exacte, réponse gratuite. Le banc verrouille les
   cinq trous refermés.
2. **Un pathspec à joker n'a pas besoin d'ancre.** `git log -- '*.md'` rend la même
   sortie depuis `web/` et depuis la racine (le joker matche le chemin complet) ;
   un pathspec **littéral** en a besoin. La première version ancrait les deux — la
   révision a défait l'ancre de `wn-docs:12`, inutile.
3. **L'ancre est exigée EN TÊTE de commande.** Trouvée n'importe où, elle laisserait
   passer `node scripts/x.mjs; cd "$(…)" && true`, où elle arrive trop tard.
4. **Les 30 blocs sans chemin ne sont PAS ancrés.** `git status --short` couvre le
   dépôt entier depuis n'importe où — seule la **présentation** des chemins change
   (`../.claude/…` depuis `web/`), pas l'ensemble rapporté. Les ancrer
   stabiliserait cet affichage : c'est un autre sujet, et 30 blocs.
5. **Écarté** : documenter la convention dans `CLAUDE.md`. Le CI rouge dit déjà quoi
   faire, avec le chemin fautif et la commande à écrire.

## Validations exécutées

Garde bang **0 violation** sur 63 blocs · son banc **17/17** · garde d'invocations
croisées 0 · son banc 13/13 · banc `wn-cycle` 16/16 · audit campagnes 0 ·
anti-secrets 0 · **T1** vert (3 451 tests).

**Vérifié sur l'état d'AVANT, pas seulement sur l'état d'après** : le garde rejoué
contre les `SKILL.md` de `main` rend **exactement 32 violations** — les mêmes que le
diagnostic. Un garde vert sur un dépôt déjà corrigé ne prouve rien.

Revue adversariale `wn-reviewer` : **GO**, deux MAJEUR (le bloc `roadmap.md` mort et
la liste de préfixes trouée) et quatre MINEUR corrigés dans la foulée — dont trois
comptages faux, remplacés par une mesure.

## Problèmes ouverts

- **Les blocs `!` d'un même `SKILL.md` partagent-ils un shell ?** Si oui, le `cd`
  d'un bloc déplacerait les suivants et la décision 4 ci-dessus disparaîtrait d'elle-
  même. Non vérifiable depuis une session ; à trancher par l'observation.
- **Hors dépôt git, l'ancre dégrade en silence** : `git rev-parse` échoue,
  `cd "" &&` est un no-op de code 0, et le remède reproduit la maladie. Sans objet
  en pratique.
- `BLOC_BANG` exige le backtick fermant en fin de ligne : un bloc suivi de texte ne
  serait ni compté ni contrôlé. Aucun cas aujourd'hui.
- Le refus d'être vert sur zéro skill est testé ici, mais **pas** dans le banc du
  contrôle voisin (`skill-cross-invocation.test.mjs`) — écart de convention connu.

## Prochaine action exacte

Ouvrir la PR, lire son `verify`, merger. Ensuite, reprise possible de la campagne
`2026-08-03-packs…` : **LOT-07** (reliquat de certification) ou la **signature
clinique des six règles du LOT-05**, sans laquelle le LOT-06 livré n'affiche rien.

## Interdits encore actifs

Aucune migration, aucune écriture Supabase, aucun changement clinique. Ne jamais
forcer un merge sur une PR gelée en `action_required` — `enforce_admins` est actif,
`verify` obligatoire. Après un merge en squash, repartir de `main`.
