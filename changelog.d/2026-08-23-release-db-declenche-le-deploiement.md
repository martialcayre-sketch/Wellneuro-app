### La release déclenche le déploiement qu'elle attend (2026-08-23)

Décision `D-102`. Le régime de la release approuvée (`D-087`) ne pouvait pas
aboutir : **trois releases refusées le même jour**, toutes sur le même message
— « jamais déployé en success après 20 min ».

- **La cause n'était pas le délai d'approbation.** Scalingo déploie après CI,
  mais il attend que **tous les checks du commit** aient conclu — et
  `release-db` est l'un d'eux. Le workflow attendait le déploiement, le
  déploiement attendait le workflow. Approuver plus vite n'y changeait rien.
- **Constaté, pas supposé.** Les trois commits portant un run `release-db`
  (`43705ea1`, `59c16e62`, `c2210355`) n'ont jamais été déployés d'eux-mêmes ;
  le seul commit sans migration l'a été deux secondes après sa CI. Sur
  `c2210355`, la release rejouée a conclu au vert à 20:08:58 et
  l'auto-déploiement a démarré à **20:09:02**.
- **La dépendance est inversée** : le job protégé déclenche le déploiement du
  commit approuvé avant de l'attendre. La borne des 20 minutes attend désormais
  un build lancé, au lieu d'espérer un build que personne ne lancera.
- **La coalescence disparaît du même geste** : le commit approuvé obtient *son*
  build et ne dépend plus d'un créneau qu'un merge voisin peut lui prendre.
- **Le pouvoir de déployer reste derrière le gate humain.** Le sortir en amont
  ferait gagner cinq minutes de build et rendrait le jeton Scalingo atteignable
  sans approbation — un invariant CI l'interdit désormais à tout job hors gate.
- **Un message de refus qui enseignait le faux** est corrigé : il conseillait un
  `workflow_dispatch` sur la tête de `main`, remède sans effet quand la tête est
  précisément le commit non déployé.

Conséquence assumée : Scalingo redéploiera une seconde fois le même commit une
fois la release verte. Build redondant, sans effet — préféré à une action
humaine de plus.
