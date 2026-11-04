# Handoff — file D, d56 rédigée (D-438) ; d58 arbitrée en partie, en attente d'un audit

## Branche et état Git

- Branche : `feat/file-d-d58-familles-mesure`, dans le worktree
  `file-d1-suite`. Elle part de `origin/main` à 57f7d2f3.
- D-438 est réservée (`refs/tags/reserve/D-438`). D-437 est prise par une
  autre session.
- #1848 (D-436, d60) est mergée (42c99349) et déployée : déploiement Scalingo
  « success », lancé le 2026-11-04 à 08:39:56 UTC. La ligne d60 de la page de
  suivi porte la date de bascule.

## Objectif

- d56 : rédiger la décision de l'entrée de l'Epworth et du MFI-20 dans le
  groupe `repos` du besoin 5.
- d58 : soumettre le registre des familles de mesure de `DC-29`, puis
  rédiger sa décision.

## Décisions prises

- **D-438 (d56)**. Le responsable a arbitré le 2026-11-03, puis deux points
  le 2026-11-04 :
  - normalisation de l'Epworth : (24 − score)/24 ;
  - GEN d'origine maintenu, malgré la structure française à quatre
    dimensions de Gentile 2003 ; ce fait est consigné comme limite.
- **d58**. Arbitré le 2026-11-04 :
  - dépendance inconnue entre deux sources = même famille ;
  - discordance : on compte les familles concordantes, et la discordance
    sort en constat séparé ;
  - les drapeaux d'anamnèse forment une famille distincte.
- **d58, en attente** : la famille AUTO forme-t-elle une seule famille, ou
  une par instrument ? Le responsable l'a renvoyée à un audit complet de
  l'orientation actuelle, à mener dans une autre session (« la grille de
  lecture WellNeuro 6 a trop évolué »). Aucune D-xxx pour d58 avant cet
  audit.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-438, en tête.
- `changelog.d/2026-11-04-d438-epworth-mfi20-repos.md`
- ce handoff.

## Validations exécutées

- T1 rapide (`npm --prefix web run check:rapide`) : code 0.
- Résumés de Kaminska 2010 (PMID 20422065) et de Gentile 2003
  (PMID 12641557) lus sur Europe PMC le 2026-11-04. Les textes intégraux
  n'ont pas été lus.

## Problèmes ouverts

- **d58** : l'audit de l'orientation reste à ouvrir dans une autre session.
  Ensuite, il faudra trancher la famille AUTO, puis écrire la D-xxx qui
  amende D-103 et D-041.
- Le registre soumis porte encore des « ? » : Q_GEO_03 et Q_GEO_05 sont
  codés « clinicien » mais leur consigne vise un proche ; PHYSIO compte-t-il
  une famille ou deux, selon la source ? Restent aussi à relever la MADRS,
  le Zarit et les instruments `CAB_*`. Le détail est sur la ligne d58 de la
  page de suivi.
- **d56** : lot d'application à venir. Il porte `BESOIN_SOURCES` avec la
  borne basse de GEN, les niveaux, `instrument_registry.json`, le changement
  de version et la réapprobation (b27, J3-12f).
- **d59** : le code de D-433 part dans le lot de la file A, avec D-430 §6.

## Prochaine action exacte

1. Ouvrir la PR de D-438, attendre le CI en fond, puis déclarer
   « prête @<sha> ».
2. Mettre à jour la ligne d56 de la page « Suivi de la file D ».

## Interdits encore actifs

- Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ;
  ni migration ni `schema.prisma` ; aucune écriture en production.
- Aucune valeur, aucun seuil ni aucune source proposés par la session
  (DC-20). Aucune D-xxx sans arbitrage du responsable.
- Un assistant externe n'est jamais la source d'une valeur. Aucun
  identifiant Drive dans le dépôt.
- Aucun UPDATE du contenu d'une passation (LOT-00).
- Essai de D-373 : déclarer « prête », ne pas merger.
