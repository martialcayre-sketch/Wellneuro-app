### Synthèse

- **La consigne de synthèse décrit désormais les sous-scores qu'elle livre au
  modèle (v8 → v9).** Le lot #436 a doté l'Enquête SIIN d'un sous-score de besoin
  `scoresBesoins` (`RYTHME_CHRONO`, 4 items, /7). À l'allumage de
  `WN_ALI_01_SIIN57`, il partira au modèle **automatiquement** — `scoresPourPrompt`
  est une liste noire, pas une liste blanche — à côté de la dimension d'affichage
  quasi homonyme `RYTHME_ALIMENTAIRE` (6 items, /10). Deux vues d'un même thème,
  deux totaux du même ordre sous deux dénominateurs, côte à côte dans le même JSON,
  que rien n'avertissait le modèle de ne pas additionner ni confondre.
- **Choix : décrire, pas retirer** (arm « décrire ce qui est livré, ou ne pas le
  livrer » de la réserve #432). Le sous-score de besoin est une donnée que la
  synthèse doit exploiter, pas seulement Mon équilibre ; le retirer de la charge
  l'aurait privée d'un signal. `SYSTEM_PROMPT_GOUVERNANCE` gagne une section
  générale « Sous-scores » : `dimensions` = découpage d'affichage, `scoresBesoins`
  = mesure d'un besoin ; chaque sous-score se lit contre **son** `max` ; un même
  thème peut paraître sous les deux clés avec des périmètres différents, à ne
  jamais cumuler.
- **Formulation générale, à dessein.** La section ne code pas en dur les `id`
  `RYTHME_*` (ils vieilliraient) et vaut pour tout le catalogue — d'autres
  questionnaires (cardiologie, tabacologie, gérontologie) émettent déjà des
  `dimensions` livrées au modèle sans description dédiée. Étant vraie dans les
  **deux** positions du drapeau, elle autorise le bump sans faire mentir
  l'étiquette : c'est le **texte** de la consigne qui change réellement, pas
  seulement la charge.
- **Couplage garde dans les deux sens.** `promptAlimentaire.guard.test.ts` :
  l'empreinte SHA-256 de la consigne est reportée avec la version (v9), une
  assertion vérifie que la section nomme `dimensions`, `scoresBesoins` et la notion
  de périmètres distincts, et un test score la **définition** `Q_ALI_01_SIIN_57`
  (via `computeScoreFromDef`, indépendant du drapeau) pour prouver que la charge
  porte réellement les deux porteurs — `RYTHME_ALIMENTAIRE` /10 et `RYTHME_CHRONO`
  /7, dénominateurs distincts. Preuve par mutation : ajouter `scoresBesoins` à la
  liste noire de `scoresPourPrompt` (le « retirer » écarté) fait rougir ce test —
  la consigne décrirait alors un sous-score absent de la charge.

### Réserves

- **Aucun effet observable tant que `WN_ALI_01_SIIN57` est éteint** : la forme
  courte ne porte ni `dimensions` ni `scoresBesoins`, la charge d'une synthèse
  produite aujourd'hui ne change pas. Seul le texte partagé de la consigne évolue,
  honnêtement étiqueté v9.
- **Périmètre = l'homonymie de la réserve 1** (`dimensions` vs `scoresBesoins`).
  Un **troisième** porteur, `subScores` (sous-scores d'échelles comme PSQI/HAD),
  est lui aussi livré au modèle et **reste non décrit** : pré-existant, sans
  rapport avec l'homonymie du rythme, il n'est pas couvert par cette section.
  Le décrire est une amélioration distincte, à mener si on veut fermer la même
  asymétrie sur ce porteur-là.
- Aucune migration, aucune écriture en base. Ne touche ni le total /90, ni les
  bandes, ni le scoring, ni Mon équilibre.
