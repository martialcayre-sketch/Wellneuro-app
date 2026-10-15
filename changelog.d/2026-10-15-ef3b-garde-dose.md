### Corpus : une dose écrite en nombre, unité et fréquence ne se signe plus par lot (D-304 amendée, EF-3b, migration seule, 2026-10-15)

- **Le trou** : le garde de la voie rapide fermait la signature par lot aux
  affirmations porteuses d'une borne (unité de concentration, seuil,
  comparaison, optimum, intervalle). Une dose écrite en toutes lettres,
  « 200 mg de zinc par jour », n'en faisait pas partie : elle pouvait être
  validée par lot sans avoir été lue seule.
- **Migration seule** : `rag_claim_porte_seuil` reçoit une sixième famille,
  dans les deux ordres : nombre + unité de dose (mg, µg, g, UI ou « unités »,
  ml) puis fréquence ou poids (par jour, par prise, par kilo ou kilogramme,
  par semaine, par mois, par 24 h, quotidien, journalier, hebdomadaire,
  mensuel, chaque jour, matin, soir, au coucher), ou la fréquence d'abord
  (« chaque jour, 200 mg », « apport quotidien de 250 mg »). Quarante
  caractères au plus entre les deux, sans franchir de fin de phrase. Les cinq
  familles existantes sont reprises à l'identique ; aucune donnée touchée,
  `schema.prisma` inchangé, aucun code modifié (revue.ts et le trigger du
  journal appellent la fonction). Le garde ne juge aucune dose.
- **D-304 amendée** le même jour, sur arbitrage du responsable après la
  revue P1 : formes de fréquence ajoutées, fréquence placée avant la dose
  (§2 bis) ; posologies sans nombre toujours hors règle.
- **Relevé par conteneur avant la migration** (D-304 §4) : sur 150
  affirmations signées par lot, deux portent une dose que le garde laissait
  passer, deux références d'apport moyen quotidien (EPA, DHA) rapportées à un
  ANC, signalées au responsable, ni reprises ni dévalidées. Les 66 qui
  portent un chiffre ont aussi été lues une à une : aucune posologie. Aucune
  affirmation n'est en attente : la règle agit sur les ingestions à venir.
- **Contrat SQL** `rag_claim_garde_dose_v1.sql`, branché au CI : sept textes
  réels du corpus, une sonde par unité, par fréquence et par ordre, négatifs
  de D-304 §3 (posologie sans nombre) et des frontières de la fenêtre
  (quarante caractères au caractère près, `.`, `;`, `:`), dans les deux
  ordres. Vingt-sept mutations du motif jouées en local, chacune attrapée.
