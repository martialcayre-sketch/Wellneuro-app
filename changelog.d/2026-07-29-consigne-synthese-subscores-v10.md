### Clinique

- **Ferme le résiduel de #437** : la consigne de synthèse décrivait **deux**
  porteurs de sous-scores — `dimensions` et `scoresBesoins` — et laissait le
  troisième, `subScores`, sans un mot. Mesuré avant d'écrire quoi que ce soit, et
  c'est l'inverse d'un détail : `subScores` est le porteur **dominant** (17
  instruments du catalogue, 66 sous-scores), et **30 passations de production sur
  76** le portent au 2026-07-29 contre **0** pour les deux autres. La consigne
  décrivait donc les deux clés qu'aucune passation enregistrée ne porte, et se
  taisait sur celle qu'elles portent toutes.
- **La consigne n'annonce plus de dénombrement.** v9 écrivait « sous **deux**
  clés » ; une première rédaction de la v10 a corrigé en « **trois** » — tout aussi
  faux : **sept** porteurs de découpages arrivent au prompt (`subScores`,
  `dimensions`, `scoresBesoins`, plus `parts`, `components`, `categories`,
  `phases`). La consigne énonce désormais l'**invariant** — lire chaque valeur
  contre le dénominateur de son propre bloc, et ne fabriquer aucune proportion
  quand il n'y en a pas — puis détaille les trois clés les plus répandues en
  disant explicitement que la liste n'est pas exhaustive.
- **Une affirmation fausse retirée.** « **Chaque** sous-score porte son propre total et son propre max » :
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

**Douze preuves par mutation**, chacune rouge puis restaurée. Elles portent sur le
seul fichier `promptSousScores.guard.test.ts`, jamais sur le verrou d'empreinte —
celui-ci rougit à toute édition de la consigne et ne discriminerait rien. Dont, en
particulier : rassurer le modèle sur le total global quand un sous-score est `null` ;
ré-annoncer un dénombrement de porteurs ; renormaliser `Q_MOD_03` sur les axes
renseignés ; combler un axe d'agenda par un `0` ; retirer la fixture de l'agenda pour
vérifier que l'angle mort de méthode est bien devenu bruyant.

**Deux de ces mutations sont sorties VERTES au premier essai**, et ce sont elles qui
ont le plus servi :

- retirer la définition de `subScores` — la garde n'assertait que la présence du
  **nom**, satisfaite par une autre occurrence plus bas. On pouvait supprimer la
  définition du porteur sans rien faire rougir. Chaque porteur est désormais éprouvé
  par son nom **et** par ce qui le définit ;
- ré-annoncer « **trois** clés » — la garde interdisait le seul littéral « sous deux
  clés », donc sa reformulation passait. C'est la classe entière qui est fermée
  (aucun dénombrement de porteurs), et la formule non exhaustive est exigée.

### Ce que la revue adversariale a trouvé, et qui vaut d'être retenu

**Deux NO-GO successifs**, et à chaque fois le défaut était **introduit par la
correction précédente**, de la classe même que le lot visait : une règle énoncée
en général, vraie d'une famille d'instruments et fausse d'une autre.

**Second tour — la correction du premier avait créé le défaut suivant.** Pour
fermer le cas `total: null`, j'avais ajouté « le total global qui l'accompagne a
déjà été calculé sans lui ». Vrai de `Q_SOM_09`, qui **renormalise**. Faux de
`Q_MOD_03` (`plaintes_actuelles`), qui compte les axes manquants **pour zéro** :
trois plaintes sur sept renseignées à 8/10 rendent `total 24/70`, moyenne 3,4 —
et cette moyenne ne tombe dans **aucune** bande, si bien qu'`interpretRanges`
retombe sur la **dernière** : « **Intensité très élevée** », couleur danger. La
consigne empêchait donc correctement le modèle de scorer les axes `null`, puis le
**rassurait explicitement** sur un total global qui, là, se dégrade avec les
données manquantes. Remplacé par une mise en garde : dès qu'un sous-score est à
`null`, le total global est présenté comme **incomplet** et ne fonde aucune
conclusion de gravité.

**Premier tour — deux défauts bloquants**, tous deux **introduits par ce lot**.

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
qui était arrivé au porteur `subScores` lui-même. Elle cherche un **marqueur**
`**champ**` et non le mot nu : sur 12 000 caractères, « valeur » et « sous-scores »
déclaraient décrits des champs nommés `val` et `score` que la consigne n'évoque
nulle part.

Deux autres gardes ont été resserrées pour la même raison — elles passaient pour une
mauvaise raison : le relevé épinglait des **compteurs** (17 émetteurs, 66 sous-scores),
qu'une substitution laisse verts, il épingle désormais les **identifiants** ; et la
détection d'angle mort s'adossait à `scored === false`, champ que **seul** le moteur
`agenda_sommeil` émet — elle porte maintenant sur l'**entrée** (toute question sans
options rend le remplissage non représentatif), donc sur la classe et non sur
l'incident qui l'a motivée.

### Réserves

- **Quatre porteurs restent à décrire** : `parts` (`Q_NEU_12`), `components`
  (`Q_SOM_01` PSQI, `Q_FIB_02`, `Q_GAS_02`), `categories` (`Q_SOM_03` Berlin) et
  `phases` (`Q_GEO_06`). Ils arrivent au modèle sans mode d'emploi propre, comme
  `subScores` avant ce lot ; l'invariant général les couvre, le détail non. Deux
  faits mesurés à porter au lot suivant : les `components` du PSQI portent `val`
  **sans dénominateur**, et les `parts` de `Q_NEU_12` portent **`suicidalIdeation`**
  et **`probableMajorDepression`**, deux booléens à très forte charge clinique
  servis aujourd'hui sans aucune consigne. **État antérieur à ce lot, pas une
  régression** — mais qui appelle un arbitrage praticien, pas une décision
  d'implémentation.
- **La parade anti-zéro manque toujours aux `subScores`**, et ce lot ne la pose
  pas. Mesuré : sur une passation dont **tous** les items d'un sous-score sont
  absents, 55 des 66 rendent `total: 0`. Une **rédaction antérieure de ce fragment
  affirmait que le cas n'était pas atteint sur une passation partielle** — c'est
  **faux**, et la revue l'a montré : il suffit qu'un bloc entier manque. Karasek
  sans le bloc latitude rend `LAT total: 0`, `atRisk: true` et un verdict racine
  « **Job Strain — stress professionnel** » — et si le soutien social manque
  **aussi**, « **Iso-Strain — risque burnout élevé** », le pire verdict de
  l'instrument, sur des données qui n'ont pas été recueillies ; `Q_MOD_01` sans sa section sommeil
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
