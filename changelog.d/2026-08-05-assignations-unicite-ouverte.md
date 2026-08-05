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

  Une garde interrompt la migration si, **sur les assignations qu'elle touche**,
  une date se retrouvait portée par deux saisies actives non chaînées — un cas
  qu'elle ne saurait pas arbitrer. Elle ne compte que les têtes de chaîne : les
  agendas sont append-only, une correction ajoute une ligne de même date et
  n'est donc pas une collision. Une première rédaction ignorait ces deux points
  et aurait fait échouer la migration à coup sûr, sur des lignes qu'elle ne
  modifie même pas.

  Un contrat SQL et un banc rendent tout cela exécutable : le prédicat de
  l'index est comparé à la constante du code, et le rattachement comme la garde
  sont rejoués sur une fixture qui reproduit le cas de production. Sans elle,
  rien ne les exécutait jamais — la migration s'applique sur une base vide au
  moment où les contrats tournent.
