### Corrigé — Le TFD ne conclut plus sur un questionnaire à moitié rempli

`Q_GAS_01` (TFD SIIN, 31 items cotés, 5 axes) était le **dernier moteur de la classe
atteignable par une règle d'orientation publiée** à ne pas fermer le recueil partiel.
Le lot précédent l'avait nommé trois fois comme réserve connue.

Le repli existant ne rendait `null` que si un axe **entier** était vide. Un seul item
répondu par axe suffisait donc à produire un total : **cinq réponses sur trente-et-une,
toutes au maximum de leur échelle, rendaient « A — Absence de troubles fonctionnels »**
(15 sur 93, bande 0-23). Le biais est à sens unique — un item non répondu est ignoré,
jamais compté 0 — et sur cette grille le bas est le rassurant.

Le moteur publie désormais `missing`/`repondus` à la racine et `repondus`/`items` sur
chaque axe, et retire ses bandes sur recueil partiel.

#### La bande d'axe tombe aussi, et c'est un écart assumé

Sur un axe partiellement répondu, l'axe **garde son total** — c'est une mesure réelle,
biaisée bas — mais **perd son étiquette**. Les bandes d'axe du TFD sont calibrées sur
l'axe complet (`C1` lit « Absence » de 0 à 7 sur ses huit items) et sont affichées sur
la fiche praticien : les laisser vivre écrivait « A — Absence de troubles
fonctionnels » sous un axe renseigné à un item sur huit.

Le moteur `subscore`, lui, rend la complétude seulement *lisible* et conserve ses
bandes d'axe. L'écart est délibéré et écrit dans le code, pour qu'il ne se lise pas
comme une incohérence.

#### « Mon équilibre » change dans les deux sens, et l'étiquette de version suit

`VERSION_SCORE_EQUILIBRE` passe de `v10`/`v11` à `v12`/`v13`. `Q_GAS_01` alimente le
besoin 4 en `inverser: true` (`max: 93`), et l'effet **n'a pas une seule direction** —
une première rédaction ne décrivait que la première, la revue adversariale a relevé
la seconde.

- **TFD partiel et bas** — cinq items sur trente-et-un rendaient une couverture
  `1 − ratio` très haute : « besoin bien couvert » établi sur ce que le patient n'a
  pas dit. La couverture **baisse**. C'est la correction.
- **TFD partiel et déjà sévère** — au-delà de `total ≥ 62`, la couverture passait sous
  le seuil d'effondrement (0,34) et faisait du besoin 4 une **fondation critique**,
  plafonnant le score global à 50. Le rendre non mesuré **lève ce plafond** : le score
  global **remonte**. Trente items sur trente-et-un, tous au maximum, sont dans ce cas.

Coût connu du bump, déjà payé à `v3 → v4` : l'historique de momentum est coupé et
l'agrégat cabinet reste masqué jusqu'à deux cycles `v13`.

#### Le retrait de bande éteint aussi de vrais positifs

`R-GAS-01` ne s'allume plus sur un TFD partiel dont le total atteint déjà la bande B
(24), ce que huit réponses cotées 3 suffisent à produire. Les items du TFD étant cotés
0 à 3, un item non répondu ne peut qu'**ajouter** : la sévérité d'un tel partiel est
**acquise, pas probable**. C'est le coût symétrique et assumé de la doctrine — écrit
près de la règle, et épinglé par un banc plutôt que laissé à découvrir.

> **Coût remboursé depuis.** `R-GAS-01` s'allume de nouveau sur un tel partiel depuis le
> 2026-08-05 — voir *Orientation — un plancher de sévérité peut désormais allumer une
> règle*, plus bas dans cette même section. Ce qui reste vrai de ce lot-ci : la bande
> **mesurée** exige toujours l'axe complet.

Le mécanisme qui trancherait ce cas existe ailleurs dans le dépôt (`seuilMonotone` :
« le franchissement observé est définitif, le non-franchissement ne vaut que sur un
comptage complet »). L'appliquer aux bandes demanderait de servir un plancher garanti
à côté de la bande, sur **tous** les moteurs à recueil partiel : lot à part.

#### Corrigé au passage — une conclusion rassurante re-fabriquée un étage plus haut

`buildMiniSynthese` écrivait « Tous les axes explorés sont peu perturbés » dès qu'**une
seule** rubrique portait une bande (`some` au lieu de `every`) : la phrase généralisait
donc sur les axes que la garde venait précisément de refuser de lire. Quatre axes
calmes plus un axe renseigné à un item sur cinq, coté au maximum, produisaient cette
conclusion et effaçaient les cinq totaux.

#### Portée mesurée, et ce que ce lot ne ferme pas

La production porte **2 passations `Q_GAS_01`, toutes deux complètes (31/31)** : aucun
dossier vivant n'est concerné par l'une ou l'autre branche ci-dessus.

`sum_decimal`, `count_threshold` et `ecab` portent la même classe. Ce qui les
distingue n'est pas d'être protégés — c'est qu'aucune règle publiée ne les vise
aujourd'hui.
