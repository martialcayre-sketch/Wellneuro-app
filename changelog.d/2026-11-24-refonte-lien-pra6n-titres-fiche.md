### Refonte Lien, PRA-6n : plus aucun saut de niveau de titre dans la fiche, et un banc qui le vérifie (2026-11-24)

Lot ouvert par le responsable le 2026-11-24 (« Oui, ouvrir PRA-6n »), sur les
restes relevés par la revue de PRA-6e. Aucun texte neuf, aucun style changé,
ni route, ni garde, ni drapeau, ni schéma, ni règle clinique.

- **Les panneaux de la phase Actions descendent d'un niveau** : ils étaient en
  `h2`, au niveau du titre de leur phase. Assiettes indiquées, constructeur du
  protocole, historique des versions, diffusion et aperçu de consultation
  passent en `h3`, leurs sous-parties en `h4`.
- **Le tiroir de synthèse** ne saute plus de niveau : « Résumé praticien » et
  « Narratif patient » passent de `h4` à `h3`, sous le titre du dialogue.
- **Un banc structurel** (`FichePatientPanel.test.tsx`) parcourt chaque
  onglet de la fiche et chaque phase du poste de pilotage : un `h1`, aucun
  saut, et le titre de phase seul en `h2` dans la zone focale ; l'onglet
  Biologie y est jugé avec les options sous un constat confirmé, le cas qui
  avait échappé à PRA-6e.
