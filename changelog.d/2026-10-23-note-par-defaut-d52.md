### Espace patient : un libellé par défaut ne s'affiche plus comme une note du praticien (D/52)

- **Écrivains** : sans note du praticien, le pack choisi par le praticien
  (`praticien/packs/assign`), le pack de base assigné à la validation du
  portail (`assignBasePack`) et la sélection (`praticien/file-envoi/envoyer`)
  enregistrent désormais une note vide (null), au lieu de « Pack <nom> » ou
  « Envoi groupé — bibliothèque ».
- **Lecture** : `api/patient/questionnaire` retire ces deux anciens libellés
  (`notePraticienAffichable`), si bien que les assignations déjà ouvertes
  cessent elles aussi de les afficher sous « Note de votre praticien », dans
  le questionnaire générique comme dans le formulaire des plaintes. Les lignes
  existantes restent en base, inchangées.
- Arbitrage du responsable du 2026-10-23 (note vide et filtre). Une vraie note
  commençant par « Pack » serait aussi masquée : aucune en production au
  2026-10-23, risque accepté. Ni clinique, ni migration, ni drapeau, ni D-xxx.
