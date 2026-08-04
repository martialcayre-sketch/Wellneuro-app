# Handoff — 2026-08-04 — Créneaux partagés et chaîne de skills

Écrit sur la branche vivante, avant la PR. **Premier handoff écrit sous la convention
qu'il institue** — les quatre autres fragments du dossier sont des restaurations.

## Git

- Worktree `.claude/worktrees/collisions-creneaux-et-skills`, branche
  `worktree-collisions-creneaux-et-skills`, partie de `main` à `39ec51e6` (après #562).
- Hors campagne, sans entrée `.wn/state.json`. Une **autre session travaille en
  parallèle** dans `.claude/worktrees/cloture-campagne-packs` — c'est d'elle que
  venaient #560, #561 et #563.

## Objectif atteint

Deux branches parallèles ne se disputent plus le journal ni le handoff ; une collision de
numéro de décision devient impossible à merger sans la voir ; et aucune consigne de skill
ne pointe vers une porte fermée.

## Trois conflits, trois remèdes — c'est le cœur du lot

Le réflexe était d'appliquer le patron `changelog.d/` aux trois fichiers. Il ne convenait
qu'à un seul.

| Fichier | Nature du conflit | Remède |
|---|---|---|
| `SESSION_LOG.md` | append en fin : deux branches conflictent **toujours**, et la résolution est **toujours** « garder les deux » | `merge=union` — une ligne de `.gitattributes`, git fusionne seul |
| handoffs | créneau **unique** — un seul peut gagner | un fichier par lot, `AAAA-MM-JJ-HHMM-slug.md` |
| `DECISIONS.md` | créneau **plus** allocation d'un numéro à l'écriture | garde d'unicité : la collision devient **visible et bloquante** |

## Ce qu'il faut savoir avant de toucher à ce code

1. **`merge=union` vise `SESSION_LOG.md` et RIEN d'autre.** Il duplique une ligne
   modifiée des deux côtés — inoffensif là où l'on n'ajoute qu'en fin, dangereux
   ailleurs. Ne l'étends jamais à `DECISIONS.md`, dont l'écriture se fait en tête. Un
   test l'interdit explicitement.
2. **Le journal est append-only par CONVENTION, pas par contrainte.**
   `/wn-compact-sessionlog` le réécrit. Une compaction concurrente d'un ajout ferait
   **ressusciter** silencieusement des entrées compactées — invisible au diff de fusion.
   L'avertissement est en tête de ce skill ; relire le fichier après toute fusion.
3. **Le marqueur nomme sa cible** : `<!-- mention-seule: wn-review -->`. Il n'exempte que
   les cibles nommées. Un marqueur sans cible, ou nommant une cible absente de la ligne,
   est **refusé** — sinon il redeviendrait un blanc-seing. Le format ancien ne passe plus.
4. **Un numéro `D-NNN` ne se libère jamais.** Le garde interdit les trous : une décision
   retirée s'archive, elle ne se supprime pas. Ne renuméroter que sur une branche jamais
   publiée.

## Ce que les deux revues ont corrigé

**Le garde existait, était bloquant en CI, et était vert pendant que neuf branchements
étaient morts.** Il exigeait un verbe impératif dans les 90 caractères précédant un
`/wn-x` ; les branchements étaient des titres d'étape nominaux (`5. **Revue** —
/wn-review`). Sans verbe, pas de constat.

Puis, redessiné fail-closed sur ses **références**, il restait fail-open sur la
**détermination de sa cible** : `disable-model-invocation: yes`, `on` ou `1` — booléens
vrais en YAML 1.1 — faisaient sortir un skill du périmètre et reverdissaient tous les
branchements qui le visaient. **Un garde n'est fail-closed que si les deux bouts le sont.**

Et une de mes consignes a produit un contournement : demandant de supprimer 21 marqueurs,
j'ai obtenu le retrait des **barres obliques** — donc des lignes invisibles au garde. La
morsure l'a tranché sans discussion : avec barre oblique et sans marqueur, le garde mord ;
sans barre oblique, il est muet.

## Problèmes ouverts

- **`merge=union` côté GitHub** : non établi pour un squash serveur. Il est éprouvé en
  fusion et rebase **locaux** — le cas où il sert, la résolution se faisant au poste.
- **`docs/DECISIONS.md` reste le seul artefact partagé non découpé.** Arbitrage assumé :
  renommer quatorze décisions citées depuis du code clinique n'avait pas sa place ici.
  L'identifiant daté (`D-AAAA-MM-JJ-slug`) reste la réponse de fond, dans un lot à part.
- **Le marqueur croît de façon monotone** — 100 mentions déclarées aujourd'hui, injectées
  dans le contexte à chaque invocation de skill. À surveiller.
- **Ce lot valide sa propre clôture tout seul** : les quatre fragments restaurés
  satisfont `estFragmentDeHandoff`, donc `wn-cycle.mjs` aurait rendu « handoff ✓ » même
  sans ce fichier. Inhérent à un lot de migration — ne pas s'y fier ailleurs.
- Hérité, non traité : le commentaire de `ci.yml` affirmait que `git status --short` rend
  la même chose depuis n'importe où ; c'est faux (préfixe `../` depuis `web/`). Corrigé
  ici, mais l'allowlist du garde `skill-bang-cwd` repose encore sur cette famille
  d'assertions.

## Prochaine action exacte

Ouvrir la PR, puis `node scripts/wn-attendre-ci.mjs <N>` — **code `0` exigé**, et
vérifier que `verify` a réellement tourné.

Ensuite **L4b** de l'agenda alimentaire : aiguillage dans
`portail/[token]/questionnaires/[idAssignation]/page.tsx` (littéral `Q_SOM_09` en dur),
**hub patient** (`api/portail/assignations/route.ts` et `lib/portail/hubQuestionnaires.ts`
— sans quoi une assignation `Q_ALI_09` mène à une impasse en 409), surface de saisie
(< 30 s/jour) et E2E. **Deux questions à trancher avant** : la borne des 21 jours au POST
ou à la clôture, et la position de `WN_AGENDA_ALI` sur les environnements Vercel.

## Interdits encore actifs

- Ne pas étendre `merge=union` au-delà de `SESSION_LOG.md`.
- Ne pas poser de marqueur `mention-seule` sur une prescription : réécrire l'étape.
- Ne pas allumer `WN_AGENDA_ALI` : le hub et l'aiguillage manquent.
- Aucune migration, aucune écriture Supabase.
