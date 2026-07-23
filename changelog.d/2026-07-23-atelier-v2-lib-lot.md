### Ajouté

- **Atelier corpus v2 — machinerie de validation par lot** (PR B) : tirage
  d'échantillon serveur seedé et rejouable (30 % dégressif → 20 %, min. 5,
  toute bascule fige 30 %), signature de lot `deciderLot` (échantillon et
  questionnaire intégralement conformes, couverture de chaque chunk actif de
  la source exigée, lot signé strictement égal aux éligibles journalisés au
  tirage), bascule en revue individuelle avec motif. Voie rapide en
  **allowlist** : claims `déclaré`/`observé` non prescriptifs seuls —
  `interprété` et `vécu` restent en voie lente. Décision individuelle :
  motif obligatoire sur un rejet (dette v1), et chaque acte est journalisé
  dans la même transaction que le changement de statut. Migration de suivi :
  index unique « un tirage, une issue » (l'arbitre sous concurrence) et
  trigger du journal aligné sur l'allowlist. Routes praticien
  `corpus/claims/lot/{tirage,decision}` sous session NextAuth.
