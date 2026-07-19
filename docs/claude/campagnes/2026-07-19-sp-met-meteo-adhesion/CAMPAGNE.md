---
id: "2026-07-19-sp-met-meteo-adhesion"
titre: "SP-MET — Météo d'adhésion"
statut: "cadrée"
créée_le: "2026-07-19"
mise_à_jour: "2026-07-19"
lot_courant: "LOT-01"
---

# SP-MET — Météo d'adhésion

## Objectif

Donner au praticien un **signal d'adhésion à trois états** — régulière,
fragile, interrompue — dérivé des points d'étape J7/J14/J21 déjà collectés, et
**toujours accompagné de la cause observable** qui le motive.

Ce signal existe pour ouvrir une conversation (« qu'est-ce qui a rendu la
semaine difficile ? »), pas pour noter le patient. Il n'est jamais affiché
côté patient, et n'est jamais un score.

## Frontières

**Possède** : la dérivation de l'agrégat trois états, la formulation de sa
cause observable, son affichage dans le poste de pilotage (phase Suivi), et
son état d'abstention (« indéterminée ») quand les données ne suffisent pas.

**Consomme** : `ProtocolCheckin.reponses` — les quatre réponses fermées
`adhesion`, `tolerance`, `energie`, `sommeil` définies dans
`web/src/lib/protocol/checkinDomain.ts:41-79`, et les fenêtres J7/J14/J21 ±3 j
déjà calculées à la volée.

**Ne possède pas** : les **constats déterministes par point d'étape**, qui
restent entièrement C2B (frontière **A8-4** : « aucun pré-agrégat en C2B », et
symétriquement aucun constat par point d'étape en SP-MET) ; toute diffusion
patient ; tout pourcentage d'observance ; le cabinet apprenant (**SP-CAB**, qui
seul porte les repères de cohorte sous `n ≥ 5`).

## Décisions actées

- **Calculé à la lecture, jamais persisté** : aucun champ agrégé n'est stocké,
  donc **aucune migration**. Le schéma interdit d'ailleurs doctrinalement d'en
  faire un jalon ou un score (`web/prisma/schema.prisma:733-734`, arbitrage A1).
- **Praticien seul** — invariant vérifié par test : aucune route
  `/api/patient/*` ni `/api/portail/*` ne l'expose.
- **Jamais un score, jamais un pourcentage** : trois états nommés, et rien
  d'autre. Aucun classement de patients.
- Le statut n'est **jamais porté par la seule couleur** : texte + icône.
- **Abstention honnête** : sans point d'étape exploitable, l'état est
  « indéterminée » — jamais « interrompue » par défaut. Une absence de réponse
  n'est pas une preuve d'abandon.
- La cause observable est **citée**, jamais interprétée : on rapporte la
  réponse du patient, on n'en infère pas un motif.

## Dépendances

C2A ✓ (`ProtocolCheckin` en production). La campagne **JA** enrichira plus tard
la matière observable ; SP-MET ne l'attend pas pour livrer sur les points
d'étape.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-01 | Dérivation trois états + cause observable citée + affichage praticien (phase Suivi) — **sans migration** | à_faire | — |

## Définition de done

- Le signal apparaît côté praticien avec sa cause, et **nulle part** côté
  patient (vérifié par le portail et par test).
- L'abstention est visible et distincte de « interrompue ».
- Aucun agrégat n'est écrit en base.
- Vérifications : anti-secrets, type-check, lint, Vitest, E2E (`test:worktree`).
