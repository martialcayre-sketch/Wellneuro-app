### Biologie : la proposition de bilan se lit aussi par analyte — une ligne par analyse, ses panels en justifications (D-296 §2, plan F50, 2026-10-17)

- Dérivation pure `vueParAnalyte` (`web/src/lib/biology-library/vueParAnalyte.ts`) :
  regroupe par code d'analyte les lignes que le moteur a rendues ; chaque panel
  qui cite l'analyte devient une justification, avec son statut, dans l'ordre
  du moteur. Aucun filtre, aucun tri, aucune règle ni seuil ; imports de type
  seulement (le panneau client l'importe sans tirer la table d'orientation).
- Panneau « Biologie — proposition de bilan » : section repliée « Vue par
  analyte » sous la liste par panel, qui reste la ligne de geste (déclaration,
  rapports calculés, avertissement de validation médicale).
- Sortie du moteur, courrier et document patient inchangés : leur empreinte
  ne bouge pas (garde BP-01 du chemin documentaire).
- Bancs : un analyte cité par trois panels donne une ligne et trois
  justifications ; aucune justification perdue ; ordre du moteur gardé.
