### LOT-06 — migration `arbitrages_biologiques` (D-059)

- Nouvelle table `arbitrages_biologiques` : verdict praticien
  (`confirme` | `infirme` | `sans_objet`) sur une intention
  `conditionnelle_biologie` d'une version de protocole — **aucune valeur
  biologique en base** (verrou HDS, D-059). Note courte optionnelle, bornée à
  2000 caractères, obligatoire si le verdict est `infirme` (contraintes CHECK).
- Unicité `(protocol_draft_id, intention_id)` : un arbitrage par intention et
  par version de protocole ; l'historique vit dans les versions (append-only).
- Migration seule (workflow release-db) : le moteur de statuts, l'API et
  l'entrée dans la transaction d'effacement IDP2 suivent dans la PR de code du
  LOT-06, après application de la release.
