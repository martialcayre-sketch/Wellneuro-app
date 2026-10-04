### Lettre d'adressage remise au patient — l'écran du portail ([[D-262]], LOT-03a) (2026-10-04)

- Écran « Courrier pour votre médecin » (`/portail/[token]/courrier-medecin`) :
  la phrase d'accompagnement signée, puis le texte de la lettre tel qu'il a été
  remis, et un bouton d'impression (l'impression ne garde que la lettre).
- Route `GET /api/portail/lettre-adressage` (session portail, drapeau d'abord,
  `?interrupteur=1` pour le lien de l'accueil) ; la remise la plus récente est
  servie, « retirée » sans texte ni motif si la lettre a été révoquée depuis, «
  indisponible » si son empreinte ne correspond plus.
- Espèce de lecture `lettre_adressage` au fil du jour, acquittée à l'affichage
  du texte ; lien « Courrier pour votre médecin » dans « Autres espaces ».
- Tout reste derrière `WN_LETTRE_ADRESSAGE_PATIENT`, **éteint** : il ne
  s'allume pas avant l'aperçu de la lettre au praticien (LOT-03b).
