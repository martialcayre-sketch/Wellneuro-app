### t43 : le mode consultation devient un écran partagé sans chiffre (D-354, 2026-10-24)

- Principe ([[D-354]] §1) : le mode consultation de la fiche patient est un
  écran tourné vers le patient, sous la règle du portail. La fiche pose le
  contexte `patient-cockpit/ChiffresMasques.tsx` ; chaque composant qui rend
  une valeur le lit et sert « masqué en mode consultation » à la place,
  distinct de « Non mesuré ». Hors du mode, rien ne change.
- Masqué (§2) : pourcentages des 12 besoins (tiroir, onglet, radar, cercles et
  intensité de leurs points), indice global et repères de suivi, momentum
  (écart, sens, chip « Au tour précédent », tendance J21), scores, sous-scores,
  découpages, « Résumé du score » et interprétations des questionnaires,
  intensité « x/10 » de la plainte et sa bande, motifs du moteur qui citent un
  score (carte de décision, assiettes), valeurs biologiques des portes. Dates,
  « jour N », comptes d'objets, synthèse, notes, e-mail et bandeaux de
  sécurité restent.
- Onglets (§4, §8) : seuls « Poste de pilotage » et « Les 12 besoins »
  restent ; activé depuis un onglet masqué, le mode ramène au cockpit, sans
  retour mémorisé ; tout geste vers un onglet masqué y ramène aussi.
- Bancs : E2E `mode-consultation-sans-chiffre.spec.ts` (valeurs sentinelles,
  contrôle positif hors du mode, absence dans le mode, balayage des sept
  phases) ; unitaires de la fiche et des cercles.
- Rien de clinique : aucune formule, table, version ni seuil ; aucune route ;
  aucune migration ; aucun drapeau ; rien au portail.
