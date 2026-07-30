### Q_ALI_01 — le banc mesurait la mauvaise forme ; la critique, elle, reste ouverte

Dossier : `docs/claude/propositions/2026-07-30-ali01-echelle/`.

**Ce qui est établi.** Le banc de certification mesurait le dépistage court à
14 items : `WN_ALI_01_SIIN57` est allumé en production depuis le 2026-07-28 mais
éteint par défaut, et le banc ne le pose pas. Ses passages du 25 et du 29
décrivaient donc une forme que plus personne ne reçoit — une description de contenu
dérivée de cette empreinte aurait certifié un questionnaire que la production
n'administre pas. C'est la classe nommée pendant la campagne SIIN 57 : **un garde
aveugle à la position du drapeau ne garde rien.** Rejoué hors ligne drapeau allumé,
le contenu est verrouillé sur l'empreinte de la forme réellement servie : 57 items,
12 sections, moteur `seuils_points`. L'instrument passe à `contenu_verrouille`.

**Ce qui ne l'est pas, et que la revue adversariale a renvoyé.** Une première
rédaction annulait la divergence `echelle_de_cotation` en soutenant que l'échelle
« 0 à 2 » de la source est un nombre de points par item. L'argument est retiré :
son arithmétique se contredisait — 57 × 2 fait 114, pas 90, et le total de 90 vient
d'une répartition inégale (24 items à 1 point, 33 à 2), ce qui ne prouve rien — et
sa prémisse (« la source déclare un total /90 ») n'a **aucune pièce au banc**, dont
les deux lectures rendent `bornesTotal: null`.

**Ce qui reste à trancher, et pourquoi ça compte.** Si la source attribue 2 points à
chacun de ses 57 items (max 114) et que ses bandes 0-25 / 26-50 / 51-70 / > 71
portent sur ce /114, alors le servi applique ces mêmes bandes sur un /90 et
**déclasse chaque patient d'une à deux bandes**. Écart clinique, pas faux positif de
catégorie. Pièce nécessaire : une lecture ciblée de WN-SRC-0470/0471 sur la
répartition des points item par item et sur le total déclaré. La divergence critique
reste donc **ouverte** et bloque `scoring_verifie` à dessein.

**Réserve maintenue** : le banc `certify` reste aveugle à `WN_ALI_01_SIIN57`. Sans
le poser dans son invocation, son prochain passage remesurera la forme courte.
