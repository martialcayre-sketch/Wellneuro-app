### BP-13 : la clôture du dossier se relit sous le verrou (D-335, 2026-10-23)

- Écriture d'une donnée physiologique ou d'un traitement (routes praticien
  et portail, drapeau `WN_PHYSIO_TRAITEMENTS` toujours éteint) : la clôture
  du suivi se relit dans la transaction, après le verrou du dossier. Celle
  que la route lit avant ne couvrait pas une clôture posée entre-temps ;
  le refus rendu est le même (`dossier_cloture`, 409, message du dossier
  clos). Même trou que celui que la revue CodeRabbit a trouvé sur BP-15
  (#1650), corrigé de la même façon, sur arbitrage du responsable.
