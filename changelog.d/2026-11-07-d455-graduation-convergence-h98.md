### D-455 : convergence de `DC-29`, produite par besoin au cockpit et en synthèse ; amende D-450 §4 (H98) (2026-11-07)

- La forme `CONVERGENCE`, vide depuis le LOT-01, se peuple. Sur chaque besoin
  qu'ouvre une règle d'orientation déclenchée, le constat compte les familles
  de mesure concordantes, c'est-à-dire les auto-questionnaires et l'anamnèse,
  et nomme ses sources. Il est gradué de `SIGNAL` à `CONVERGENCE_FORTE`.
- Une condition compte une fois par besoin, même hors de sa règle, sur une
  passation fraîche. Une zone atteinte seulement par plancher ne compte pas.
  Quatre conditions restent visibles sans compter, dans la carte du besoin
  que leur règle explore.
- Importance fixe, « utile mais non urgente » : la convergence relève la
  priorité, jamais la certitude.
- Au cockpit, le constat porte son niveau, ses passations à l'appui et ses
  déclarations d'anamnèse, sans état de résolution. Le constat du besoin 1
  rappelle qu'un profil alimentaire déclaré n'établit ni carence ni statut
  biologique.
- En synthèse, ses lignes sont ajoutées en tête des points de vigilance par
  le code. Le modèle ne les reçoit pas, et la consigne v31 lui interdit
  d'affirmer lui-même une convergence. Une ligne de convergence ne part
  jamais dans le document du médecin.
- La table de convergence entre dans l'empreinte signée de
  `ORIENTATION_RULES_V1`, qui est re-signée. Aucun seuil, aucune règle et
  aucun claim ne change.
- Sans effet sur l'extinction ni sur les préconditions T0 : le chargeur T0
  écarte désormais les convergences des contradictions ouvertes.
- Aucune migration ; déploiement retenu jusqu'à l'approbation de la
  `release-db` (chemin clinique).
