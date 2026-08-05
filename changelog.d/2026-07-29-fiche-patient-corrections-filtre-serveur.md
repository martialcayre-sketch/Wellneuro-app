### Corrigé

- **Les demandes de correction de la fiche patient étaient filtrées après la
  troncature — et sur les assignations de tous les patients.**
  `FichePatientPanel` appelait `GET /api/praticien/patients` sans paramètre, puis
  retenait **en mémoire** les lignes du dossier affiché portant
  `statutReponses = modification_demandee`. Or la route rend les **40
  assignations les plus récentes du cabinet** (`MAX_ASSIGNATIONS`), tous dossiers
  et tous statuts confondus : les deux filtres s'appliquaient donc à une liste
  déjà tronquée.

  Le tri de la route est `dateAssignation desc`. Une demande de correction porte
  sur une assignation **ancienne** — c'est justement ce qu'on corrige tard — et
  tombait d'autant plus facilement hors des 40 dernières. Elle n'apparaissait
  alors ni dans le bandeau permanent, ni dans la phase Patient : le praticien ne
  la voyait pas, ne la débloquait pas, et le questionnaire restait verrouillé
  côté patient sans que rien ne le signale nulle part.

  Le dossier et le statut de réponse descendent désormais jusqu'au `where`
  Prisma, **avant** le `take`. Le plafond porte sur les seules demandes de
  correction du dossier affiché — hors d'atteinte en pratique : au 2026-07-29, le
  patient le plus fourni compte 18 assignations, et aucun ne dépasse 40.

  Un statut de réponse hors registre est **ignoré**, pas rejeté (même choix que
  `statut` et `sortBy`). Un `idPatient` inconnu, lui, n'est **jamais** ignoré :
  l'ignorer rendrait les assignations de tous les dossiers à un appelant qui en
  demande un seul, et la fiche afficherait les demandes de correction d'un autre
  patient. Il filtre donc tel quel — une valeur qui ne correspond à rien rend une
  liste vide, jamais celle d'autrui. Les deux filtres **s'ajoutent** à
  `filtrePatientsDuPraticien`, ils ne la remplacent pas.

  Les quatre valeurs de `statutReponses` acceptées sont celles qu'écrit le code
  (`non_rempli`, `verrouille`, `modification_demandee`, `deverrouille`) ; vérifié
  en base le 2026-07-29, aucune ligne n'en porte d'autre.

- **Un échec de lecture s'affichait comme une absence de demande.**
  Le `.catch` de ce chargement posait une liste vide. Une coupure réseau ou une
  session expirée produisait donc exactement l'écran d'un dossier sans demande en
  attente — la même affirmation fausse que celle corrigée ci-dessus, par une
  autre porte, et le rail du cycle clinique annonçait la phase Patient
  « renseignée ». L'échec se dit maintenant dans un bandeau rejouable, la phase
  passe à « indéterminée », et rien n'est affirmé sur ce qui n'a pas pu être lu.
  Même discipline que la lecture de trajectoire, déjà tenue dans ce composant.

- **Une réponse périmée pouvait afficher les demandes d'un autre dossier.**
  Changer de patient pendant une lecture en vol laissait la réponse tardive
  écraser l'affichage — avec son bouton « Débloquer ». Le second filtrage client
  n'y pouvait rien : il se referme sur l'`idPatient` de sa propre requête, donc
  la réponse périmée passe son propre filtre sans difficulté. Une garde de
  fraîcheur jette désormais toute réponse qui n'est plus celle attendue.

  Le filtrage client subsiste, mais **en défense** et non comme mécanisme : il
  garantit qu'aucune ligne d'un autre dossier ne s'affiche si un serveur antérieur
  à ces paramètres ne les honore pas. Il ne peut rien masquer que le serveur ait
  correctement rendu, et la troncature n'est annoncée que si la réponse écho les
  filtres demandés — sinon son `total` parlerait d'un autre ensemble.

Aucune migration, aucun changement de schéma, aucune logique clinique ni seuil
touchés. Cinq mutations, cinq fois du rouge : filtre serveur neutralisé (5
tests), garde de fraîcheur (1), remontée d'échec (2), mention de troncature (1),
filtrage de défense (1).
