### Fiche-trajectoire 5.0 — « Mode de vie, 7 domaines » par état daté (SP-TRAJ LOT-02)

- L'onglet Trajectoire affiche le panneau « Mode de vie — 7 domaines »
  (maquette 5.0) : une ligne par domaine du questionnaire SIIN `Q_MOD_01`
  (sommeil, rythme biologique, adaptation & stress, activité physique,
  exposition aux toxiques, relation aux autres, mode alimentaire), piste aux
  zones du référentiel en fond, valeur `total/max`, zone du moteur en toutes
  lettres. Au présent : point plein « aujourd'hui » + point fantôme au T0 du
  cycle courant. Sur un repère sélectionné : l'état est **recalculé à cette
  date** (`etatAu`, même doctrine SP-TT — date d'un repère réel uniquement,
  sinon 400) et remplace le panneau du présent.
- Rien d'inventé : sans réponse exploitable à la date lue, « Mode de vie non
  mesuré à cette date » (jamais un 0, A8-2) ; les zones viennent de
  `Q_MOD_01.scoring` (jamais recopiées) ; l'interprétation est celle du moteur
  clinique, passée telle quelle. Divergence maquette assumée : la « carte de
  décision de l'époque » supposerait des décisions persistées (refus doctrinal
  C2A) — non affichée.
- Route `GET /api/praticien/trajectoire` : champs additifs `modeViePresent`,
  `modeVieT0CycleCourant`, et `etatDate` sous `?etatAu=` — réponse historique
  inchangée pour les consommateurs existants. Aucune migration.
