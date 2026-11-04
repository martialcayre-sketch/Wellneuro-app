# Handoff — file D, d60 : la HAD porte sur « la semaine écoulée » (D-436)

## Branche et état Git

- Branche : `feat/file-d-d60-had-semaine-ecoulee`, dans le worktree
  `file-d1-suite`.
- Base : `origin/main` à b4ba02a9 (D-433 mergée, #1845).
- D-436 est réservée (`refs/tags/reserve/D-436`). D-435 est en vol dans une
  autre session.

## Objectif

Aligner la consigne et le titre de la section de la HAD (`Q_NEU_11`) sur
« la semaine écoulée ». C'est la ligne d60 de la file D.

## Décisions prises

- D-436, arbitrages du responsable :
  - le 2026-11-03 : l'alignement, l'historique gardé et les libellés du
    contre-avis Codex ;
  - le 2026-11-04 : l'ancienne consigne n'est mentionnée que dans la
    décision, sans signalement à l'écran.
- Aucune étape d'instantané : le bloc `scoring` ne bouge pas.
- Les commentaires de `anthropic.ts` et de
  `promptFenetreRappel.guard.test.ts` restent : ils décrivent la mesure du
  2026-09-14 (D-436 §3).

## Fichiers modifiés

- `web/src/lib/questionnaires/neuropsychologie.ts` : `instructions` et titre
  de la section `AD`.
- `docs/questionnaires-drive-mapping.md` : note sur la ligne `Q_NEU_11`.
- `docs/DECISIONS.md` : D-436, en tête.
- `changelog.d/2026-11-04-d436-had-semaine-ecoulee.md`
- ce handoff.

## Validations exécutées

- `npm run check` (T1 complet) et T2 (`npm run test:worktree -- --fast`) :
  voir la PR. Le résultat y est rapporté tel quel.

## Problèmes ouverts

- **d58** : le registre des familles de mesure est à rédiger et à soumettre
  au responsable.
- **d56** : vérifier les validations françaises (Kaminska 2010,
  Gentile 2003), puis rédiger la D-xxx.
- **d59** : le code de D-433 est dans le lot de la file A, avec D-430 §6.
- **Date de bascule de D-436** : c'est le déploiement constaté. Elle reste à
  relever après le merge, dans la page de suivi seulement.

## Prochaine action exacte

1. Attendre le CI et déclarer la PR « prête @<sha> ».
2. Mettre à jour la page « Suivi de la file D » (ligne d60).
3. Reprendre d58 : le registre des familles de mesure.

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ;
  ni migration ni `schema.prisma` ; aucune écriture en production.
- Aucune valeur, aucun seuil ni aucune source proposés par la session
  (DC-20). Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais source d'une valeur. Aucun identifiant
  Drive dans le dépôt.
- Aucun UPDATE du contenu d'une passation (LOT-00).
- Essai de D-373 : déclarer « prête », ne pas merger.
