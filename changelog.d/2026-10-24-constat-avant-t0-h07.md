### Outil de constat : les dossiers qui n'ont pas atteint le T0, comptés en conteneur (H07)

- **Script `web/scripts/constatAvantT0.ts`**, lancé en conteneur de
  production par `node prisma/runWithAlias.js` sous
  `PGOPTIONS='-c default_transaction_read_only=on'`. Il refuse de lire si la
  session n'est pas en lecture seule.
- **Population** : dossiers actifs portant au moins une assignation, sans
  épisode T0. Les préconditions s'évaluent par le chemin des trois routes
  (`preconditionsT0PourPatient`, jalon T0) : un seul calcul, jamais une copie.
- **Sortie en agrégats** (`web/src/lib/constats/avantT0.ts`, module pur),
  masquée selon D-298. L'effectif et les zéros restent affichés. Avec et sans
  T0, bloqués et prêts sont masqués ensemble quand une part porte sur un à
  quatre dossiers ; bloqués masqués, les comptes par condition le sont tous.
  L'ancienneté des bloqués se décrit par ses quartiles, sans tranche : le
  délai attend la D-xxx du responsable, après le comptage.
- Aucune identité, aucun identifiant, aucune écriture. Ni clinique, ni
  migration, ni drapeau, ni D-xxx.
