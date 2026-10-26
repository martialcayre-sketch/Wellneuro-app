### Six décisions sur le travail de plusieurs sessions en parallèle (D-370 à D-375, 2026-10-26)

Arbitrages du responsable des 25 et 26 octobre 2026, sur questions à options, après
un audit du travail en parallèle de quatre sessions (dossier tenu hors dépôt)
et sa contre-revue. Documentation seule : aucun code, aucune migration, aucun
drapeau.

- D-370 : le numéro d'une décision se réserve à la rédaction par une référence
  `refs/tags/reserve/D-N` créée sur GitHub ; le garde tolère un trou réservé,
  en avertissement ; registre rangé par numéro. Jusqu'à la livraison du
  script : numéro pris au merge, sujet du squash posé par `--subject`.
- D-371 : les « Mise à jour » datées des fiches du plan sortent en fragments,
  un fichier par mise à jour ; le plan reste unique, fiches et tables
  comprises (annexe à D-285 §1).
- D-372 : le contrôle de clôture n'exige plus que le fragment de handoff créé
  par la PR ; `SESSION_LOG.md` redevient un résumé sur demande ; le handoff
  courant est celui de la branche ; H23 amendée.
- D-373 : un intégrateur unique merge les PR ordinaires depuis la copie
  principale, en essai de sept jours et trente PR, avec repli ; les files
  gardent migrations, authentification et `.coderabbit.yaml` ; les sessions
  font `/clear` dès le merge, sans attendre le CI de `main` ni le
  déploiement ; contrôle local sur l'arbre fusionné avant le merge, aucun
  check requis de plus ; auto-merge coupé (D-290 et D-287 §2 amendées, lot 4
  de D-248 devancé pour la discipline du code ordinaire).
- D-374 : une release-db se lit par phases ; pendant l'attente d'approbation,
  seuls les merges qui touchent une migration, un chemin déclencheur ou
  l'outillage de release sont gelés ; le déployeur retient la tête tant
  qu'une migration attend, après un banc qui rejoue le comportement que D-248
  gardait (question rouverte sur arbitrage) ; gel intégral jusque-là (D-087
  précisée).
- D-375 : le crochet de fraîcheur journalise ses verdicts une semaine, puis
  tolère un retard sans chevauchement ni conflit ; mode dégradé inchangé.

Plan : lignes datées sous H23, §5 et §10.
