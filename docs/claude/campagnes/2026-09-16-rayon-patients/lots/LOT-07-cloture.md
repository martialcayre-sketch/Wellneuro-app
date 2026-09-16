---
id: "LOT-07"
titre: "Clôture"
statut: "terminé (2026-09-17)"
dépend_de: "tous"
---

# LOT-07 — Clôture

## But

Fermer la campagne sur ce qu'elle a réellement livré, et constater l'usage
plutôt que le supposer.

## Périmètre

- Fragments `changelog.d/` — titre `###` fini par « (2026-09-…) ».
- Décisions au registre, numéros pris **au merge** et jamais réservés d'avance.
- `FILE_ATTENTE.md`, `CAMPAGNE.md`, `SESSION_LOG.md`.
- `docs/checklist_tests_end_to_end.md` (l. 17, 52, 57, 101) — la recette
  manuelle fait créer un patient depuis `/dashboard/patients` puis vérifie sur
  ce même écran « tableau patients, panneau édition, tableau assignations ».
  Deux de ces trois ont déménagé.
- `wn-campaign deactivate` — sans lui, l'état machine continue de désigner une
  campagne close comme active.

## Contre-revue adverse

**Avant la clôture, jamais après** (patron `D-108`). Les affirmations à soumettre
sont celles que la campagne s'apprête à graver, pas ses lignes de code.

## Constat d'usage

Par one-off Scalingo détaché, commande aplatie sur une ligne, sans heredoc :
combien de dossiers portent une fiche signalétique et une anamnèse réellement
lisibles, et combien portent une adresse ou un médecin traitant.

Le chiffre mesure un état, pas une réussite — `D-112` a établi qu'un appareil
complet peut n'avoir jamais servi.

## Done

- Audit de campagnes vert avec **la commande exacte du CI** — son vocabulaire de
  statuts clos est étroit, et « clos » n'en fait pas partie.
- La file d'attente dit ce qui reste au responsable.
