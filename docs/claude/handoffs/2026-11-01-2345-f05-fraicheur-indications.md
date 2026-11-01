# Handoff — 2026-11-01 — F05, Q1 : la table des indications de biologie au contrat de fraîcheur (D-419)

## Branche et état Git

`f05-fraicheur-indications`, partie d'`origin/main` d012c17d, worktree
`.claude/worktrees/f05-structure`. D-419 réservée. #1816 (D-416, chemins de
la release-db) est ouverte en parallèle et indépendante. Aucune migration,
aucun `schema.prisma`.

## Objectif

Fermer le trou relevé par la revue `wn-reviewer` de #1816 (question Q1) : les
vingt-neuf claims épinglés par `indicationsBiologieV1.ts`, signée le
2026-09-16, n'étaient gardés par aucun contrat de fraîcheur.

## Décisions prises

- D-419, sur deux arbitrages du responsable du 2026-11-01 au soir :
  - le lot se fait maintenant, dans la session F05 ;
  - `exige_prescriptif = false` (D-046), parce que deux claims descriptifs
    sont dans le périmètre signé.
- Cas `N15` sur `WN-CL-0389-004`, que seule cette table épingle.
  `WN-CL-0312-018` a été écarté : `conflits_sources` l'épingle aussi.

## Fichiers modifiés

- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` : vingt-neuf
  paires et une entrée de journal.
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1_negatif.sql` :
  - les mêmes paires, au prédicat et dans les fixtures ;
  - le cas `N15` ;
  - l'en-tête et le NOTICE.
- `web/src/lib/clinical/claimsEpinglesFraicheur.guard.test.ts` : racine
  `biology-library/`, correspondance des fichiers, exigence par table.
- `docs/DECISIONS.md` (D-419), fragment
  `changelog.d/2026-11-01-d419-fraicheur-indications-biologie.md`, ce
  handoff.

## Validations exécutées

- Relecture en production des vingt-neuf paires, dans un conteneur détaché en
  lecture seule (`one-off-5853`) :
  - 29/29 `VALIDE`, actifs, non remplacés, `v1.0` ;
  - deux claims non prescriptifs.
- Négatif joué sur Postgres local :
  - fichier sain vert, 15 formes détectées ;
  - mutant qui exempte `indications_biologie` : rouge sur `N15`.
- Vitest : garde de fraîcheur et garde de la table des indications, 21 verts.
- T1 complet et revue : voir la PR.

## Problèmes ouverts

- Après le merge, la release-db est retenue jusqu'à l'approbation du
  responsable (D-044 : le lot touche un banc sous `clinical/`). Son préflight
  rejoue les vingt-neuf paires contre la production. La suivre jusqu'au
  constat.
- Q2, l'ajout de la structure signée aux crochets, part dans une PR à part.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur la tête, puis « prête @<sha » avec l'exception
release-db. Ensuite, suivre la release jusqu'à la sentinelle et au constat.

## Interdits encore actifs

- Aucune retouche d'une table signée sans nouvelle signature, ni de texte
  clinique, de valeur ou de borne de la main de l'assistant.
- Dépôt public : identifiants et mécanismes seulement.
- Ni migration ni `schema.prisma`. Production en lecture seule, par
  conteneur.
