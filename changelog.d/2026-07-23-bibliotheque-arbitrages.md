### Bibliothèque 5.0 — arbitrages tranchés et rayons (2026-07-23)

Les cinq questions ouvertes de la maquette V15 sont tranchées (utilisateur,
consignées dans `ARBITRAGES_QUESTIONS_OUVERTES.md` §6) :

- **La Bibliothèque devient le thème général, organisée en rayons** —
  Questionnaires (livré en maquette), Analyses biologiques (R5, à venir),
  Fiches conseils (R2, absorbe l'écran « interventions »). Le conflit de slug
  `/dashboard/bibliotheque` disparaît.
- **Passation praticien** : les 5 scorables non assignables (MMSE, 5 mots de
  Dubois, AQ Alzheimer, QDRS, catalogue mictionnel) restent visibles, jamais
  assignables au portail.
- **Alias historiques** : badge seul, pas de fusion ni migration.
- **File d'envoi** : file simple, envoi au clic, réutilisant la mécanique
  pack — pas de cron ni relance automatique.
- **Instruments du cabinet** : création + import **complets d'emblée** (grille
  de score relue, interprétation) — logique clinique : CHANGELOG et revue
  renforcée obligatoires à l'implémentation.

La maquette de référence matérialise ces décisions : barre de rayons en tête
de la vue (Questionnaires actif, deux rayons « à venir »), chip « Passation
praticien (5) » remplaçant « Non exposés (5) », eyebrow « Rayon
Questionnaires ». Artifact republié sur la même URL. Maquette seule — aucun
changement d'app.
