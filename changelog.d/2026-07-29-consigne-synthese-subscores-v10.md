### Clinique

- **Ferme le résiduel de #437** : la consigne de synthèse décrivait **deux**
  porteurs de sous-scores — `dimensions` et `scoresBesoins` — et laissait le
  troisième, `subScores`, sans un mot. Mesuré avant d'écrire quoi que ce soit, et
  c'est l'inverse d'un détail : `subScores` est le porteur **dominant** (17
  instruments du catalogue, 66 sous-scores), et **30 passations de production sur
  76** le portent au 2026-07-29 contre **0** pour les deux autres. La consigne
  décrivait donc les deux clés qu'aucune passation enregistrée ne porte, et se
  taisait sur celle qu'elles portent toutes.
- **Deux affirmations fausses retirées.** « Sous **deux** clés » : il y en a
  trois. Et « **chaque** sous-score porte son propre total et son propre max » :
  trois des 66 n'ont aucun `max` (`Q_NEU_03`). Cette seconde affirmation ne se
  contentait pas d'être inexacte — elle autorisait le modèle à fabriquer une
  proportion là où aucun dénominateur n'existe. La règle est désormais énoncée sur
  ce qui est vrai, et le cas sans `max` est nommé : rapporter la valeur brute,
  n'inventer aucun dénominateur.
- **Les champs que le modèle voit réellement sont décrits**, chacun par la règle
  qui le rend sûr :
  - **`total` à `null`** — ce sous-score n'a pas été mesuré. Ce n'est pas un zéro,
    et surtout pas le plus mauvais score de l'échelle.
  - **`seuil` à `null`** — l'instrument ne publie aucun seuil ; `atRisk` vaut alors
    `false` **par défaut** et ne signifie rien.
  - `scaled` / `maxScaled` — la même mesure remise à l'échelle ; lire une paire
    contre elle-même, jamais croiser les deux.
  - `rawTotal` — un total **avant pondération**, qui n'est pas le score.
  - `horsTotal` — une sous-échelle rapportée à part, **exclue** du total global —
    sans que les autres soient pour autant additifs.
  - `interpretation` — la bande de **ce** sous-score, jamais celle du
    questionnaire.
- **Le cas qui justifie à lui seul la règle sur `rawTotal`** : sur la latitude
  décisionnelle du Karasek (`Q_STR_06/LAT`), `total` vaut **78** (valeur pondérée,
  celle que le seuil vise) et `rawTotal` **30**, pour un seuil à **72**. Le score
  franchit le seuil, le total intermédiaire non : un modèle qui rapporte
  `rawTotal` conclut à une latitude décisionnelle basse chez un patient qui n'en a
  pas. **L'erreur n'est pas une imprécision, c'est une inversion.**
- **Un questionnaire à sous-scores peut n'avoir aucun score global** — le Karasek
  n'en définit pas. La consigne interdit d'en fabriquer un par addition. Et la
  contraposée de `horsTotal` est fermée explicitement : `Q_NEU_03` recoupe ses
  items (`Q15_Q17` est déjà compté dans A et dans B) sans porter aucun drapeau.
- **Un axe `subScores` n'est pas toujours une sous-échelle publiée.** `Q_ALI_03`,
  `Q_MOD_01` et `Q_SOM_09` sont des découpages WellNeuro. La consigne interdit de
  leur prêter l'autorité d'une source du seul fait qu'ils figurent là.
- Consigne système **v9 → v10**, empreinte reportée (le couple version/empreinte
  est verrouillé, pas chacun séparément).

**Aucune valeur servie ne change** : ce lot ne touche ni un barème, ni un seuil,
ni un moteur. Il change ce que le modèle sait de ce qu'on lui livre déjà.

**Neuf preuves par mutation**, chacune rouge puis restaurée — dont les quatre
ajoutées après la revue : retirer la règle du `total: null` ; retirer la réserve
sur `seuil: null` ; combler un axe d'agenda non couvert par un `0` au lieu de
`null` ; retirer la fixture de l'agenda pour vérifier que l'angle mort de méthode
est devenu bruyant.

### Ce que la revue adversariale a trouvé, et qui vaut d'être retenu

Première rédaction : **NO-GO**, deux défauts bloquants, tous deux **introduits par
ce lot** et tous deux de la classe même qu'il visait — une règle énoncée en
général, fausse pour une famille.

1. **La règle « le score est `total`, lu contre `max` » défaisait un invariant
   du moteur.** `Q_SOM_09` produit délibérément `total: null` pour un axe non
   couvert — `questions.ts` l'écrit : « jamais complété par un 0, qui se lirait
   comme *mauvais* au lieu de *inconnu* », et un test dédié le verrouille. Le
   modèle aurait rendu « qualité de sommeil 0/25 » à côté d'un total global de
   100/100 déjà renormalisé sans cet axe.
2. **`atRisk` érigé en verdict.** Le booléen est initialisé à `false` et n'est
   calculé que si un seuil existe. Sur `Q_STR_06/REC` (`seuil: null`,
   `seuilLabel: "Pas de seuil source"`), la consigne faisait écrire
   « reconnaissance : pas à risque » — une réassurance que la source ne porte pas,
   et **inconditionnelle**, sans même qu'il faille une donnée manquante.

**La cause commune est une leçon de méthode, pas une distraction.** Mon relevé
remplissait chaque questionnaire en saturant les **options** de ses questions. Or
`Q_SOM_09` n'a pas d'options — son scoring lit des agrégats. Il tombait donc à
`scored: false` et **sortait du recensement sans bruit**… alors qu'il était le seul
instrument à porter des `total: null`, c'est-à-dire le seul contre-exemple à la
règle que j'écrivais. *La méthode de mesure avait caché le cas qui l'invalidait* —
d'où les comptes annoncés (16/62 au lieu de 17/66) et, surtout, d'où la nouvelle
garde **« aucun angle mort silencieux »** : tout instrument que le remplissage
générique ne score pas doit désormais être déclaré, avec une fixture ou une raison
vérifiée. `Q_URO_02` et `Q_FIB_03` le sont (type `journal`, aucun sous-score —
contrôlé, pas supposé).

S'y ajoute la garde qui rend le lot durable : **aucun champ livré sous `subScores`
n'échappe à la consigne**. Elle vieillit avec le moteur — un champ neuf arrive au
modèle sans mode d'emploi tant qu'il n'est pas décrit, ce qui est exactement ce
qui était arrivé au porteur `subScores` lui-même.

### Réserves

- **La parade anti-zéro manque toujours aux `subScores`**, et ce lot ne la pose
  pas. Mesuré : sur une passation dont **tous** les items d'un sous-score sont
  absents, 55 des 66 rendent `total: 0`. Une **rédaction antérieure de ce fragment
  affirmait que le cas n'était pas atteint sur une passation partielle** — c'est
  **faux**, et la revue l'a montré : il suffit qu'un bloc entier manque. Karasek
  sans le bloc latitude rend `LAT total: 0`, `atRisk: true` et un verdict racine
  « **Job Strain — stress professionnel** » ; `Q_MOD_01` sans sa section sommeil
  rend « **Sommeil non réparateur** » (couleur danger) pendant que les six autres
  axes restent « satisfaisant ». Le zéro n'est pas seulement non qualifié, il est
  **mal étiqueté, dans les deux directions** — `Q_MOD_03` et `Q_GEO_01` retombent
  sur leur **dernière** bande (« Intensité très élevée », « Risque élevé de
  chute »).
  **La consigne ne peut pas réparer cela** : rien dans la charge ne distingue ce 0
  d'un vrai zéro (les `subScores` ne portent ni `repondus` ni `items`, contrairement
  aux `dimensions`), et demander au modèle de se méfier d'un 0 qu'aucun champ ne
  qualifie le ferait douter de tous les zéros légitimes. C'est un correctif de
  **moteur** — même classe que l'asymétrie déjà documentée en réserve de #443, et
  probablement le prochain lot de cette série.
- **`atRisk` sur un total nul est activement faux**, pas seulement muet : passation
  Karasek vide, `LAT` et `SOU` passent à `atRisk: true` par franchissement de seuil
  « faible si < X ». Épinglé par un test pour qu'un correctif de moteur fasse
  rougir en connaissance de cause. La correction propre — émettre `atRisk: null`
  quand aucun seuil n'existe ou qu'aucune donnée ne le porte — est un changement
  de moteur, hors de ce lot.
- `scaled` / `maxScaled` sont aujourd'hui **toujours égaux** à `total` / `max` :
  aucun instrument ne déclare de `multiplier`. Le modèle voit donc quatre nombres
  pour deux mesures. La règle est écrite pour rester vraie si un multiplicateur
  apparaît, mais le risque de double report subsiste.
- Le verrou d'empreinte vit dans `promptAlimentaire.guard.test.ts` alors qu'il
  porte sur la consigne entière. Emplacement hérité, non déplacé ici : le déplacer
  relèverait du renommage non sollicité.
