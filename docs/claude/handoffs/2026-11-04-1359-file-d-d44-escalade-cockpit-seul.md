# Handoff — file D, d44 : un conflit de sources escaladé reste au cockpit (D-441)

## Branche et état Git

- Branche : `feat/file-d-d44-escalade-cockpit-seul`, dans le worktree
  `file-d1-suite`. Elle part de `origin/main` avec D-438 en tête.
- D-441 est réservée (`refs/tags/reserve/D-441`). D-439 et D-440 sont en vol
  dans d'autres sessions.
- #1851 (D-438, d56) est mergée.

## Objectif

Rendre l'arbitrage de d44 : l'escalade d'un conflit de sources s'étend-elle
à l'extinction et aux préconditions T0 ?

## Décisions prises

- **D-441** (arbitrages du responsable du 2026-11-04) :
  - le conflit reste au cockpit seul ;
  - la question se rouvre dès qu'un conflit déclaré porte sur un claim
    cité par une règle d'orientation ou d'arrêt ;
  - la trace prend la forme d'une D-xxx courte.
- **d54** (délai avant T0) : renvoyée au cadrage de la carte « dossiers
  bloqués ». Ce cadrage a été décidé ce jour par l'audit 2 (QB option A,
  liste commune 20261104-1302-g) et le seuil de délai s'y arbitre. La ligne
  passe en attente, avec ce renvoi.
- **d23** : soldée par D-435 (#1847), déployée le 2026-11-04.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-441, en tête.
- `changelog.d/2026-11-04-d441-escalade-cockpit-seul.md`
- ce handoff.

## Validations exécutées

- T1 complet (`npm --prefix web run check`) : code 0.
- Faits relus au code avant l'arbitrage :
  - le blocage de toutes les extinctions par une contradiction ouverte
    (`orientationEngine.ts`, garde de `contradictionEstOuverte`) ;
  - `STOP-STR`, seule règle d'arrêt publiée ;
  - aucune règle d'orientation ni d'arrêt ne cite `WN-CL-0312-018` ni
    `WN-CL-0387-013` ;
  - la condition T0 « Aucune contradiction ouverte » est souple ;
  - `preconditionsT0Prisma` appelle le service sans claims cités.

## Problèmes ouverts

- **d58** : la granularité de la famille AUTO attend l'audit de
  l'orientation, demandé à une autre session.
- **d56** : le lot d'application de D-438.
- **d59** : le code de D-433 part dans le lot de la file A.
- **d53** : `WN_AGENDA_RELANCE` se repose le 2026-11-13 ou après.
- Lignes encore ouvertes : d47 (curation de la table de rythme) et les
  gestes d33, d37, d25 et d31.

## Prochaine action exacte

1. Ouvrir la PR de D-441, attendre le CI en fond, puis déclarer
   « prête @<sha> ».
2. Mettre à jour la ligne d44 de la page « Suivi de la file D ».

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ;
  ni migration ni `schema.prisma` ; aucune écriture en production.
- Aucune valeur, aucun seuil ni aucune source proposés par la session
  (DC-20). Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais la source d'une valeur. Aucun
  identifiant Drive dans le dépôt.
- Aucun UPDATE du contenu d'une passation (LOT-00).
- Essai de D-373 : déclarer « prête », ne pas merger.
