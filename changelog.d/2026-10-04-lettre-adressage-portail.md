### Lettre d'adressage remise au patient — l'écran du portail ([[D-262]], LOT-03a) (2026-10-04)

- Écran « Courrier pour votre médecin » (`/portail/[token]/courrier-medecin`) :
  la phrase d'accompagnement signée, puis le texte de la lettre tel qu'il a été
  remis, et un bouton d'impression (l'impression ne garde que le corps de la
  lettre ; le rendu `medecin`, avec en-tête et nom du patient, vient au LOT-03b).
- Route `GET /api/portail/lettre-adressage` (session portail, drapeau d'abord,
  `?interrupteur=1` pour le lien de l'accueil) ; la remise la plus récente est
  servie, « retirée » sans texte ni motif si la lettre a été révoquée depuis, «
  indisponible » si son empreinte ne correspond plus.
- Espèce de lecture `lettre_adressage` au fil du jour, acquittée à l'affichage
  du texte ; lien « Courrier pour votre médecin » dans « Autres espaces ».
- Tout reste derrière `WN_LETTRE_ADRESSAGE_PATIENT`, **éteint** : il ne
  s'allume pas avant le LOT-03b (aperçu de la lettre au praticien, impression
  par le rendu `medecin`) et l'arbitrage de la question Q-L1.
