---
description: Pilote un lot de campagne WellNeuro de bout en bout — classe le lot, en déduit modèle, palier de test, revue et garde-fous, et propose la séquence complète. Lecture seule par défaut ; n'exécute qu'après acceptation explicite.
argument-hint: "[next | chemin-du-lot] [go]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — pilote de lot

## Contexte — chargé ici une fois, et une seule

!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`git status --short`
!`git diff --stat 2>/dev/null | tail -n 1`
!`node scripts/wn-context-pack.mjs --format markdown 2>/dev/null || true`

Arguments : `$ARGUMENTS`

## Ce que ce skill fait, et pourquoi il existe

Une campagne s'exécutait en sept invocations — `/wn-campaign-run`, mode Plan,
`/wn-review`, `/wn-finish`, `/wn-pr`, `/wn-merge` — dont **chacune rechargeait le
même contexte** sans rien transmettre à la suivante. Le coût d'une campagne n'est pas
le choix des agents : c'est la répétition.

Ce pilote lit le contexte **au-dessus, une fois**, et le porte jusqu'au bout.

**Interdit à toutes les étapes qui suivent : relancer `wn-context-pack`, re-`cat`
`ACTIVE_CAMPAIGN.md`, refaire un `git status` complet, ou réinvoquer `/wn-context`.**
Le contexte est en session. Si une étape en a besoin, elle le lit ici. Ne relire un
fichier que si une écriture l'a modifié entre-temps.

## Deux temps, et la frontière entre eux est dure

**Par défaut — lecture seule.** Classer, décider, proposer la séquence complète, et
s'arrêter. Aucune écriture, aucun `apply`, aucune commande qui modifie quoi que ce
soit. C'est le mode qui rend la main pour arbitrage.

**Avec `go` — exécution.** N'est valide que si la proposition a été rendue **et
acceptée** dans la conversation. Un `go` isolé, sans proposition lue avant, se refuse :
répondre par la proposition.

Même sous `go`, ces frontières ne se franchissent jamais seules :

- **toute édition passe par le mode Plan** — le pilote prépare, il ne remplace pas
  l'étape de plan technique ;
- **migration, écriture Supabase, déploiement, changement clinique** exigent une
  confirmation distincte, à demander au moment de l'étape, pas d'avance ;
- **le merge** suit le régime en vigueur dans `CLAUDE.md`, et pas ce fichier ;
- **un `verify` absent bloque** — ne jamais merger sur les seuls checks Vercel.

## Classer le lot une fois — cette classe décide de tout le reste

Lire le fichier de lot (`## But`, `## Périmètre`, `## Fichiers probables`,
`## Interdits`, `## Tests`, `## Critères de done`) et **vérifier ses hypothèses contre
le dépôt réel** : un lot rédigé il y a trois semaines peut viser un fichier qui a
bougé. Un écart se signale avant de proposer, pas après.

Puis classer sur les fichiers probables — la classe la plus haute atteinte l'emporte :

| Classe | Modèle | Palier | Revue | Garde particulier |
|---|---|---|---|---|
| **Docs** — `.md`, `docs/`, `changelog.d/` | `sonnet` | T1 | `/wn-review` | fragment `changelog.d/`, jamais le haut de `CHANGELOG.md` |
| **UI** — `web/src/app/**`, `components/**`, `.css` | `sonnet` | **T2** | `/wn-review` | une suite Vitest verte ne prouve rien sur les parcours |
| **API** — `web/src/app/api/**`, `lib/` hors scoring | `sonnet` | **T2** | `/wn-review` | contrôle d'accès **avant** la lecture des données |
| **Scoring / clinique** — `questions*.ts`, `equilibre/`, `consultation/`, `prompts/` | `opus` | **T3** | `/wn-review` + `wn-reviewer` | source obligatoire ; absence de réponse → **non scoré**, jamais `0` |
| **Prisma / migration** — `schema.prisma`, `prisma/migrations/` | `opus` | **T3** | `wn-reviewer` **avant** de passer la main | confirmation distincte ; **vérifier la base après merge** (`execute_sql`) |
| **Auth** — `lib/auth.ts`, portail, tokens, consentement | `opus` | **T3** | `wn-reviewer` **avant** de passer la main | idem migration : la revue de diff ne voit pas ce que le lot **ne fait pas** |

Le modèle du tableau vaut pour la **qualité du verdict**, pas pour le coût :
descendre sur une revue clinique est un vrai risque, monter sur une lecture ne coûte
presque rien. La dépense se joue ailleurs.

## Le coût est dans le contexte, pas dans le modèle

Mesuré le 2026-08-01 sur 35 194 appels : une requête relit **~202 000 tokens** pour
produire ~600 tokens. **Ce qu'une étape fait entrer dans le contexte est relu par
toutes les étapes suivantes** — et un lot en compte sept.

Deux règles, à appliquer sans les réexpliquer :

- **L'étape de cadrage se délègue dès qu'elle dépasse deux ou trois fichiers.** Un
  sous-agent lit dans son propre contexte, jeté à la fin, donc jamais repayé : 28
  fois moins cher par appel qu'une lecture faite dans la session. Ce facteur ne
  vient pas du tarif du modèle mais de l'isolement — il vaut donc aussi pour un
  agent cher. **Ce qui remonte du sous-agent est la conclusion, jamais les
  fichiers.**
- **Rien de volumineux n'entre en direct.** Sortie de suite, dump, fichier long :
  rediriger puis lire la partie utile ; `Grep`/`Glob` pour localiser avant tout
  `Read` ; `offset`/`limit` sur un fichier long.

La proposition annonce **ce que la séquence ne fera pas entrer dans le contexte** —
c'est la partie vérifiable de son économie, et la seule.

## Ce que ce pilote ne mesure pas — et ne prétendra pas mesurer

**Aucun compteur de tokens n'est accessible depuis un skill.** Ce pilote économise en
réduisant ce qui entre dans le contexte et le nombre d'allers-retours, pas en pilotant
un budget.

Ne jamais afficher un « coût estimé » chiffré : ce serait un nombre sans source. La
consommation réelle se mesure hors session, en agrégeant les compteurs des transcripts
`~/.claude/projects/**/*.jsonl` (`input_tokens`, `output_tokens`,
`cache_creation_input_tokens`, `cache_read_input_tokens`) — c'est cette mesure, et
elle seule, qui a établi les chiffres de ce fichier.

Ce qui se dit honnêtement dans la proposition : le nombre d'étapes, les délégations
prévues, le palier retenu, et surtout **ce qui n'entrera pas dans le contexte de la
session** — fichiers lus par un sous-agent, sorties redirigées, paliers non élargis.

## Séquence proposée

Construire la séquence à partir de la classe, en n'incluant que les étapes qui servent
réellement — un lot documentaire n'a pas besoin de T2, un lot sans migration n'a pas
besoin de la revue préalable.

1. **Cadrage** — écarts entre le lot et le dépôt réel, périmètre confirmé, hors
   périmètre nommé.
2. **Plan technique** — mode Plan, obligatoire avant toute édition.
3. **Exécution** — fichiers du lot seulement ; ne pas élargir.
4. **Validation** — le palier de la classe, sortie redirigée une fois puis relue.
5. **Revue** — `/wn-review`, plus `wn-reviewer` si la classe l'exige.
6. **Clôture** — `/wn-finish` : statut du lot, entrée `SESSION_LOG`, et les deux
   promotions (règle oubliée → exécutable, décision → `docs/DECISIONS.md`).
7. **PR** — `/wn-pr` puis `/wn-merge`, selon le régime de `CLAUDE.md`.

## Sortie de la proposition (mode par défaut)

1. Lot retenu, campagne, et son but en une phrase.
2. **Écarts constatés** entre le lot et le dépôt réel — ou « aucun », dit explicitement.
3. Classe retenue et les fichiers qui l'ont déterminée.
4. Décisions qui en découlent : modèle, palier, revue, garde-fous applicables.
5. Séquence numérotée, une étape par ligne, avec son modèle.
6. Ce qui exigera une confirmation distincte, et à quelle étape.
7. Ce que cette séquence évite de recharger.
8. **Demande d'acceptation explicite** — et rien d'autre. Ne pas enchaîner.
