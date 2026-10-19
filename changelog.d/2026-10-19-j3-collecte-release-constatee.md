### Collecte documentaire : tables posées en production (D-330, J3-collecte)

- La migration `documents_deposes_patient_v1` est appliquée depuis le
  2026-10-19 (run `release-db` 39290340495), et le constat a été fait par
  conteneur : les deux tables sont sous RLS, leurs triggers sont posés, et
  elles sont vides. Aucun code n'y écrit encore ; le dépôt s'ouvrira à ACT-4,
  derrière un drapeau.
