### D-287, D-288, D-289 : décisions d'ordre, une activation à la fois, essai de restauration (lettres a, b, g, PR S-3, 2026-10-14)

- **Documentation seule, aucun code** : la production ne change pas ; aucune
  migration, aucun drapeau, aucune règle clinique ni seuil, aucune activation,
  aucun compte ouvert.
- `docs/DECISIONS.md` : trois décisions du plan unique, acceptées par le
  responsable le 2026-10-14, telles quelles, et portées ensemble par la PR S-3
  (rang 0) ; elles lèvent la porte 2.
- D-287 (lettre a, fiche F01) : deux files de code en parallèle (A cosmétique
  et noyau, B biologie structurelle), sous une règle de non-collision ; l'ordre
  se lit au plan ; le pilotage y renvoie, déjà réaligné par #1420 ; la file B
  s'ouvre par BP-07.
- D-288 (lettre b, fiche H05) : une activation patient à la fois, un constat
  sur un vrai dossier entre chacune (porte 18) ; places 1 à 5 jamais
  permutées ; au-delà de la place 11, l'encart de conduite passe devant ;
  formulaire de sécurité de D-281 hors file ; second compte praticien fermé
  jusqu'au 2027-10-11, puis levée par D-xxx seulement.
- D-289 (lettre g, fiche F04) : un essai de restauration réussi précède toute
  migration qui suit BP-09 ; procédure : sauvegarde de l'hébergeur restaurée
  dans une base temporaire du périmètre HDS, jamais sur la production ni sur
  un poste, contrôles en agrégats, base supprimée le jour même.
