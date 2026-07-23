### Fiche-trajectoire 5.0 — preuve en navigateur de la Spirale peuplée (SP-TRAJ LOT-06)

- La dette E2E du LOT-01 est soldée : `fiche-trajectoire-peuplee.spec.ts`
  provisionne un épisode T0 confirmé pour le patient fictif Michel Dogné
  (helper auto-nettoyant, aucun autre spec ne lit ses épisodes) et joue en
  vrai navigateur : en-tête « Michel Dogné — épisode 1 », un arc-bouton par
  repère, arc ≡ bouton texte (une seule sélection), relecture datée pilotée
  par l'arc (clic ET clavier), « Aujourd'hui » / « Retour au présent ».
- Captures de revue ajoutées à la preuve visuelle : porte d'entrée
  « Trajectoires » et onglet Trajectoire (état vide honnête) — sans
  comparaison pixel (textes datés dépendants du moment et des parcours du
  run), comme `dashboard-patients`. Les baselines pixel existantes (cockpit,
  tiroir, porte portail) restent valides et ont comparé vert sur tous les
  runs de la campagne.
