### LOT-06 — la proposition de bilan atteint enfin un écran (D-071)

- **Premier appelant de production de `deriverStatutsBiologie`.** Le catalogue
  (`D-068`) et les quinze règles signées (`D-069`) étaient en base depuis deux
  jours sans atteindre aucune surface : le programme avait livré la matière,
  pas son branchement (`D-070`). `propositionService.ts` la sert désormais au
  cockpit praticien, hiérarchisée, sourcée, chaque ligne portant ses claims.
- **Derrière un drapeau NEUF et ÉTEINT** (`WN_CB_PROPOSITION`), ET-é avec
  `WN_CB_ENABLED`. Ce dernier valant déjà `true` en production, s'y adosser
  aurait exposé la proposition sur tous les dossiers du cabinet dès le
  déploiement — sans qu'aucun geste d'exploitation ne l'ait décidé.
- **Contrat M-B tenu, et désormais GARDÉ** : la table canonique et sa signature
  sont passées verbatim, et un banc-sentinelle éprouve l'identité de référence
  puis la concordance du SHA. Il n'existait aucune garde de ce contrat — il n'y
  avait aucun appelant. Deux mutations le tuent : un spread, un filtre sur
  `statut === 'publiee'`.
- **Deux replis fail-open du moteur sont fermés à la frontière** : une date de
  bilan illisible ou postérieure à la référence faisait conclure
  `deja_documente`, donc RETIRAIT le panel des propositions — une donnée
  aberrante produisait la conclusion rassurante (`DC-24`, `DC-25`). Ces
  déclarations sont écartées **et dites à l'écran** ; le panel repasse au
  régime normal. Le sens du repli est arbitré : écarter propose un bilan de
  trop, garder en tairait un.
- **La borne « date non future » existe enfin**, côté route : Postgres la
  refusait en CHECK (`now()` n'est pas immutable), elle ne vivait donc nulle
  part tant qu'aucune route n'écrivait.
- **L'écran dit ce qu'il ne sait pas** : un bilan non déclaré est inconnu de
  l'outil ; « remboursement non évalué » ne signifie pas « non remboursé » —
  personne n'a tranché ; les items ratio d'un panel ne sont pas encore
  affichés. Une proposition n'est pas une ordonnance (`DC-31`, `DC-32`).
- **Aucune valeur d'analyse** ne transite ni ne se stocke : la déclaration
  porte un code de panel et une date, rien d'autre. `declarePar` vient de la
  session, `declareLe` de la base — une déclaration est inantidatable et
  inattribuable à autrui, et une re-déclaration réécrit l'auteur avec la date.
- Le service ne construit **aucune** carte de remboursement : `biology_nabm_actes`
  porte bien 987 actes, mais l'appariement analyte ↔ acte
  (`biology_analyte_nabm`) est vide — le schéma l'exige manuel et signé. Rien
  ne résout donc un analyte vers un acte, et le défaut `non_evalue` du moteur
  est l'aveu d'ignorance juste.
- **Une déclaration erronée reste corrigeable** : le formulaire ne disparaît
  pas une fois le panel déclaré. Sans cela, une année saisie de travers (2016
  pour 2026) retirait durablement un panel de la proposition, sans issue depuis
  l'écran ; et une déclaration écartée s'affichait sur une ligne au badge
  contradictoire, sans le dire.
- **Le verrou de drapeau est re-testé DANS le service**, au patron
  d'`evaluerOrientationPourPatient` : aucun futur appelant — courrier médecin,
  carte de Fil — ne peut lire le dossier à travers ce module et en dériver une
  sortie clinique drapeau éteint.
- **La frontière de fuseau est gardée** : `<input type="date">` rend un jour
  que `new Date()` lit en UTC minuit. Sans tolérance d'un jour, la date DU JOUR
  était refusée comme « dans le futur » chaque nuit entre minuit et 2 h à
  Paris, avec un message faux.
- **La matrice de consommation recense enfin la table d'indications** : elle
  n'y avait aucune ligne, ce qui rendait le constat de dormance de `D-070`
  indémontrable par l'outil. 21 sources recensées, dont 5 dormantes.
