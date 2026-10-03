### Levée du blocage par signal d'alerte : mesure de production avant allumage (`D-257`, réserve) (2026-10-03)

Mesure en agrégats par conteneur détaché, après le LOT-05 : 22 consultations
porteuses, 13 déclarant un signal d'alerte (plafond, rang `vigilance` compris),
aucune lettre d'adressage ni couverture. Allumer `WN_LEVEE_ADRESSAGE` ne changera
l'état d'aucun dossier : chacun se lèvera à la consignation de sa lettre. Consigné
au cadrage et à la ligne du drapeau ; reste la revue des lots mergés avant la pose.

Revue des lots mergés (allumage possible, aucun P0/P1) et ses correctifs : statut
de l'orientation verrouillé à `active`, au moins une action du praticien exigée
en plus d'elle, défense à la diffusion contre la carte, révocation présentée par
lettre (une lettre couvre plusieurs signaux), mention complétée, rechargement après
consignation, révision après arbitrage alignée sur la carte, garde des appelants
élargie à tout `src/`. `FEATURE_FLAGS.md` dit désormais que réteindre le drapeau
après des levées rebloque les dossiers concernés.
