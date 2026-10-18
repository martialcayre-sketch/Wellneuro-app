### Chaîne C1 : les signalements d'effet indésirable ne sont plus lus pour construire la carte — la lecture était sans effet depuis t27 (D-281 §5, t29, sans migration, 2026-10-18)

- **L'écart corrigé** : depuis t27, aucune sortie de la chaîne ne dépendait
  des signalements, mais le cockpit (deux appels), le vérificateur, le rejeu
  du portail et le Fil du jour les lisaient encore. Avec la signature de
  SAF-EI-01, chaque carte coûtait donc une requête perdue.
- **Désormais** : la chaîne ne reçoit plus de signalement. Les cinq lectures
  sont retirées, ainsi que le paramètre des deux producteurs et le module de
  lecture. Les signalements restent comptés au panneau, au Fil et au prévol,
  par leurs propres lectures.
- **Rien ne change à l'écran ni dans l'empreinte des cartes** : la sortie
  était déjà la même avec ou sans signalement. Un banc garde l'entrée de la
  chaîne sans signalement.
