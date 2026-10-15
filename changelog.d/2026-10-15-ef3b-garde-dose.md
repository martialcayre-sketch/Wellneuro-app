### Corpus : une dose écrite en nombre, unité et fréquence ne se signe plus par lot (D-304, EF-3b, migration seule, 2026-10-15)

- **Le trou** : le garde de la voie rapide fermait la signature par lot aux
  affirmations porteuses d'une borne (unité de concentration, seuil,
  comparaison, optimum, intervalle). Une dose écrite en toutes lettres,
  « 200 mg de zinc par jour », n'en faisait pas partie : elle pouvait être
  validée par lot sans avoir été lue seule.
- **Migration seule** : `rag_claim_porte_seuil` reçoit une sixième famille,
  nombre + unité de dose (mg, µg, g, UI ou « unités », ml) + fréquence ou poids
  (par jour, par prise, par kilo, quotidien, matin, soir), à quarante
  caractères au plus et sans franchir de fin de phrase. Les cinq familles
  existantes sont reprises à l'identique ; aucune donnée touchée,
  `schema.prisma` inchangé, aucun code modifié (revue.ts et le trigger du
  journal appellent la fonction). Le garde ne juge aucune dose.
- **Relevé par conteneur avant la migration** (D-304 §4), en comptes : sur
  150 affirmations signées par lot, aucune ne porte une dose que le garde
  laissait passer ; rien à signaler ni à reprendre. Aucune affirmation n'est
  en attente : la règle agit sur les ingestions à venir.
- **Contrat SQL** `rag_claim_garde_dose_v1.sql`, branché au CI : sept textes
  réels du corpus, une sonde par unité et par fréquence, négatifs de D-304 §3
  (posologie sans nombre) et des frontières de la fenêtre. Six mutations du
  motif jouées en local, chacune attrapée.
