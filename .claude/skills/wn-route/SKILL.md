---
description: Point d'entrée automatique WellNeuro — combine route (/wn), modèle (/wn-model) et mode d'exécution (/wn-ultra) en une décision unique, appliquée en début de session ou juste après /clear, avec le plan hiérarchisé d'agents/skills à appeler. À n'invoquer qu'UNE FOIS, au tout premier passage d'une session — jamais sur les messages suivants, qui sont déjà routés.
argument-hint: "[demande de l'utilisateur]"
# EXCEPTION DÉLIBÉRÉE — ne pas rétablir `disable-model-invocation: true` ici.
# Les 27 autres skills `wn` le portent ; celui-ci est le seul à en être exempt,
# parce que `CLAUDE.md` demande de l'invoquer sans qu'on le tape, au tout premier
# passage d'une session. Le drapeau rendait cette consigne inapplicable : elle n'a
# jamais pu s'exécuter une seule fois depuis qu'elle est écrite. Uniformiser la
# suite `wn` sur ce point la remettrait en panne, silencieusement.
effort: low
---

# WellNeuro — routeur de session

## Contexte

!`git status --short`
!`test -f docs/claude/SESSION_LOG.md && tail -n 20 docs/claude/SESSION_LOG.md || true`
!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`

Demande : `$ARGUMENTS`

## Rôle

`wn-route` combine `/wn`, `/wn-model` et `/wn-ultra` en une passe au lieu de trois
invocations. Il sert au **tout premier passage** — démarrage de session ou juste après
`/clear` —, une fois par session, pas à chaque message. Les trois skills restent
invocables séparément pour re-router en cours de route.

Ne jamais interpréter ce skill comme une autorisation de migration, d'écriture
Supabase, de déploiement ou de modification clinique : les garde-fous restent ceux de
`CLAUDE.md`.

## Les grilles ci-dessous sont des résumés — les complètes coûtent et attendent

Ce fichier portait les trois grilles **en entier**, chargées par `cat` à chaque
démarrage : ~2 700 tokens payés avant même de savoir si la demande justifiait un
routage, alors que la règle d'économie plus bas dit que la plupart tombent sur le
défaut. On payait la grille pour découvrir qu'on n'en avait pas besoin.

Les condensés suffisent aux cas courants. **Dès qu'une demande ne tombe dans aucune
ligne, invoquer la grille complète** — `/wn`, `/wn-model` ou `/wn-ultra` — plutôt que
de trancher au jugé. C'est le seul cas qui justifie de la charger.

### Route — la demande vers son skill

| La demande… | Route |
|---|---|
| est trop floue pour qu'on sache ce qui aura changé une fois faite | `/wn-reprompt`, **avant** de router |
| cadre une tâche avant de coder | `/wn-plan` |
| ouvre une série de développements | `/wn-campaign` |
| reprend un lot de campagne | `/wn-lot` (pilote complet) ou `/wn-campaign-run` |
| signale un bug ou une erreur | `/wn-debug` |
| demande de valider | `/wn-test` |
| demande une revue de diff | `/wn-review` |
| ouvre ou termine une PR | `/wn-pr` puis `/wn-merge` |
| porte sur la documentation | `/wn-docs` ; multi-dépôts : `/wn-hygiene` |
| porte sur les fichiers de règles ou les définitions d'agents | `/wn-conventions` |
| apporte un contenu d'instructions IA tiers | `/wn-tiers` |
| clôt un lot | `/wn-finish` |
| reprend le contexte (affichage seul) | `/wn-context` |
| écrit un document de reprise | `/wn-handoff` |
| compacte le journal | `/wn-compact-sessionlog` |

Préférer audit, plan et test avant développement. Si des edits sont envisagés, imposer
explicitement le passage en mode Plan.

**Reformuler avant de router — mais rarement.** Une demande qu'on ne peut pas router
sans deviner passe d'abord par `/wn-reprompt` : contexte isolé, sortie ≤ 180 mots. Un
tour de reformulation coûte moins que les tours de rattrapage d'un routage à côté. Le
test est celui du skill et il est falsifiable : **si deux lectures de la demande mènent
au même diff, router directement.** Le défaut reste donc « pas de reformulation » — un
reformulage inutile dépense exactement ce qu'il prétend économiser.

### Modèle — contexte vers couple modèle/effort

| Contexte | Alias | Effort | Réflexion |
|---|---|---|---|
| Refonte transverse, raisonnement long-cours | `fable` | high | `think hard` |
| Débogage, revue, clinique, sécurité | `opus` | high | `think hard` |
| Développement courant, docs, cadrage | `sonnet` | medium | `think` |
| Exploration, reprise de contexte, routage | `haiku` | low | — |

La ligne `fable` (`/model claude-fable-5`) ne se prend pas par défaut : c'est le
modèle le plus coûteux — **$10/$50 par MTok, deux fois Opus** — et il ne se
justifie que si la tâche tient sur plusieurs heures ou traverse tout le dépôt.
Sur un lot ordinaire, `opus` suffit.

Overrides nommables par l'utilisateur : `fable`, `opus`, `sonnet`, `haiku`,
`plan` (`/model opusplan`). Déléguer à un sous-agent `wn-*` bascule de modèle : ils
sont déjà épinglés.

### Délégation — le seul réflexe qui change la dépense

Avant de lire plus de deux ou trois fichiers **soi-même**, déléguer à
`wn-explorer` (ou à l'agent adapté). Son contexte est jeté à la fin ; ce qu'il
lit n'est jamais repayé, alors qu'un fichier lu dans la session est relu à
chaque tour suivant. Mesuré le 2026-08-01 : **28 fois moins cher par appel**.

Ce qui remonte est la conclusion, pas les fichiers. Voir `CLAUDE.md`,
« Économie de contexte ».

### Mode d'exécution — solo par défaut

| Situation | Mode |
|---|---|
| Aucun signal fort de largeur ni de confiance critique | **Solo** (défaut) |
| Un seul axe borné : largeur modérée, ou une passe de vérification indépendante | **Multi-agent léger** — réutiliser une brique existante |
| Plusieurs signaux : ≥ ~5 unités parallélisables, exhaustivité demandée, échelle > un contexte, **et** enjeu où un faux résultat coûte cher | **Ultracode** |

Ultracode exige un **opt-in explicite** (mot-clé `ultracode`, réglage de session, ou
demande de Workflow). Sans opt-in : ne rien lancer, proposer. C'est un mode
d'exécution, jamais une autorisation.

## Décision

Produire en une passe : **route**, **modèle**, **mode**, et une **séquence** seulement
si plus d'une étape est nécessaire (ordre des appels, modèle de chaque étape).

Un override explicite de l'utilisateur — modèle nommé, `ultracode`/`leger`/`solo`, ou
skill `/wn-*` précis — prime sur toute grille.

## Règle d'économie — sortie courte par défaut

La majorité des demandes tombent sur le défaut : traitement direct, Sonnet, solo,
aucune délégation. Dans ce cas, **appliquer sans afficher**. N'afficher le routage que
s'il change quelque chose d'observable :

- modèle autre que Sonnet ;
- délégation à un sous-agent, ou déclenchement d'un skill spécialisé ;
- mode autre que solo ;
- un garde-fou de `CLAUDE.md` s'applique (migration, Supabase, auth, clinique).

Une question conversationnelle ne justifie jamais un plan affiché.

## Sortie (uniquement si non par défaut)

1. Nature détectée (une phrase).
2. Décision : route + modèle/effort/réflexion + mode, sur une ligne si possible.
3. Séquence hiérarchisée si plusieurs étapes (un agent/skill par ligne, modèle inclus).
4. Garde-fous qui s'appliquent réellement à cette demande.
5. Commande(s) exactes, ou instruction de passage en mode Plan si des edits sont
   envisagés.
