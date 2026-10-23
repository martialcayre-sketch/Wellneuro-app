### t40, code : le constat du praticien sur un besoin sans score, au cockpit, sous `WN_CONSTAT_BESOIN` éteint (D-347, H84, 2026-10-23)

- Route `api/praticien/besoins/constats`. Le GET est journalisé ; il rend :
  - les besoins 2, 6, 7 et 11, avec leur libellé et s'ils portent une source
    de score ;
  - leurs constats par besoin, la tête de chacun et ce qui la rend
    « à relire », dérivé et jamais écrit : pièces corrigées, annulées ou
    dépassées, passation repassée ou exclue, date atteinte, besoin qui gagne
    un score ;
  - les pièces citables, décrites par analyse ou questionnaire et date, sans
    aucune valeur.
- Le POST pose un constat, remplace la tête ou la retire. La route dit le
  refus avant la base, nommé, sous les mêmes verrous et dans le même ordre :
  dossier, besoin (espace 347), puis la clé de chaque ligne citée. Elle refuse
  aussi :
  - toute pose sur un besoin qui porte une source de score (D-347 §2) ; le
    retrait reste offert ;
  - un dossier clos ;
  - une ligne de biologie en pièce quand l'étage des résultats est fermé.

  L'auteur est l'e-mail de la session, jamais un champ du corps.
- `web/src/lib/constats-besoin/` contient :
  - la liste fermée, recopiée des CHECK ;
  - la demande, pure ;
  - « à relire », pur, avec les conditions de D-331 §5 sur les pièces ;
  - la lecture, l'écriture, la garde et le drapeau, fail-closed ;
  - un point unique de lecture des sources de score.
- Écran : le bloc « Besoins évalués en entretien » se place sous le tableau de
  l'onglet « Besoins », sur arbitrage du responsable du 2026-10-23. Il n'est
  monté que si le drapeau est allumé, et il le dit : un constat n'est pas une
  mesure. Le tableau des besoins, les cercles et les jauges du cockpit ne
  changent pas.
- Garde des lecteurs `lecteursConstatsBesoin.guard.test.ts`, jumelle de celle
  de D-331, qui n'est pas étendue. Le drapeau est déclaré dans
  `docs/FEATURE_FLAGS.md`.
- Drapeau créé éteint : l'onglet ne change pas, la route répond 503. Pour
  l'allumer, il faut d'abord un test d'intégration de la route sur une vraie
  base.
