### Le banc de certification consigne ce qu'il mesure, et compte ses lecteurs

Deux défauts d'outillage, nommés en réserve par deux revues successives et corrigés
ici plutôt que reportés une troisième fois.

**L'empreinte ne disait pas de quelle FORME elle était l'empreinte.** `Q_ALI_01` en a
fait la démonstration : `WN_ALI_01_SIIN57` est allumé en production depuis le
2026-07-28 mais éteint par défaut, et le banc ne le posait pas. Ses passages du 25 et
du 29 ont mesuré le dépistage court à 14 items — une forme que plus aucun patient ne
reçoit — sans que rien, ni dans l'empreinte ni dans le rapport, permette de s'en
apercevoir. L'empreinte porte désormais la position de chaque drapeau de forme, et le
rapport l'affiche en tête de son relevé. Contre-épreuve : drapeau éteint, l'empreinte
enregistre `false` et 14 items ; allumé, `true` et 57.

**Le croisement des deux lectures comptait des occurrences, pas des lecteurs.** Une
même lecture peut émettre plusieurs fois la même divergence — huit fois chez l'une,
quatre chez l'autre — et le tableau portait alors douze entrées pour deux lecteurs.
Le test « vue par toutes les lectures » échouait, et une divergence **réellement
confirmée des deux côtés** était déclassée en simple signalement. L'erreur allait dans
le sens rassurant, ce qui est le pire des deux sens. Un ensemble remplace la liste.

**Ce que le rejeu complet fait apparaître, et qu'il faut lire comme tel** : six
instruments certifiés portent à nouveau une divergence critique au banc. Cinq sont les
requalifications documentées de la campagne — le banc les rétablit parce que son
extraction n'a pas changé, et c'est la réserve écrite depuis le 2026-07-29. Le sixième
est `Q_CAN_02`, dont le `total_numerique_absent` est la **conséquence voulue** de la
reconstruction : le manuel EORTC ne définit aucun score global. La note de révision le
dit à sa place.
