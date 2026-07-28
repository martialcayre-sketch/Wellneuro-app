### Clinique

- **Ferme le résiduel de #437** : la consigne de synthèse décrivait **deux**
  porteurs de sous-scores — `dimensions` et `scoresBesoins` — et laissait le
  troisième, `subScores`, sans un mot. Mesuré avant d'écrire quoi que ce soit, et
  c'est l'inverse d'un détail : `subScores` est le porteur **dominant** (16
  instruments du catalogue, 62 sous-scores), et **30 passations de production sur
  76** le portent contre **0** pour les deux autres. La consigne décrivait donc
  les deux clés qu'aucune passation enregistrée ne porte, et se taisait sur celle
  qu'elles portent toutes.
- **Deux affirmations fausses retirées.** « Sous **deux** clés » : il y en a
  trois. Et « **chaque** sous-score porte son propre total et son propre max » :
  trois des 62 n'ont aucun `max` (`Q_NEU_03`). Cette seconde affirmation ne se
  contentait pas d'être inexacte — elle autorisait le modèle à fabriquer une
  proportion là où aucun dénominateur n'existe. La règle est désormais énoncée sur
  ce qui est vrai (`total` se lit contre `max` **quand il accompagne**), et le cas
  sans `max` est nommé : rapporter la valeur brute, n'inventer aucun dénominateur.
- **Les champs que le modèle voit réellement sont décrits**, chacun par la règle
  qui le rend sûr :
  - `scaled` / `maxScaled` — la même mesure remise à l'échelle ; lire une paire
    contre elle-même, jamais croiser les deux.
  - `rawTotal` — un total **avant pondération**, qui n'est pas le score.
  - `horsTotal` — une sous-échelle rapportée à part, **exclue** du total global.
  - `seuil` / `seuilLabel` / `atRisk` — le verdict est `atRisk`, il ne se
    recalcule pas depuis le total.
  - `interpretation` — la bande de **ce** sous-score, jamais celle du
    questionnaire.
- **Le cas qui justifie à lui seul la règle sur `rawTotal`** : sur la latitude
  décisionnelle du Karasek (`Q_STR_06/LAT`), `total` vaut **78** (valeur pondérée,
  celle que le seuil vise) et `rawTotal` **30**, pour un seuil à **72**. Le score
  franchit le seuil, le total intermédiaire non : un modèle qui rapporte
  `rawTotal` conclut à une latitude décisionnelle basse chez un patient qui n'en a
  pas. **L'erreur n'est pas une imprécision, c'est une inversion.**
- **Un questionnaire à sous-scores peut n'avoir aucun score global** — le Karasek
  n'en définit pas. La consigne interdit d'en fabriquer un par addition.
- Consigne système **v9 → v10**, empreinte reportée (le couple version/empreinte
  est verrouillé, pas chacun séparément).

**Aucune valeur servie ne change** : ce lot ne touche ni un barème, ni un seuil,
ni un moteur. Il change ce que le modèle sait de ce qu'on lui livre déjà.

**Cinq preuves par mutation**, chacune rouge puis restaurée : retirer la
définition de `subScores` ; restaurer l'affirmation « chaque sous-score porte son
max » ; retirer la règle de `rawTotal` ; cesser d'honorer `horsTotal` dans le
total global ; servir le total brut du Karasek au lieu du pondéré.

La première de ces mutations est passée **verte** au premier essai, et c'est elle
qui a le plus servi : la garde n'assertait que la présence du **nom**
`subScores`, satisfaite par une autre occurrence plus bas dans la consigne. On
pouvait donc supprimer la définition du porteur sans rien faire rougir. Chaque
porteur est désormais éprouvé par son nom **et** par ce qui le définit.

### Réserves

- **La parade anti-zéro manque toujours aux `subScores`**, et ce lot ne la pose
  pas. Mesuré : sur une passation dont **tous** les items d'un sous-score sont
  absents, 55 des 62 rendent `total: 0` — et `Q_STR_04` y adjoint une
  interprétation « Normal ». Rien dans la charge ne distingue ce 0 d'un vrai zéro
  (les `subScores` ne portent ni `repondus` ni `items`, contrairement aux
  `dimensions`). **La consigne ne peut pas réparer cela** : demander au modèle de
  se méfier d'un 0 qu'aucun champ ne qualifie le ferait douter de tous les zéros
  légitimes. C'est un correctif de moteur, même classe que l'asymétrie déjà
  documentée en réserve de #443. Non atteint sur une passation **partielle**
  (vérifié : aucun sous-score ne tombe à 0 quand les items manquants sont
  répartis).
- `scaled` / `maxScaled` sont aujourd'hui **toujours égaux** à `total` / `max` :
  aucun instrument ne déclare de `multiplier`. La règle est néanmoins écrite pour
  être vraie dans les deux cas — le jour où un multiplicateur apparaît, la
  consigne n'aura pas à changer.
- Le verrou d'empreinte vit dans `promptAlimentaire.guard.test.ts` alors qu'il
  porte sur la consigne entière. Emplacement hérité, non déplacé ici : le
  déplacer relèverait du renommage non sollicité.
