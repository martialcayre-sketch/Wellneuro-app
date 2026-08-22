### Instruments du cabinet — une famille qui pilote sans classer : l'EVA entre par la voie existante, sans seuil et sans migration (Alliance 6.0-A LOT-05, [[D-087]])

- **Un quatrième type de scoring admis à l'entrée** :
  `sum_no_interpretation`. La garde « tout instrument du cabinet porte une
  grille complète et couvrante » est **relâchée pour cette famille, et pour
  elle seule** ; les trois familles qui concluent (`sum`, `sum_reversed`,
  `count_threshold`) sont inchangées au caractère près — leurs bancs sont
  verts sans modification. L'item `number` borné (`min`/`max`/`unit`, bornes
  **déclarées** obligatoires) y est admis ; il reste refusé partout ailleurs.
- **Garde anti-seuil, vue rouge puis verte** : sur cette famille, une bande —
  une seule, même « neutre », même couvrante — est refusée aux quatre points
  d'appel de `validerInstrumentCabinet` (création, import, relecture,
  publication, édition). La garde nommée `interditTouteBande` mord aussi sur
  la **bande d'attente** « Grille à définir — relecture requise » que
  `scoringParDefaut`, l'amorce de l'éditeur et l'import posent quand la grille
  manque : sur un instrument qui ne classe pas, un libellé d'attente coloré
  `warning` est un verdict de fait. Débranchée, la garde fait rougir 5 bancs ;
  la garde d'amorce, 1 ; le refus d'édition, 1.
- **Moteur de scoring intact, aucune migration** : `sum_no_interpretation`
  existe dans `web/src/lib/questions.ts` depuis le catalogue Drive et rend
  `interpretation: null` — zéro ligne modifiée. Les colonnes `definitionJson`
  / `scoringJson` suffisent ; la saisie patient réutilise `QuestionField` et
  la garde de bornes serveur d'`api/patient/submit`, sans composant neuf.
- **Réserve fermée par banc** : `sum_no_interpretation` n'émet ni `missing` ni
  `repondus`. La complétude d'un recueil n'est donc tenue, sur cette famille,
  que par la garde d'`api/patient/submit` — un banc l'asserte (recueil partiel
  → 400, aucune persistance, aucun verrouillage) et rougit à son
  débranchement.
- **Écran de relecture** : plus de crash sur une grille absente (`.map` gardé
  à deux endroits) ; la relecture affiche l'énoncé et ses ancres, déclare
  « Aucune interprétation : cet instrument pilote la conversation, il ne
  classe pas », et publie sous « Relu — publier ». L'éditeur de questionnaire
  **refuse** cette famille au lieu de lui poser une amorce de bande.
- **Restitution inchangée, désormais assertée** : `interpretation` nulle en
  base, `—` sur la fiche patient, mini-synthèse vide, badge « Cabinet —
  scoring non vérifié ». Aucune surface nouvelle.
