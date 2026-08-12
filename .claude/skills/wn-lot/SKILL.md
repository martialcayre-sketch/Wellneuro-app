---
description: Pilote un lot de campagne WellNeuro de bout en bout — classe le lot, en déduit modèle, palier de test, revue et garde-fous, et propose la séquence complète. Lecture seule par défaut ; n'exécute qu'après acceptation explicite.
argument-hint: "[next | chemin-du-lot] [go]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — pilote de lot

## Contexte — chargé ici une fois, et une seule

!`cd "$(git rev-parse --show-toplevel)" && test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cd "$(git rev-parse --show-toplevel)" && git status --short --untracked-files=all`
!`git diff --stat 2>/dev/null | tail -n 1`
!`cd "$(git rev-parse --show-toplevel)" && node scripts/wn-context-pack.mjs --format markdown 2>/dev/null || true`

Arguments : `$ARGUMENTS`

Ce pilote lit le contexte **au-dessus, une fois**, et le porte jusqu'au bout.
**Interdit aux étapes suivantes : relancer `wn-context-pack`, re-`cat`
`ACTIVE_CAMPAIGN.md`, refaire un `git status` complet.** Ne relire un fichier
que si une écriture l'a modifié entre-temps.

## Deux temps, et la frontière entre eux est dure

**Par défaut — lecture seule.** Classer, décider, proposer la séquence
complète, et s'arrêter. Aucune écriture, aucun `apply`.

**Avec `go` — exécution.** N'est valide que si la proposition a été rendue
**et acceptée** dans la conversation. Un `go` isolé, sans proposition lue
avant, se refuse : répondre par la proposition.

Même sous `go`, ces frontières ne se franchissent jamais seules :

- **toute édition passe par le mode Plan** — le pilote prépare, il ne remplace
  pas l'étape de plan technique ;
- **migration, écriture Supabase, déploiement, changement clinique** exigent
  une confirmation distincte, à demander au moment de l'étape ;
- **le merge** suit le régime en vigueur dans `CLAUDE.md`, pas ce fichier ;
- **un `verify` absent bloque** — ne jamais merger sur les seuls checks Vercel.

## Classer le lot une fois — cette classe décide de tout le reste

Lire le fichier de lot (`## But`, `## Périmètre`, `## Fichiers probables`,
`## Interdits`, `## Tests`, `## Critères de done`) et **vérifier ses hypothèses
contre le dépôt réel** : un écart se signale avant de proposer, pas après. Si
le `## But` ne dit pas ce qui aura changé une fois fait, passer d'abord par
`/wn-reprompt`.

Classer sur les fichiers probables — la classe la plus haute l'emporte :

| Classe | Modèle | Palier | Revue | Garde particulier |
|---|---|---|---|---|
| **Docs** — `.md`, `docs/`, `changelog.d/` | `sonnet` | T1 | `/code-review` en session | fragment `changelog.d/`, jamais le haut de `CHANGELOG.md` |
| **UI** — `web/src/app/**`, `components/**`, `.css` | `sonnet` | **T2** | `/code-review` en session | une suite Vitest verte ne prouve rien sur les parcours |
| **API** — `web/src/app/api/**`, `lib/` hors scoring | `opus` si contrôle d'accès en jeu, sinon `sonnet` | **T2** | `/code-review` en session | contrôle d'accès **avant** la lecture des données |
| **Scoring / clinique** — `questions*.ts`, `equilibre/`, `consultation/`, `prompts/` | `opus` | **T3** | `Agent(wn-reviewer)` | source obligatoire ; absence de réponse → **non scoré**, jamais `0` |
| **Prisma / migration** — `schema.prisma`, `prisma/migrations/` | `opus` | **T3** | `Agent(wn-reviewer)` **avant** de passer la main | confirmation distincte ; **vérifier la base après merge** (`execute_sql`) |
| **Auth** — `lib/auth.ts`, portail, tokens, consentement | `opus` | **T3** | `Agent(wn-reviewer)` **avant** de passer la main | la revue de diff ne voit pas ce que le lot **ne fait pas** |

**Une seule chose déborde la classe** : le gate Fable de `CLAUDE.md`, et lui
seul — **au moins deux signaux forts** (architecture transverse, arbitrage
difficile entre solutions plausibles, cause racine introuvable, décision
engageant plusieurs lots). Un seul signal, même « ça traverse le dépôt » ou
« ça durera plusieurs jours », ne suffit pas ; le lot redescend dès que la
conception est arrêtée. Un lot ordinaire, même clinique, reste à `opus`. Le
modèle du tableau vaut pour la **qualité du verdict** : descendre sur une
revue clinique est un vrai risque.

## Comment le modèle s'applique — solo d'abord

**Classes Docs/UI/API : tout se fait en session, solo.** La session est déjà
au défaut `sonnet` + effort high (`.claude/settings.json`) — cadrer, exécuter
et revoir (`/code-review`) sans sous-agent. On ne délègue que si le périmètre
est réellement volumineux (nombreux fichiers à lire, sorties longues) :
`Agent(wn-explorer)` pour l'investigation seulement.

**Classes Scoring/Migration/Auth : le changement de modèle passe par
l'outil `Agent`** (un skill ne change pas le modèle de la session) — sous-agent
épinglé (`wn-reviewer`=opus, `wn-fable`=fable ; leur frontmatter porte aussi
l'effort) ou paramètre `model` explicite, qui prime sur l'épinglage. Aucun
sous-agent WN ne peut éditer (outils `Read, Grep, Glob, Bash`) ; une exécution
déléguée passe par `Agent(subagent_type: "general-purpose", model: <classe>)`.

**Exception : le mode Plan.** `EnterPlanMode` est un mode de la session, avec
sa porte d'approbation humaine (`ExitPlanMode`) — jamais délégué. Si la classe
exige `opus` pour le plan, **recommander à l'utilisateur** de basculer la
session (`/model opusplan`) avant cette étape.

## Le coût est dans le contexte, pas dans le modèle

Ce qu'une étape fait entrer dans le contexte est relu par toutes les étapes
suivantes. Deux règles : le cadrage se délègue dès qu'il dépasse deux ou trois
fichiers (le contexte du sous-agent est jeté, jamais repayé — ce qui remonte
est la conclusion, jamais les fichiers) ; rien de volumineux n'entre en direct
(rediriger puis lire la partie utile, `Grep`/`Glob` avant `Read`). Ne jamais
afficher un « coût estimé » chiffré : aucun compteur n'est accessible depuis
un skill.

## Séquence proposée

N'inclure que les étapes qui servent — un lot documentaire n'a pas besoin de
T2, un lot sans migration n'a pas besoin de la revue préalable.

1. **Cadrage** — en session pour Docs/UI/API (`Grep`/`Glob` puis lectures
   bornées ; `Agent(wn-explorer)` seulement si le périmètre est volumineux) ;
   `Agent(wn-reviewer)` pour Scoring/Migration/Auth : écarts entre le lot et
   le dépôt réel, périmètre confirmé, hors périmètre nommé.
2. **Plan technique** — mode Plan natif (`EnterPlanMode`, jamais délégué).
   Si la classe exige `opus`, le dire et laisser l'utilisateur basculer
   (`/model opusplan`) avant cette étape.
3. **Exécution** — en session pour Docs/UI/API (la session est déjà au modèle
   de la classe) ; `Agent(subagent_type: "general-purpose", model: <modèle de
   la classe>)` pour Scoring/Migration/Auth. Prompt et périmètre bornés aux
   fichiers du lot ; ne pas élargir.
4. **Validation** — le palier de la classe, **appliqué au diff de la session,
   pas au lot entier** : un diff purement documentaire (aucun fichier de code)
   reste à T1 même dans un lot classé T2/T3 — aucun test de la suite ne lit un
   `.md`, le run ne peut pas rougir à cause du diff, et le CI de la PR rejoue
   tout (constaté au LOT-01 chaîne T0 : T3 complet de 3 min 47 sur la PR #656,
   purement documentaire). Le palier de la classe redevient dû dès que le diff
   touche du code. Sortie redirigée une fois puis relue.
5. **Revue** — un regard qui n'a pas écrit le code : `Agent(wn-reviewer)` pour
   Scoring/Migration/Auth (**avant** de passer la main), `/code-review` en
   session pour Docs/UI/API. Le skill `/wn-review` produit la même <!-- mention-seule: wn-review -->
   chose et s'invoque à la main par l'utilisateur. Demander à la revue
   d'émettre un bloc « risques » réutilisable : la description de PR
   (étape 7) le distille au lieu de relancer un agent sur le même diff.
6. **Clôture** — sur la **branche vivante**, avant la PR : (a) statut du lot,
   (b) entrée `SESSION_LOG.md` < 150 mots avec les deux promotions (règle
   oubliée → exécutable, décision → `docs/DECISIONS.md`), (c) fragment
   `docs/claude/handoffs/`. Les skills `/wn-finish` et `/wn-handoff write` <!-- mention-seule: wn-finish, wn-handoff -->
   produisent (b) et (c) et s'invoquent à la main ; l'étape est définie par ce
   qu'elle laisse dans le dépôt, pas par la commande qui l'écrit. Le merge est
   un squash : ce qui s'écrit après ne remonte plus vers `main`.
   `node scripts/wn-cycle.mjs` rend la phase courante.
7. **PR** — `--body-file`, diff d'une seule finalité, CI lu par
   `node scripts/wn-attendre-ci.mjs <N>` (code `0` seul autorise à l'annoncer
   prête), merge selon le régime de `CLAUDE.md`. Gabarits dans `/wn-pr` <!-- mention-seule: wn-pr -->
   et `/wn-merge`, invoqués à la main. <!-- mention-seule: wn-merge -->

## Sortie de la proposition (mode par défaut)

1. Lot retenu, campagne, but en une phrase.
2. **Écarts constatés** entre le lot et le dépôt réel — ou « aucun ».
3. Classe retenue et les fichiers qui l'ont déterminée.
4. Décisions : modèle, palier, revue, garde-fous applicables.
5. Séquence numérotée, une étape par ligne, avec son mécanisme (mode Plan
   natif, ou l'appel `Agent` visé — sous-agent, modèle).
6. Ce qui exigera une confirmation distincte, et à quelle étape.
7. Ce que cette séquence évite de recharger.
8. **Demande d'acceptation explicite** — et rien d'autre. Ne pas enchaîner.
