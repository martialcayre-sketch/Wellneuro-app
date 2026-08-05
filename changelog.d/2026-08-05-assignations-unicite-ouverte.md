### Corrigé

- **L'unicité d'une assignation ouverte descend en base.** Un index unique
  partiel sur `(id_patient, id_questionnaire)`, restreint aux statuts non
  terminaux, double la garde applicative posée au lot précédent : un doublon
  échoue désormais quel que soit le chemin d'écriture, y compris un script
  d'exploitation. La repassation d'un instrument complété reste possible — c'est
  ce que le prédicat partiel préserve, là où une contrainte unique ordinaire
  l'aurait interdite.

  Le nettoyage des doublons déjà en base **rattache les saisies avant
  d'annuler**. Un agenda reste « En attente » pendant tout son recueil : une
  assignation ouverte peut porter des semaines de données, et les annuler sans
  les déplacer les aurait rendues illisibles de toutes les surfaces sans les
  effacer de la base. Un patient avait effectivement saisi deux nuits sur deux
  exemplaires différents du même agenda ; les deux sont conservées sous
  l'exemplaire retenu, chaînes de correction comprises.

  **Aucune garde n'interrompt la migration** si une date se retrouve portée par
  deux saisies après fusion, et c'est délibéré : `resolveNuitsActives` désigne
  déjà la saisie courante d'une date, et l'agenda du sommeil ne chaîne pas ses
  corrections — deux lignes de même date y sont donc produites par le geste
  patient le plus banal. Une première rédaction s'armait sur ce cas ; elle aurait
  fait échouer le déploiement de la migration sur une base où rien n'est cassé.

  Un contrat SQL et un banc rendent tout cela exécutable : le prédicat de
  l'index est comparé à la constante du code, et le rattachement est rejoué sur
  une fixture qui reproduit le cas de production. Sans elle, rien ne l'exécutait
  jamais — la migration s'applique sur une base vide au moment où les contrats
  tournent.
