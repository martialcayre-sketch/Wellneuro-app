### Scoring — une sévérité déjà acquise se sert comme plancher, jamais comme mesure

`D-014` avait fermé le faux négatif rassurant : sur un recueil partiel, plus de
bande d'interprétation. Sa justification était l'asymétrie — « l'erreur est à sens
unique : sous-classement, jamais sur-classement ». Mais si l'erreur ne peut aller
que vers le bas, la bande décrochée par les seules réponses recueillies est une
**borne inférieure** de la bande finale : la retirer éteignait aussi les vrais
positifs **déjà acquis**. Sur le TFD, dont les items sont cotés 0 à 3 et dont la
bande B s'ouvre à 24, **huit réponses au maximum suffisent** à l'atteindre — et les
vingt-trois restantes ne peuvent qu'ajouter.

Les moteurs `sum`, `psqi` et `tfd` servent désormais ce plancher dans un champ
**distinct** (`bandePlancher`), `interpretation` restant `null`, et la note de
recueil le porte jusqu'au praticien sous la forme « **Au moins** « X » : les items
sans réponse ne peuvent qu'aggraver le score ». Le champ est **absent** quand il
n'y a pas de plancher, jamais servi à `null`.

Deux conditions, **déclarées par l'instrument** et jamais déduites, le défaut
restant l'absence de plancher :

- **la monotonie** — répondre ne peut pas faire baisser le total. Elle n'était pas
  vraie : sur le PSQI, `Q5a` seul renseigné faisait calculer la composante de
  latence avec un `Q2` absent, dont le défaut valait trente minutes là où la vraie
  réponse à dix minutes cote mieux. **Répondre faisait baisser le total.** Le
  défaut passe à la valeur la plus favorable de l'échelle ;
- **le sens de la grille** — quatre instruments `sum` (`Q_TAB_01`, `Q_ALI_01`,
  `Q_ALI_02`, `Q_GEO_04`) ont un score haut *favorable* : un plancher de score y
  serait un plafond de sévérité, soit le faux positif rassurant de `D-014` en pire.
  21 instruments `sum` sont déclarés éligibles, plus `Q_SOM_01` et `Q_GAS_01`.

Un plancher ne transporte **aucune conduite à tenir** : l'entonnoir unique
(`separerConduite`) sort quand `interpretation` vaut `null`, donc précisément sur
le recueil partiel, et cinq instruments éligibles déclarent un `protocol` sur leur
bande la plus sévère. La consigne de synthèse décrit le champ (`synthese-v15`) et
impose la formulation « au moins ».

Trois bancs nouveaux : la propriété elle-même (aucun sous-ensemble de réponses ne
promet plus que la passation complète dont il est extrait), la monotonie éprouvée
sur trois lignes de base par instrument, et l'inventaire d'éligibilité, qui refuse
tout instrument `sum` non classé. `conduite.guard.test.ts` visite désormais aussi
un recueil **partiel** — il ne saturait que des passations complètes, et c'est ce
qui l'avait rendu aveugle.

**Portée nulle sur l'existant**, mesurée : aucune des 100 passations en base n'est
partielle, et les trois PSQI réels sont complets avec `Q2` renseigné. Ce que le lot
ne fait **pas** : rallumer `R-GAS-01` (l'orientation écarte toujours sur recueil
partiel), et donner au plancher une surface praticien dédiée.

> **La première moitié a été faite le même jour.** L'orientation lit désormais le
> plancher et quatre règles se rallument — voir *Orientation — un plancher de sévérité
> peut désormais allumer une règle*, plus bas dans cette même section. La seconde
> réserve, elle, tient toujours : aucune surface praticien **dédiée** au plancher.
