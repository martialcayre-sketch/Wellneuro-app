### Agenda du sommeil — contrat v2, saisie au cadran et barème sans double comptage (2026-07-27)

Trois défauts de mesure de l'agenda 21 nuits (`Q_SOM_09`) sont corrigés ensemble,
parce qu'ils se tiennent : le formulaire fabriquait des nuits, l'agrégation
inventait des zéros, et le barème comptait trois fois la même grandeur.

**Le formulaire ne reporte plus la nuit de la veille.** Il s'ouvrait pré-rempli
avec les réponses de la veille — latence et qualité comprises — et le bouton
d'envoi était actif sans un seul geste : vingt copies conformes de la première
nuit passaient pour un recueil. Seuls les horaires reçoivent désormais une
suggestion, en pointillé, qui ne devient une valeur qu'au toucher.

**Saisie sans clavier ni chiffre à taper.** Les steppers « − 23:00 + » cèdent la
place à un cadran tactile de 24 h à deux poignées (`CadranNuit`), accessible au
clavier et au lecteur d'écran (`role="slider"`, `aria-valuetext`, flèches
±15 min). Le champ de commentaire libre disparaît de la saisie patient ; les
nuits v1 qui en portent un restent lisibles côté praticien.

**« Pas répondu » n'est plus un zéro.** La durée d'éveil nocturne devient
obligatoire, avec une classe `aucun` explicite (« nuit continue »). Auparavant un
accordéon laissé fermé produisait `TST = TIB − latence`, donc une efficacité
artificiellement haute : le recueil récompensait la non-réponse, et dans le sens
qui masque la pathologie. La couverture est maintenant comptée **par métrique** —
une nuit v1 sans réveils sort du temps de sommeil et de l'efficacité, mais reste
comptée pour la qualité, la régularité et le temps au lit.

**Barème refondu en quatre axes indépendants** — durée, efficacité, régularité,
qualité vécue. La latence entrait auparavant trois fois dans le total (via le
TST, via l'efficacité, puis dans « Continuité ») ; elle n'y entre plus qu'à
travers l'efficacité. La qualité vécue, l'item le mieux renseigné, n'entrait dans
aucun axe et en constitue désormais un. Le sommeil long n'est plus pénalisé
— l'AASM recommande au moins 7 h sans fixer de borne haute ; un temps *au lit*
long associé à une efficacité basse lève un drapeau « restriction de sommeil à
discuter », jamais une perte de points.

**Seuils de couverture relevés.** Agrégats à partir de 7 nuits (au lieu de 5),
indice composite à partir de 14 nuits **dont 4 de week-end** : quatorze nuits
toutes ouvrables donnent une régularité excellente et fausse. L'écart-type passe
au diviseur `n−1`, qui ne sous-estime plus la dispersion sur petit effectif.

**Ancres temporelles précisées.** Les deux poignées portent l'extinction de la
lumière et la sortie du lit (ancres du Consensus Sleep Diary), là où « couché » /
« levé » laissaient la lecture au lit dans le temps au lit et faussaient la
latence. C'est un changement de sens, d'où le passage du contrat de persistance
en `agenda-sommeil-v2` ; les lignes v1 restent lisibles sans réécriture.

**Niveau de preuve corrigé, B → D.** Le support est un instrument standard, mais
l'indice /100 consommé par « Mon équilibre » est une construction WellNeuro sans
validation psychométrique ni cohorte de calibration. Le classer au niveau de son
support faisait passer une construction maison pour un référentiel. Il est
désormais étiqueté « indice longitudinal — non diagnostique ».

**Besoin 5 pondéré.** `BESOIN_SOURCES` acceptait uniquement des moyennes simples :
l'ajout de l'agenda comme troisième source y avait porté le sommeil à 2/3 du
besoin « Bouger et se reposer » sans que ce soit une décision. Un champ `poids`
rétablit mouvement 1/2 et repos 1/2, le repos se partageant entre questionnaire
validé (2/3) et agenda (1/3). La pondération est renormalisée sur les sources
disponibles : une source absente ne tire jamais vers 0.

**Côté patient, la réserve R1 est maintenue.** Aucun score, aucune moyenne,
aucune couleur d'alerte. L'encouragement ajouté porte sur le seul acte de noter
(« 12 nuits notées sur 21 ») : un « bravo » conditionné à la qualité déclarée
apprendrait en quelques jours à déclarer de bonnes nuits, et introduirait un
biais de désirabilité dans l'instrument qu'il est censé servir.

**Écarté.** Le chronogramme praticien ne dessine pas de segments d'éveil : le
WASO est recueilli en durée cumulée, pas en position dans la nuit, et le placer
« pour l'illustration » ferait passer une estimation pour une observation. Il
gagne en revanche la portion d'endormissement (positionnellement vraie), les
médianes d'extinction et de lever, un dégradé par semaine et un liseré sur les
nuits de week-end.
