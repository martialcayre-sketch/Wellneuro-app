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

Politique de coût, appliquée sans la réexpliquer : **`haiku` pour localiser et lire,
`sonnet` pour écrire, `opus` seulement là où un faux verdict coûte cher.** Monter en
modèle sur une étape de lecture est le gaspillage le plus courant ; descendre sur une
revue clinique est le plus cher.

## Ce que ce pilote ne mesure pas — et ne prétendra pas mesurer

**Aucun compteur de tokens n'est accessible depuis un skill.** Ce pilote économise en
réduisant ce qui est chargé et le nombre d'allers-retours, pas en pilotant un budget.

Ne jamais afficher un « coût estimé » chiffré : ce serait un nombre sans source. Ce
qui se dit honnêtement, et se compte vraiment : le nombre d'étapes, les délégations
prévues, le palier de test retenu, et ce qui a été **évité** (contexte non rechargé,
palier non élargi).

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
