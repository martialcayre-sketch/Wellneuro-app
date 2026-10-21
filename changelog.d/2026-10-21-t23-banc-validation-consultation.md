### Tests : seule la route de validation du portail valide une consultation (t23, D-107)

- La lecture de la consultation qui fait foi (`whereConsultationPorteuse`)
  exige une anamnèse non nulle parce que rien au schéma n'impose qu'une
  consultation validée en porte une : seul `api/portail/valider` pose
  `anamnese`, `statut` et `dateValidation` dans le même `update`. Un banc de
  code (`consultationPorteuse.ecritures.guard.test.ts`) garde désormais ce
  fait : aucune autre écriture de `consultation` dans `web/src` ne pose
  `'validee'` ni `dateValidation`, ni un statut illisible ou un objet étalé ;
  aucune écriture imbriquée ni SQL brut ; contre-épreuves du détecteur.
  Arbitrage du 2026-10-21 : banc, pas de contrainte en base. Limite déclarée :
  le seed, les scripts hors `src` et le SQL manuel lui échappent. Aucun code
  applicatif, aucune règle clinique touchés.
