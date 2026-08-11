### Ajouté

- **Un contrat vérifie désormais que les claims épinglés par une table de règles
  signée tiennent toujours.** Une signature dit qu'un humain a relu ces claims
  ce jour-là ; elle ne disait rien de ce que le corpus est devenu depuis. Un
  claim rejeté, désactivé, remplacé ou dépouillé de son caractère prescriptif
  laissait la table intacte et sa signature muette. Les **quatre** propriétés
  sont contrôlées — `statut = 'VALIDE'`, `active = true`, pas de
  `superseded_at`, `prescriptif = true` — c'est-à-dire exactement le jeu que la
  relecture du 2026-08-06 avait effectivement contrôlé ([[D-042]], précisé par
  [[D-044]]).
- **La jointure porte sur la paire `(claim_id, version_claim)`, pas sur
  l'identifiant seul** : sans cela, une table signée pourrait s'appuyer sur une
  version du claim qu'elle n'a jamais relue. C'est le cas `N6` du banc négatif,
  et c'est lui qui tue la réécriture la plus plausible du prédicat.
- **Le contrat ne tourne que contre la production**, en lecture seule
  (`BEGIN READ ONLY`), en préflight de `release-db`. Ce n'est pas un choix de
  confort : la base du CI est construite vide, les claims épinglés n'y existent
  pas, et un banc écrit comme test unitaire y serait **vacué** — le piège nommé
  par [[D-012]] et [[D-015]]. Ce qui prouve que le contrat **mord** est son banc
  négatif, qui pose ses propres fixtures et tourne, lui, en CI : six formes de
  rupture doivent lever, un corpus sain ne doit jamais lever.
- **La couverture est automatique, pas déclarative.** Un banc TypeScript balaie
  les tables de règles cliniques et refuse que la liste du contrat diverge de ce
  que le code épingle. Une table signée neuve dont les claims n'entreraient pas
  au contrat fait rougir le banc — sans quoi le lot aurait recopié, dans une
  table neuve, le trou que l'audit §E venait de nommer.

### Modifié

- **`release-db` se déclenche aussi sur `web/src/lib/clinical/**`** ([[D-044]]).
  Le contrat ne se joue que contre la production, or aucune migration
  n'accompagne ce lot : avec un filtre limité à `web/prisma/migrations/**`, il
  n'aurait jamais démarré seul — la répétition exacte du précédent [[D-015]],
  où un rejeu promis n'a jamais été câblé. Ce que cette ligne élargit est écrit
  en toutes lettres dans le workflow : une modification de table clinique
  **propose** désormais une release, elle ne l'approuve pas — l'environnement
  protégé et ses relecteurs requis restent le seul chemin.
- Le banc d'invariants de `release-db` tient la nouvelle borne : **deux chemins,
  exactement**, chacun expliqué par un commentaire qui le nomme correctement.
  La borne n'a pas disparu, elle a changé de valeur.
