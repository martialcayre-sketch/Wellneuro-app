### Atelier des positions d'expert : seule une position signée occupe sa fiche ; empreinte de l'entrée affichée à la pose (BP-12b PR 5, D-439, D-452, 2026-11-07)

- **Seule une position signée occupe sa fiche** (option (a), arbitrée le
  2026-11-06). Un brouillon n'occupe plus rien : il se verse même sur une
  fiche déjà fondée par une autre position. Le contrôle « fiche déjà fondée »
  quitte le versement et se fait à la signature, sous le verrou de la fiche.
  Une version d'état illisible continue d'occuper sa fiche : on ne décide rien
  sur un état qu'on ne sait pas lire. Le refus `fiche_deja_fondee` ne vient
  plus que de la signature, et son message dit quoi faire (retirer ou réviser
  l'autre). Conséquence de « en vigueur = version courante signée » : réviser
  une position signée, même sur sa fiche, la sort de vigueur et libère la
  fiche. Si une autre position s'y signe entre-temps, la révision ne se signe
  plus.
- **Empreinte de l'entrée affichée à la pose** (renvoi CodeRabbit de #1908,
  `ecriture.ts:352`). La lecture de l'atelier rend l'empreinte de chaque
  entrée publiée du registre des conflits. L'atelier la renvoie avec la pose.
  La route exige ce champ (`400` s'il manque ou s'il est mal formé). Elle
  refuse la pose si l'entrée courante a une autre empreinte : raison
  `entree_divergente`, statut `409`. Après une re-signature, un écran resté
  ouvert n'atteste plus une entrée qu'il n'a pas montrée. Le formulaire d'un
  couple se vide (choix et motif) quand l'entrée change. La révocation reste
  le coupe-circuit : elle ne lit ni le registre ni l'empreinte.
- Ni migration, ni `schema.prisma`, ni trigger touchés. Hors
  `web/src/lib/clinical/`. Pas de release-db. `WN_POSITIONS_EXPERT` reste
  éteint.
- Bancs : `ecriture.test.ts` (versement admis sur une fiche fondée ;
  signature refusée seulement face à une position signée ou illisible ;
  entrée re-signée refusée, puis admise une fois rechargée), `routes.test.ts`
  (empreinte absente ou mal formée, transmise au module, refus `409` et son
  message), `positionsExpert.pg.test.ts` sur base réelle (deux brouillons sur
  la même fiche se versent, une seule de leurs signatures concurrentes passe ;
  un brouillon versé sur une fiche fondée ne se signe qu'après le retrait de
  l'autre ; la révision d'une position signée libère sa fiche ; l'empreinte
  rendue par la lecture est celle de l'entrée).
