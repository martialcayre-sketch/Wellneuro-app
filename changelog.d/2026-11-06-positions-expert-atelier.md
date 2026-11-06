### Atelier des positions d'expert, sous drapeau éteint (BP-12b PR 3, D-439, 2026-11-06)

- Surface privée du praticien, `/dashboard/bibliotheque/positions-expert`,
  derrière `WN_POSITIONS_EXPERT` (éteint : page et routes en 404). Tout
  praticien lit. Le responsable seul verse une version de position, la signe
  (relecture intégrale) ou la retire (motif), et pose ou révoque l'arbitrage
  d'un conflit pour une fiche d'usage. Il passe par la même garde que les
  fiches d'usage.
- La route ajoute à la base les refus arbitrés le 2026-11-06 :
  - les actes alternent : un « signée » répété et un retrait d'une version
    jamais signée sont refusés ;
  - la position retenue par un arbitrage doit fonder la même fiche ;
  - une fiche n'est fondée que par une position non retirée, sous un verrou
    propre à la fiche. Un brouillon l'occupe aussi. Comme il ne se retire pas,
    on la libère en révisant la position sans fiche.
- Autres refus de la route : conflit inconnu bien formé ; fiche hors de la
  liste curée ; claim retenu hors du conflit ; claim d'appui ou retenu qui
  n'est plus frais au corpus (absent compris).
- Arbitrage fermé jusqu'à la re-signature : le registre `conflitsSourcesV1`
  ne porte pas encore la liste curée des fiches par conflit. Toute pose est
  donc refusée « fiche hors de la liste curée ». Le registre n'est pas
  modifié ici.
- Une écriture par transaction, en READ COMMITTED nommé. Les verrous se
  prennent dans l'ordre des triggers : fiche puis position, couple puis
  position. Un acte et un arbitrage croisés ne peuvent pas s'interbloquer.
- États dérivés à la lecture, jamais écrits :
  - une position est en vigueur si sa version courante est signée ;
  - elle est « à relire » si un claim d'appui n'est plus frais ;
  - une tête d'arbitrage est « à relire » dans les six cas d'A3.
- Bancs :
  - unitaires : refus, alternance, six cas d'A3, ordre des verrous ;
  - garde : `ecriture.ts` est seul à insérer, et seuls le module et les routes
    de l'atelier lisent ces tables ;
  - base réelle `positionsExpert.pg.test.ts`, en CI : l'empreinte JS est
    celle de `positions_expert_empreinte_contenu` sur des textes piégés, et
    la question 3 tient sous une concurrence constatée et à la signature.
    La contre-épreuve a été jouée à la main pendant le développement : lue
    avant le verrou, l'occupation laisse passer deux positions.
- Un texte en UTF-16 mal formé ou porteur d'un NUL est refusé à la route
  (400). `jsonb` le rejetterait, et l'écriture finirait en 500.
