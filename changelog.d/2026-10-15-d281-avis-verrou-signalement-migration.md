### Sécurité : l'avis du praticien verrouille le signalement qu'il lit (D-281 §5, migration seule, 2026-10-15)

- **La course** (passe Codex de #1474, reproduite à deux sessions) : le
  trigger d'insertion d'un avis lisait le signalement sans verrou. Une
  transaction qui supprimait le programme puis changeait le patient, et une
  autre qui posait un avis pour l'ancien patient, passaient toutes deux :
  signalement au patient B, avis au patient A. Aucun chemin de l'application
  n'y menait ; la base tient désormais l'invariant même sous concurrence.
- **Migration seule** : `trust_aev_avant_insertion` remplacée, sans colonne,
  table ni index, `schema.prisma` inchangé. En READ COMMITTED (l'isolation
  de l'application), le signalement est lu `FOR SHARE` : l'avis attend une
  modification en vol puis relit le signalement, la modification attend un
  avis en vol puis voit l'avis. Deux avis ne s'attendent pas par ce verrou.
  Le trigger verrouille d'abord le patient (`FOR KEY SHARE`), dans l'ordre
  de l'effacement IDP2 : sans cela, un avis arrivé pendant un effacement
  l'interbloquait (revue `wn-reviewer`). Aucun code ne change. La règle
  `SAF-EI-01` reste non armée.
- **Banc à deux sessions** `web/scripts/banc-avis-signalement-deux-sessions.test.mjs`,
  branché au CI et à T3 : deux courses et leurs témoins annulés, plus un
  avis contre un effacement en vol, chacune constatée bloquée sur un verrou.
  Contre-épreuves jouées en local : avec l'ancienne fonction, les cinq
  courses rougissent ; sans le verrou du patient, la course de l'effacement
  s'interbloque.
