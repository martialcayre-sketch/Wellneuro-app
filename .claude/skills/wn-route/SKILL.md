---
description: Routage manuel d'une demande — modèle, effort, mode d'exécution. Le défaut de session (Sonnet 5 + effort high + solo) est porté par CLAUDE.md ; n'invoquer ce skill que pour re-router explicitement une demande.
argument-hint: "[demande]"
disable-model-invocation: true
effort: low
---

# WellNeuro — routeur

Demande : `$ARGUMENTS`

Règle unique :

- **Défaut : Sonnet 5 + effort high + solo.** Sinon ne rien faire ni commenter.
- Risque critique (sécurité, auth, migration/Prisma, clinique/scoring, revue
  critique, bug résistant) : **Opus**.
- Difficulté conceptuelle exceptionnelle — au moins deux signaux forts
  (architecture transverse, arbitrage difficile entre solutions plausibles,
  cause racine introuvable après investigation sérieuse, décision engageant
  plusieurs lots) : **Fable**.
- Largeur réellement parallélisable (≥ ~5 unités indépendantes, exhaustivité
  demandée, échelle > un contexte) : **Ultracode** — opt-in explicite requis ;
  c'est un mode d'exécution, jamais une autorisation.
- Profondeur **et** largeur exceptionnelles simultanées : Fable + Ultracode.

Un override nommé par l'utilisateur (modèle, `ultracode`/`leger`/`solo`, skill
`/wn-*`) prime sur la règle. <!-- mention-seule: wn -->

Sortie — uniquement si la décision dévie du défaut : une ligne
(modèle/effort/mode + raison) et la commande exacte (`/model …`, délégation
`Agent(...)`, ou invitation à opter `ultracode`). Ce skill n'autorise ni
migration, ni écriture Supabase, ni changement clinique. Tables détaillées :
`/wn` (routes), `/wn-model` (modèles), `/wn-ultra` (modes) — à taper par <!-- mention-seule: wn, wn-model, wn-ultra -->
l'utilisateur.
