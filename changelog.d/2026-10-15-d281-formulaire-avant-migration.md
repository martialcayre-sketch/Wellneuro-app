### Sécurité : la base accepte l'avis du praticien sur un signalement du formulaire d'avant (D-281 §5, migration seule, 2026-10-15)

- **Migration seule, aucun code consommateur** : deux fonctions de trigger
  remplacées, sans colonne, table ni index, et `schema.prisma` inchangé. La
  route du verdict refuse encore ces signalements, et la garde de diffusion
  ne les compte pas, jusqu'à la `release-db` approuvée, son constat par
  conteneur et la seconde PR du lot. La règle `SAF-EI-01` reste non armée.
- **Le formulaire d'avant** (dossier mineur ou sans date de naissance, ou
  adulte resté sur l'ancien formulaire) enregistre « oui, lié au programme »
  sans désigner d'élément. Arbitrage du responsable du 2026-10-14 : ce
  signalement bloquera la diffusion jusqu'à l'avis. La base acceptait
  jusqu'ici un avis sur un signalement rattaché seulement. Elle l'accepte
  désormais aussi sur un signalement lié à un programme du patient. « Impliqué »
  y désigne un élément de ce programme, comme pour « Je ne sais pas ». Un
  signalement libre ne reçoit toujours aucun avis.
- **Programme et patient figés** : le programme visé par un signalement ne
  se pose ni ne se re-pointe après coup, et ne se met à NULL que s'il a
  disparu (l'effacement IDP2) — une mise à NULL directe lèverait l'attente
  sans avis. À l'insertion, un signalement lié sans rattachement vise un
  programme du patient, sans quoi il attendrait un avis impossible. Le
  patient d'un signalement lié à un programme est figé, comme celui d'un
  rattaché.
- **Contrat SQL** `trust_aev_formulaire_avant_v1_negatif.sql`, branché au
  CI : chaque refus est éprouvé par son motif.
