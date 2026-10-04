### Lettre d'adressage remise au patient — l'émission au clic de diffusion ([[D-262]], LOT-02) (2026-10-04)

- Au clic « Valider pour diffusion », dans la transaction de l'approbation, la
  lettre d'adressage ACTIVE la plus récente du dossier est recopiée (texte et
  empreinte) dans `lettres_adressage_remises` : seulement sous un protocole
  ouvert par l'orientation vers le médecin, et pas quand les fiches sont
  bloquées pour le dossier (dossier clos, contrat patient refusé).
- Une remise refusée par la base (lettre révoquée entre-temps) est annulée seule
  par un point de sauvegarde : l'approbation et les fiches aboutissent.
- Une lettre remise réserve l'e-mail neutre `document_remis` — une annonce par
  clic, fiches et lettre confondues.
- Derrière `WN_LETTRE_ADRESSAGE_PATIENT`, **éteint** ; il ne s'allume pas avant
  l'écran du portail (LOT-03). Éteint, le clic est inchangé.
- Migration `lettres_adressage_remises_v1` appliquée en production le
  2026-10-04 (LOT-01, #1300).
