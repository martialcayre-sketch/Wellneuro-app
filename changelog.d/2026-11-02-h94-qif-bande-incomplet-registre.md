### File A, H94 : le QIF incomplet perd sa bande, le QIF entre au registre de comparaison (D-428, D-429, 2026-11-02)

- **QIF, recueil incomplet (D-428).** Dès qu'une question manque au sens
  de D-421 (`missing` > 0 ; un sous-item de l'item 1 retiré, quand un
  autre est noté, n'en est pas une), le moteur ne sert plus de bande
  d'interprétation (modèle D-014). Le total reste celui d'avant : partiel
  si seules des EVA manquent, `null` si une composante entière manque. Avant, une EVA manquante tirait le
  total vers le bas sous une bande calibrée sur la forme complète, et une
  valeur non numérique tombait dans la bande « Maximum théorique ». La
  correction 10/x de Bennett 2005 n'est pas appliquée. La bande du zéro
  exige toujours les vingt questions. Q13 et Q14 vides restent un recueil
  sans total.
- **D-421 §3 amendé.** Le retrait de Q13 et Q14 pour une personne qui ne
  travaille pas est propre à la version originale du FIQ ; depuis 1997, le
  travail inclut les tâches ménagères (Bennett 2005, relu sur le PDF).
- **QIF au registre (D-429).** Le cockpit compare deux passations du QIF,
  sur 100, dès lors que les deux datent du 2026-11-03 ou après : premier
  jour entier après le déploiement constaté de D-421, dont le compte de
  complétude manque aux passations antérieures. L'écart s'exprime en
  points, sans bande. Aucune migration, aucune écriture en base.
