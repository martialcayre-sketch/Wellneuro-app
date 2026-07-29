### Dossier de certification — le plafond de `Q_ALI_01` était une fausse alerte

Le dossier `2026-07-29-certification-montee` annonçait que le score de `Q_ALI_01` ne
sortait pas de la fourchette **29 → 52** pour un total présenté sur 90, et demandait de
le vérifier avant toute lecture clinique. C'est fait : **l'étendue réelle est 0 à 90**,
les quatre bandes d'interprétation sont atteignables, aucun point n'est ni inévitable ni
hors d'atteinte. Le constat est retiré, ainsi que celui des « 20 inversions appliquées,
0 déclarée » — ce sont les 20 items dont le barème donne le point pour une valeur
**basse** (moins de sucre, plus de points), c'est-à-dire sa conception.

**D'où venait l'erreur** : `bornesExecutees` du banc porte un champ `nature` qui dit
lui-même `encadrement_par_balayage`. C'est un encadrement **approché**, obtenu en
essayant des motifs de réponses — il ne cherche pas l'optimum item par item. Sur un
moteur `seuils_points` où 20 items récompensent une valeur basse, « tout au minimum »
puis « tout au maximum » ne touche aucun extrême. Je l'avais lu comme une étendue.

**Leçon, écrite dans le dossier** : `bornesExecutees` est un encadrement, pas l'étendue
servie. N'en tirer aucune conclusion clinique sans la reconstruire.

Les six autres anomalies de moteur du même tableau ont été **reconfirmées** en scorant
de vrais jeux de réponses, et non sur l'empreinte du banc : `Q_TAB_04` atteint bien 36
pour un maximum déclaré à 32, `Q_NEU_05` rend bien un minimum supérieur à son maximum,
`Q_STR_06` n'a bien aucun total global.

Documentation seule — aucun code, aucun barème, aucune valeur servie.
