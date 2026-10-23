### J1-cockpit-a : nature des trois objets du cockpit et tolérance de la stabilité métabolique (D-333 §3, 2026-10-23)

- Au cockpit praticien (tiroir « Objets cliniques & momentum »), la
  stabilité métabolique, la réserve d'adaptation et la clarté portent la
  mention « Repère de suivi, pas un score clinique » (D-333 §2 règle 3 ;
  nature arbitrée par le responsable le 2026-10-23).
- La stabilité métabolique affiche « Non motivé, décision due » à côté de sa
  valeur, puis ses sources : « Moyenne à poids égal : Hyperexcitabilité SIIN
  (Q_INF_01) et Magnésium / spasmophilie SIIN (Q_INF_02) » quand les deux
  sont là, « Sur X seule ; manque Y » quand une seule l'est. Tolérance bornée
  par la porte 4 (motivation du poids égal) : elle se retire avec elle.
- La route `api/praticien/equilibre` dit quelles sources de la stabilité sont
  présentes (`stabiliteMetaboliqueSources`, booléens seuls, même liste et
  même fonction que la formule).
- Le garde `natureIndiceGlobal.guard.test.ts` s'étend aux trois objets
  (D-333 §6) : mention exigée sur chaque restitution, tolérance exigée sur la
  stabilité.
- Aucune formule, table, version, seuil ni couleur changés ; rien au portail.
