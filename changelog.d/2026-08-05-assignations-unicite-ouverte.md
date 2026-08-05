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
  l'exemplaire retenu. Si deux saisies de même date devaient se retrouver
  réunies, la migration s'interrompt au lieu de trancher à la place du praticien.

  Un contrat SQL et un banc lient désormais le prédicat de l'index à la constante
  du code : l'accord entre les deux définitions de « ouvert » n'est plus une
  phrase de commentaire.
