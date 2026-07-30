### Q_ALI_01 — la divergence d'échelle était une mesure de la mauvaise forme

Dossier : `docs/claude/propositions/2026-07-30-ali01-echelle/`.

Deux constats, dont le premier invalide la mesure :

1. **Le banc mesurait le dépistage court à 14 items.** `WN_ALI_01_SIIN57` est
   allumé en production depuis le 2026-07-28, mais éteint par défaut — et le banc
   de certification ne le pose pas. Ses passages du 2026-07-25 et du 2026-07-29
   décrivaient donc une forme que plus personne ne reçoit. Une description de
   contenu dérivée de cette empreinte aurait certifié un instrument que la
   production n'administre pas. C'est la classe nommée pendant la campagne SIIN 57 :
   **un garde aveugle à la position du drapeau ne garde rien.**
2. **Sur la bonne forme, l'échelle est un barème.** Le rejeu hors ligne, drapeau
   allumé, laisse une seule critique — `echelle_de_cotation` — et elle est un faux
   positif de catégorie, vérifiable par l'arithmétique : la source déclare une
   échelle « 0 à 2 » et un total « /90 », deux nombres qui ne se concilient qu'à une
   lecture — 0 à 2 est le **nombre de points d'un item**, pas le codage de la
   réponse (57 items à 2 points font 90 ; 57 réponses cotées 2 en feraient 114). Le
   servi applique exactement cela : moteur `seuils_points`, 57 items valant 1 ou 2
   points, somme vérifiée par `scoring-check`. Les valeurs 0-3, 7, 8, 10, 12 des
   options sont les **quantités déclarées** que les seuils lisent. Même malentendu
   barème/quantités qu'en #452.

Divergence annulée **sans modifier le servi** ; l'instrument est verrouillé sur
l'empreinte mesurée drapeau allumé et monte à `scoring_verifie`.

**Réserve maintenue** : le banc `certify` reste aveugle à `WN_ALI_01_SIIN57`. Tant
que le drapeau n'est pas posé dans son invocation, son prochain passage remesurera
la forme courte et rétablira cette divergence.
