### Adressages sur signal d'alerte : la chaîne C1 sait lire la couverture, drapeau éteint (`D-257`, LOT-04a) (2026-10-03)

La chaîne C1 sépare désormais les constats de sécurité **ouverts** des constats
**adressés** : un constat d'anamnèse couvert par une lettre d'adressage consignée,
non révoquée, sur la consultation porteuse courante, cesse de nourrir
l'abstention et le blocage de la carte, et reste porté par la revue
(`safetyFindingsAdresses`), par la carte (`safetyFindingAdresseIds`) et par leurs
empreintes. Un effet indésirable ne se lève jamais par une lettre. Le lecteur
(`lireCouverturesAdressage`) relit la lettre (même dossier, sortante, ancrée sur
la cotation des signaux) et écarte toute couverture douteuse ; il est partagé par
les quatre constructions de la chaîne (cockpit ×2, vérificateur, rejeu patient),
ce qu'une garde compte. La réponse du cockpit sert les couvertures lues à côté de
la carte, pour l'écran du LOT-04b. **Drapeau `WN_LEVEE_ADRESSAGE` éteint à la
livraison, et il le reste jusqu'au LOT-05** (action d'orientation en tête du
protocole) : éteint, la table n'est pas lue et les cartes, revues et empreintes
sont identiques à celles d'avant ce lot — aucun dossier ne change d'état.
