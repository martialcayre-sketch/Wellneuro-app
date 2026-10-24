### t42 : un T1 confirmé ne redevient plus « à confirmer » à la passation suivante (D-350 ; D-118, D-113, D-129, 2026-10-24)

- Le défaut (relevé par `wn-reviewer` sur #1670, routé par le responsable le
  2026-10-24) : une ancre de cycle rouvert (`T1`, `T2`…) se datait sur la
  réponse la plus récente du dossier (`dateDeReference`). Une passation reçue
  après sa confirmation déplaçait sa date, si bien que l'épisode cessait de se
  rejouer (D-118). L'écran redemandait alors de confirmer un `T1` déjà
  confirmé, et la re-passation du deuxième cycle perdait sa cible (t41).
  Exposition au 2026-10-24 : un dossier a un `T1`, sans passation
  postérieure.
- `web/src/lib/clinical-engine/runtimeFromPrisma.ts` : `proposeRuntimeEpisode`
  reçoit, en option, la ligne de l'ancre demandée quand elle est déjà posée
  (`AncrePosee`). Un cycle rouvert se date alors sur le `targetAt` de cette
  ligne, que D-129 interdit de réécrire. `identifiantAncre` est exporté.
- `web/src/app/api/praticien/cockpit/route.ts` : `ancrePoseeDe` relit
  `targetAt` sur la ligne de l'ancre, par son identifiant. Trois appelants
  l'utilisent : le GET, le POST (le `proposalHash` d'une re-confirmation est
  ainsi le même que celui du GET) et la cible de re-passation. En lecture
  datée, une ancre confirmée après la date lue est ignorée.
- Inchangés : `T0`, toujours daté sur la première réponse et dont la ligne
  n'est pas lue ; l'ouverture d'un cycle neuf, datée sur la dernière réponse
  ; le lecteur partagé `lireAncresPersistees`. Aucune migration, aucune règle
  ni aucun seuil clinique.
- Bancs : le banc qui figeait la limite de t41 est inversé. S'y ajoutent :
  - carte du `T1` conservée ;
  - re-confirmation par la branche d'écriture de D-129 : 200, `targetAt` et
    `confirmedAt` jamais réécrits, payload daté sur la colonne ;
  - passation postérieure dans la fenêtre : rejeu servi, réponse proposée ;
  - lecture datée avant et à l'instant de la confirmation ;
  - `T0` qui ne lit pas sa ligne ;
  - deux bancs unitaires de `proposeRuntimeEpisode`.
  Contre-épreuves : sans le correctif, six bancs rougissent ; sans la garde
  de lecture datée, un banc rougit.
- Revue `wn-reviewer` : GO avec réserves, aucun P0 ni P1. Les réserves
  portaient sur les bancs, et elles sont levées par ceux ci-dessus. La revue
  jugeait qu'une D-xxx n'était pas nécessaire. CodeRabbit (#1673) la demande,
  parce que la date de l'ancre commande la fenêtre des réponses proposées :
  l'arbitrage du responsable du 2026-10-24 est transcrit en D-350, sans
  changer le comportement.
  Constat par conteneur le 2026-10-24 : une ancre `T1+`, aucune dont la
  colonne `target_at` diverge du payload ; aucun dossier n'hérite donc d'un
  acte écrit sous l'ancienne date.
