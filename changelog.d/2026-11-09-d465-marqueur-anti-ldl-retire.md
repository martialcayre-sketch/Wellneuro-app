### Biologie : le marqueur anti-LDL oxydés sort du lien d'axe et de deux panels (D-465, F79, 2026-11-09)

- Le lien d'axe `bal_f79_04` passe à inactif (la ligne reste) : la
  Bibliothèque n'affiche plus d'axe pour ce marqueur. Seize liens d'axe
  restent actifs sur dix-sept.
- Le marqueur sort de `PANEL_NEURODEG_1` et de `PANEL_METABOLIQUE_1` (76
  items au lieu de 78) : les prochains courriers au médecin et documents
  patient ne le demandent plus. Les documents déjà émis restent inchangés.
- Migration de données `20261109130000_f79_marqueur_anti_ldl_retire`, tout ou
  rien, qui s'arrête si le lien ou un item a changé depuis la lecture en
  production. Aucun changement de schéma.
- Le contrat des liens d'axe accepte deux états, avant et après la
  migration ; le banc de rejeu passe à 31 rejeux et compare lui-même les
  items de panel avant et après.
- Le motif du conflit C7 du dossier polyphénols et antioxydants est réécrit
  (C7 reste écarté) ; les écartés sont re-signés. Le registre publié ne
  change pas.
- Après la release, le responsable rejette `WN-CL-0161-070` dans l'atelier :
  le claim cesse d'être servi. Des identifiants seulement : aucun texte,
  aucune valeur.
- Signé sur la déclaration du responsable, après une contre-revue Codex en
  deux passes (NO-GO, corrections, GO). Le déploiement attend une release-db
  approuvée (D-087, D-044), puis un constat par conteneur.
