### r3_10 : le cockpit nomme l'écart avec la décision sous la valeur d'un besoin mesuré (Q5, 2026-10-25)

- Écran, textes relus et validés par le responsable avant le code (questions
  à options du 2026-10-25) : sous la valeur d'un besoin mesuré, un repli
  natif d'un geste, « Écart avec la décision », porte une ligne par
  questionnaire : « N’entre pas dans la décision · passation incomplète hors
  des items lus, du jj/mm/aaaa (Q_…) ». Il s'affiche dans le tiroir des
  12 besoins et dans l'onglet Besoins, mais pas sur les cercles. Il reste
  lisible en mode consultation (sans chiffre) et n'a ni couleur ni bouton.
- Motif « recueil incomplet » précisé : « recueil incomplet sur les items
  lus, à la dernière passation » (Q5 : le motif décrit les routes).
- Mécanisme ([[D-329]] §2, résidu laissé par [[D-359]] §3) : les routes
  jugent les items que chaque source lit, le snapshot juge la passation
  entière. L'écart va dans un seul sens, puisque les routes mesurent et que
  la décision écarte : il ne touche donc jamais un besoin non mesuré, et se
  dit sous la valeur, pas sous le tiret.
- Les sources sont tirées de `BESOIN_SOURCES` et non d'une liste. Sont
  concernées aujourd'hui les sources à sous-score : `Q_ALI_01` (besoin 3),
  `Q_MOD_01` (besoin 5), `Q_NEU_11` (HAD, besoin 8, que D-359 §3 ne nommait
  pas) et `Q_INF_03` (besoins 10 et 12).
- Code : `ecartsDecisionBesoin` (`lib/equilibre/motifsBesoins.ts`) applique
  le prédicat du snapshot lui-même (`hasExploitableRawAnswers`, exporté sans
  changement) aux réponses brutes que les routes ont retenues. Champ
  `ecartDecision` dans les routes `api/praticien/equilibre` et
  `api/praticien/besoins` ; un ancien conteneur sans le champ n'affiche
  rien.
- Rien d'autre : aucun calcul, aucune valeur, aucune version
  (`VERSION_SCORE_EQUILIBRE` inchangée), aucune migration, aucun drapeau,
  aucune décision nouvelle (Q5 tranchée le 2026-10-22, M-2 signée).
