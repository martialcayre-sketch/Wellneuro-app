---
description: Point d'entrée automatique WellNeuro — combine route (/wn), modèle (/wn-model) et mode d'exécution (/wn-ultra) en une décision unique, appliquée en début de session ou juste après /clear, avec le plan hiérarchisé d'agents/skills à appeler.
argument-hint: "[demande de l'utilisateur]"
disable-model-invocation: true
effort: low
---

# WellNeuro — routeur de session

## Contexte

!`git status --short`
!`test -f docs/claude/SESSION_LOG.md && tail -n 20 docs/claude/SESSION_LOG.md || true`
!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`
!`cat .claude/skills/wn/SKILL.md 2>/dev/null`
!`cat .claude/skills/wn-model/SKILL.md 2>/dev/null`
!`cat .claude/skills/wn-ultra/SKILL.md 2>/dev/null`

Demande : `$ARGUMENTS`

## Rôle

`wn-route` ne remplace ni `/wn`, ni `/wn-model`, ni `/wn-ultra` — il les combine en une
seule passe au lieu de trois invocations séquentielles. Ces trois skills restent
utilisables séparément en cours de session pour re-router explicitement. `wn-route`
sert au tout premier passage : démarrage de session, ou juste après `/clear`, avant de
traiter la première demande — une fois par session, pas à chaque message.

Ne jamais interpréter ce skill comme une autorisation de migration, d'écriture
Supabase, de déploiement ou de modification clinique : les garde-fous restent ceux de
`CLAUDE.md`, pas ceux de ce skill.

## Décision

À partir de la demande et des trois grilles chargées ci-dessus en contexte, produire en
une passe :

1. **Route** — quel skill ou agent principal traite la demande (grille `/wn`).
2. **Modèle** — alias `/model`, effort, mot-clé de réflexion (grille `/wn-model`).
3. **Mode d'exécution** — solo / multi-agent léger / ultracode (grille `/wn-ultra`).
4. **Séquence**, seulement si plus d'une étape est nécessaire — ordre des appels
   (agent puis skill, skill puis revue, etc.), avec le modèle de chaque étape.

Un override explicite de l'utilisateur (modèle nommé, `ultracode`/`leger`/`solo`, ou
skill `/wn-*` précis) prime sur toute grille.

## Règle d'économie — sortie courte par défaut

La majorité des demandes tombent sur le défaut : route = traitement direct, modèle
Sonnet, solo, aucune délégation. Dans ce cas, **appliquer sans l'afficher**. N'afficher
le routage que s'il change quelque chose d'observable :

- changement de modèle recommandé (`opus`, `haiku`, `fable`) ;
- délégation à un sous-agent, ou déclenchement d'un skill spécialisé ;
- mode d'exécution autre que solo ;
- un garde-fou de `CLAUDE.md` s'applique (migration, Supabase, auth, clinique).

Une demande conversationnelle simple (question directe, sans tâche ni changement de
code) ne justifie jamais un plan affiché.

## Sortie (uniquement si non par défaut)

1. Nature détectée (une phrase).
2. Décision : route + modèle/alias/effort/réflexion + mode d'exécution, sur une seule
   ligne si possible.
3. Séquence hiérarchisée si plusieurs étapes (numérotée, un agent/skill par ligne,
   modèle inclus).
4. Garde-fous applicables (seulement ceux qui s'appliquent réellement à cette demande).
5. Commande(s) exactes à exécuter, ou instruction explicite de passage en mode Plan si
   des edits sont envisagés.
