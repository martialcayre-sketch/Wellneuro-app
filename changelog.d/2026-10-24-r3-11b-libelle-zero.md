### r3_11 (suite) : « Non calculé : aucun besoin mesuré » à la place de « Calculé sur 0 » (D-352 §4, 2026-10-24)

- `web/src/lib/equilibre/natureIndiceGlobal.ts` : `mentionBesoinsMesures`
  rend `MENTION_AUCUN_BESOIN_MESURE` quand aucun besoin n'est mesuré ; le
  libellé « Calculé sur n besoin(s) mesuré(s) sur 12 » est inchangé dès un
  besoin mesuré. Libellé choisi par le responsable.
- Servi sur le bouton du tiroir, en tête du tiroir et en tête de l'onglet
  « Les 12 besoins ». La jauge de l'indice global, qui n'affiche aucune base
  sans total, est inchangée.
- Texte seulement : aucun calcul, aucune formule, aucune version ; rien au
  portail ; aucune migration.
