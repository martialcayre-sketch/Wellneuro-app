### Table d'arrêt : une passation trop ancienne n'éteint plus (D-500, t78, 2026-11-12)

Dette t78 (§8). Arbitrages du responsable du 2026-11-12 (questions `20261112-1216-a` à `1218-a`). Aucune migration ;
release-db au merge (chemin clinique). Aucun changement visible au déploiement sur les dossiers actuels (aucun n'a les
trois instruments de STOP-STR, mesure en production du 2026-11-12).

- Le moteur d'arrêt lit une fenêtre d'EXTINCTION par instrument (`FENETRES_ARRET`, registre distinct des fenêtres de
  proposition) : Cungi et DASS-21 à 7 jours, reprise des valeurs de D-430 qui constitue un arbitrage neuf, sans source.
  La fraîcheur s'ajoute aux autres gardes, elle n'en remplace aucune.
- Aucune fenêtre pour Q_STR_01, et aucune durée implicite : STOP-STR n'éteint plus rien jusqu'à un arbitrage explicite
  sur cet instrument.
- Sans horloge, aucune extinction (le repli de D-433 §5 n'est pas repris pour l'arrêt).
- Une règle d'arrêt non évaluée qui avait une exploration à retirer est dite au cockpit, avec deux textes : passation
  trop ancienne, fenêtre non définie. La synthèse ne reçoit aucune extinction refusée ; son explication au modèle part
  à t77.
- Empreinte de la table d'arrêt sur `{ regles, grilles, fenetres }` ; re-signature du responsable.
