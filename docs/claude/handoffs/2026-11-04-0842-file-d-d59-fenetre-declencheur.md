# Handoff — file D, d59 : fenêtre de fraîcheur du déclencheur (D-433)

## Branche et état Git

- Branche : `docs/file-d-d59-fenetre-declencheur`, dans le worktree
  `file-d1-suite`.
- Base : `origin/main` à 1cb4b642, par avance `--ff-only`.
- #1839 (d57, D-431) est mergée (fb7068e5).

## Objectif

Inscrire D-433 : la fenêtre de fraîcheur du questionnaire qui déclenche une
règle d'orientation (d59). C'est une décision seule, sans code.

## Décisions prises

- D-433, arbitrages du responsable :
  - le 2026-11-03 :
    - un déclencheur prend la fenêtre de son instrument (registre de D-430) ;
    - un signal expiré est « non évalué », avec un motif visible ;
    - le jour anniversaire reste frais ;
    - sans horloge, le moteur se comporte comme avant ;
  - le 2026-11-04, quatre valeurs sans source : `Q_MOD_01` 21 jours,
    `Q_MOD_03` 14, `Q_INF_03` 14, `Q_ALI_01` 90.
- Rapport de recherche approfondie de l'assistant externe : il n'est source
  d'aucune valeur. Ses références ont été vérifiées par la session et sont
  consignées au §7 de D-433. Trois ont été écartées faute de lecture :
  Godwin 2008, NCI, AHRQ. Aucun lien Drive n'entre dans le dépôt.
- Aucune notice au registre du corpus : les références sont des faits de
  contexte, cités avec leur PMID ou PMC.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-433, insérée entre D-434 et D-432.
- `changelog.d/2026-11-04-d433-fenetre-declencheur.md`
- ce handoff.

## Validations exécutées

- `git ls-remote` : `refs/tags/reserve/D-433` existe, D-433 est donc
  réservée.
- Les références de D-433 §7 ont été vérifiées contre leur source :
  métadonnées PubMed, et passages relus sur les résumés ou les textes
  intégraux d'Europe PMC, ainsi que sur la page NICE NG222.
- Aucun code touché ; le CI de la PR fait foi.

## Problèmes ouverts

- **d60** (HAD, « semaine écoulée ») : arbitrée. Une question reste en
  suspens : l'ancienne consigne se mentionne-t-elle dans la décision
  seulement, ou aussi à l'écran ? D-434 est désormais prise (re-signature
  B9/B12) : réserver un numéro neuf.
- **d58** : le registre des familles de mesure est à rédiger et à soumettre
  au responsable.
- **d56** : vérifier les validations françaises (Kaminska 2010, Gentile 2003),
  puis rédiger la D-xxx.
- **Limite consignée dans D-433 §7** : les deux consignes de `Q_ALI_01` ne
  sont pas versionnées. Ce point n'est pas arbitré.
- Le libellé du motif « non évalué » se soumet au responsable dans le lot de
  code de la file A.

## Prochaine action exacte

1. Attendre le CI de la PR de D-433 et déclarer « prête @<sha> ».
2. Mettre à jour la page « Suivi de la file D » (ligne d59).
3. Reprendre d60.

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ;
  ni migration ni `schema.prisma` ; aucune écriture en production.
- Aucune valeur, aucun seuil ni aucune source proposés par la session
  (DC-20). Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais source d'une valeur. Aucun identifiant
  Drive dans le dépôt.
- Aucun UPDATE du contenu d'une passation (LOT-00).
- Essai de D-373 : déclarer « prête », ne pas merger.
