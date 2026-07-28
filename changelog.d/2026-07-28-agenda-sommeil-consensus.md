### Agenda du sommeil — complétude face au consensus (2026-07-28)

Suite du contrat v2. Une comparaison item par item avec le Consensus Sleep Diary
(Carney et coll., 2012) et l'agenda SIIN a montré que le recueil couvrait 7 des
9 items du noyau. Cinq manques sont comblés, dont trois pesaient directement sur
l'interprétation clinique. Ces changements se replient dans `agenda-sommeil-v2`,
jamais mergé ni déployé — aucune ligne en base ne le porte, la production est
intégralement en v1 (vérifié sur `origin/main`). Le numéroter v3 inventerait une
version que nulle base n'a contenue.

**Le réveil matinal précoce cesse d'être invisible.** Le champ `heureReveilFinal`
existait mais n'était ni saisi ni lu. Un patient réveillé à 4 h qui reste au lit
jusqu'à 7 h avait donc exactement le même profil qu'un patient qui dort jusqu'à
7 h — et ces trois heures d'éveil étaient comptées comme du **sommeil**. Une
question obligatoire à deux tuiles (« levé dès mon réveil » / « après être resté
au lit ») ouvre, dans le second cas seulement, une troisième poignée sur le
cadran. Le temps de sommeil devient `TIB − latence − éveil nocturne − éveil du
matin` : correction de justesse, qui abaisse mécaniquement l'efficacité des
patients concernés.

**La prise d'une aide pour dormir est recueillie.** Elle était absente de tout le
module alors qu'elle figure en colonne dédiée dans l'agenda SIIN. Question
obligatoire à deux tuiles, binaire : le nom et la dose restent au dossier
médicamenteux. Elle n'entre **pas** dans l'indice — c'est une exposition, pas un
résultat, et la scorer répéterait l'erreur consistant à mélanger prédicteurs et
variable expliquée. Elle lève en revanche un drapeau « indice calculé sur N
nuits, dont M sous aide au sommeil », pour que le total ne se lise jamais nu.

**L'éveil nocturne est reborné sur 15 / 30 / 60**, comme la latence. Les bornes
v1 (15 / 45) faisaient tomber le seuil conventionnel de 30 minutes *à
l'intérieur* de la classe « 15 à 45 » : impossible de dire si une nuit dépassait
la borne, donc aucune métrique de fréquence calculable côté éveil alors qu'elle
l'était côté latence. L'asymétrie n'était pas voulue. Cinq classes plutôt que
quatre, pour garder de la résolution là où vit l'insomnie — une amélioration de
70 à 40 minutes reste visible.

**Des métriques de fréquence, sans une saisie de plus.** Le critère clinique usuel
est un nombre de nuits par semaine au-dessus du seuil, que les moyennes effacent :
une latence médiane de 22 min peut recouvrir quatre nuits à 8 min et trois à plus
d'une heure. Trois taux sont désormais produits et affichés au praticien
(endormissement, éveil, l'un ou l'autre), avec la convention de recherche
(≥ 3 nuits/semaine) **nommée et jamais conclue** — on rapporte un nombre, on ne
pose pas de diagnostic.

**Lecture de l'historique préservée.** Les classes d'éveil v1 (`e15_45`, `gt45`)
sont acceptées en lecture et refusées en écriture. Elles ne sont **pas** converties
vers les nouvelles : « 15 à 45 » n'est ni « 15 à 30 » ni « 30 à 60 », et trancher
inventerait une précision que le patient n'a pas donnée. Elles gardent leur centre
de classe pour la moyenne d'éveil et sortent de la seule métrique de fréquence,
avec leur propre compteur de couverture — même doctrine que le WASO manquant.

**La mise au lit ferme le dernier item du noyau — et change l'efficacité.** Une
question à deux tuiles (« vous avez éteint la lumière : en me couchant / après un
moment au lit ») ouvre, dans le second cas, une quatrième poignée. Deux
conséquences, toutes deux voulues :

- le **temps au lit** court désormais de la mise au lit à la sortie du lit, et
  non de l'extinction. C'est le dénominateur de l'efficacité : elle **baisse**
  pour tout patient qui passe du temps au lit avant d'éteindre. Les valeurs
  d'avant étaient plus flatteuses que celles de tout service appliquant la
  convention, donc incomparables. Un exemple couvert par les tests : au lit à
  22 h, extinction à 23 h, lever à 7 h — l'efficacité passe de 98 % à 87 % sans
  qu'une minute de sommeil ait changé ;
- le temps passé au lit **avant** d'éteindre devient une métrique à part
  (`AGD_PRELIT_MOY`), distincte de la latence d'endormissement. Un patient à
  « 60 min avant extinction / 10 min de latence » et un patient à « 0 / 70 »
  avaient jusqu'ici le même profil alors qu'ils appellent des conduites
  opposées : le premier relève du contrôle du stimulus, le second non. Le
  libellé de la question de latence le dit maintenant explicitement (« une fois
  la lumière éteinte »).

Ces minutes ne sortent PAS du temps de sommeil : le patient ne cherchait pas
encore à dormir. Elles pèsent sur l'efficacité, via le dénominateur. La
régularité, elle, reste ancrée sur l'extinction — c'est le rythme de sommeil
qu'elle mesure, pas celui du coucher.

**Coût assumé.** Les gestes obligatoires du matin passent de cinq à sept, plus
deux poignées conditionnelles qui n'apparaissent que pour les nuits concernées.
La CSD-Core compte neuf items ; le recueil en couvre désormais huit, le neuvième
(remarques libres) étant écarté par l'objectif « sans saisie textuelle ».

**Écarté.** Le chronogramme ne dessine toujours pas de segment d'éveil nocturne :
le WASO est recueilli en durée cumulée, pas en position dans la nuit. Il gagne en
revanche le segment d'**éveil du matin**, positionnellement vrai puisque le patient
en a donné l'heure. Restent hors périmètre : micro-saisie du soir, marqueur
travail/repos, quantité et horaire d'alcool et de caféine, nombre et horaire des
siestes.

**Comparabilité.** Une efficacité produite après ce lot n'est pas comparable à une
efficacité produite avant : le dénominateur a changé. Aucune donnée n'est
concernée en base — v2 n'a jamais été déployé — mais toute valeur citée dans un
document antérieur doit être recalculée avant d'être rapprochée des nouvelles.
