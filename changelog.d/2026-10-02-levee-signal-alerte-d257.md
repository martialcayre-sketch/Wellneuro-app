### Signal d'alerte adressé : la sortie du blocage est décidée (`D-257`) (2026-10-02)

Un signal d'anamnèse de rang `adressage` bloquait la décision sans aucune sortie.
`D-257` décide que la lettre d'adressage consignée lève l'abstention, signal par
signal et pour la consultation porteuse ; le signal reste affiché au praticien et
cesse seulement de bloquer. L'orientation vers le médecin devient la première action
du protocole, hors de la borne des trois actions et non retirable, avec un texte
patient signé. Amende `D-099` (décision 3) et `D-218` (§12). Aucun code ni
migration dans cette entrée : la table de couverture, la partition de la chaîne C1
(derrière un drapeau éteint) et l'action d'orientation suivent en lots séparés.
