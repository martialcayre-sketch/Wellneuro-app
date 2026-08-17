### Ajouté

- **Les quinze règles d'indication biologique entrent dans la table signée**
  (`D-069`) : douze conditionnelles — dont six en disjonction `D-060` (humeur,
  anxiété, stress, mémoire, digestif, neurodégénératif) —, une optionnelle
  (`WN-CL-0178-055`, seul claim du corpus à qualifier un bilan d'optionnel),
  deux non indiquées aux motifs verbatim. Les zones citent les bandes que
  chaque instrument **publie**, relues une à une dans les grilles : le BMS-10
  se juge sur la moyenne, `Q_INF_05` sur un compte d'items (les zones couleur
  neutralisent ces pièges), MMSE et test des 5 mots sont des échelles
  inversées, le MADRS reste en comparaison `>= 8` (sa grille ne classe ni 7 ni
  19). PSS-10, PSQI et TFD reprennent à l'identique les zones des règles
  signées d'orientation. Répétition annuelle sur les neuf panels de tableau
  clinique de niveau socle (arbitrage F.1 explicite).

- **La signature biologie est réelle** : date ISO du 2026-08-17, les 29 claims
  distincts du périmètre — répétition annuelle comprise (`0312-018`,
  `0389-004` : le seul chiffre paramétrique de la table est dans le périmètre
  signé) (égalité exacte deux sens, tenue par banc),
  `shaPerimetre` en littéral figé. Le verrou à cinq termes est ouvert côté
  signature. `WN_CB_ENABLED`, lui, était **déjà posé** à `true` en production
  — constaté le 2026-08-17 (`D-070`) : les deux termes du ET sont vrais. La
  table signée n'atteint pour autant aucun écran, `deriverStatutsBiologie`
  n'ayant aucun appelant.

- **Les deux réserves de la revue `D-060` sont fermées** : banc d'inertie
  RV-1 — chaque instrument visé, moteur réel saturé, publie ses comptes de
  complétude au grain du porteur visé (un moteur qui cesse de publier rougit
  au CI, pas en production six mois plus tard) — et garde de forme RV-2 de la
  première table du dépôt à porter des « ou » (un panel par règle,
  `signauxAlerte` interdit sous branche, instruments assignables, borne MADRS
  épinglée, codes de panels = ceux de la migration `D-068`).

- Deux limites sont **nommées sur les règles** : la branche IBS-SSS est inerte
  pour un patient répondant « non » à une question filtre de Francis (items
  filtrés comptés manquants, `ou` fail-closed — la jambe TFD sert le panel), et
  les reprises PSS-10/TFD perdent sous « ou » le déclenchement par plancher
  garanti que la feuille simple du PSQI conserve (`D-060` §6, assumé).

- Les sentinelles « table vide » et « signature incomplète » sont inversées,
  jamais supprimées : une dé-signature, une date malformée, un sha qui ne
  concorde plus ou une règle retouchée sans re-signature font rougir le CI.
