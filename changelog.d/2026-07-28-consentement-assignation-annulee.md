### Praticien

- **Ferme le résiduel de Fil A (#438)** : `/api/patient/consentement` acceptait
  encore de donner ou de demander une modification de consentement sur une
  assignation **annulée** par le praticien. Inoffensif — la soumission et
  l'ouverture du questionnaire restaient bloquées par les gardes posées dans
  #438 — mais c'était un chemin patient de plus qui ignorait l'annulation.
- Même discipline que `patient/questionnaire` et `patient/submit` : refus dans
  la **route**, pas seulement dans l'écran (410 `annulee`, même message).
  Placé avant les deux branches d'action (`donner` / `demander_modification`)
  pour les couvrir uniformément.
- Deux tests (aucun test n'existait pour cette route avant ce lot), preuve par
  mutation : le garde retiré fait rougir les deux cas visés.

Aucune migration, aucune modification de logique clinique.
