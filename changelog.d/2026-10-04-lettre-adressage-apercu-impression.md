### Lettre d'adressage remise au patient — l'aperçu praticien et l'impression ([[D-262]], LOT-03b) (2026-10-04)

- Avant « Valider pour diffusion », le praticien voit le courrier pour le
  médecin traitant qui partira (date de la lettre), ou qu'il est déjà remis, et
  l'e-mail neutre qui suivra. L'identifiant de la lettre due entre dans le
  jeton du clic : une lettre consignée ou révoquée entre l'aperçu et le clic le
  fait refuser, puis l'aperçu est relu — même voie que les fiches d'assiette.
- La version à imprimer du portail (`/api/portail/lettre-adressage/impression`)
  rend le texte figé de la remise par le même rendu `medecin` que la lettre du
  praticien : en-tête, nom du patient, date, cadre interprofessionnel.
- Drapeau `WN_LETTRE_ADRESSAGE_PATIENT` toujours **éteint** ; éteint, la
  réponse du GET de diffusion et le jeton du clic sont ceux d'avant.
