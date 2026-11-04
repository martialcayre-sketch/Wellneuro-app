### t60 : fenêtre du questionnaire déclencheur de l'orientation, en code (D-433) (2026-11-04)

- Quatre fenêtres de D-433 §2 entrent au registre
  `FENETRES_FRAICHEUR_ORIENTATION`, recopiées telles quelles : `Q_MOD_01`
  21 jours, `Q_MOD_03` 14, `Q_INF_03` 14, `Q_ALI_01` 90. Le registre passe
  de quinze à dix-neuf instruments. Les quinze fenêtres de D-430 §2 ne bougent
  pas.
- Le moteur lit le déclencheur avec sa date. Avec une horloge, un déclencheur
  qui lit une passation au-delà de la fenêtre de son instrument n'est pas
  évalué : la règle n'est ni déclenchée ni écartée, et part dans
  `reglesNonEvaluees` avec la passation en cause (questionnaire, date,
  fenêtre). Le jour anniversaire reste frais (D-433 §4). Sans horloge, rien ne
  change (§5). Un déclencheur lu frais et non atteint écarte toujours la règle.
- Au cockpit, le panneau Orientation affiche les règles non évaluées,
  regroupées par passation, avec le libellé validé par le responsable. L'état
  vide ne dit plus « aucune exploration proposée » quand des règles n'ont pas
  pu être évaluées.
- `instrumentsSansFenetre` couvre les instruments déclencheurs, branches d'un
  `ou` comprises, au banc (avec contre-épreuve) et dans `tableSignee()`
  (D-433 §6). Une suggestion de pack s'y nomme aussi, puisque la fenêtre de ses
  membres ne se vérifie pas à la signature (remarque P2 de la revue de #1849 ;
  aucune règle ne vise de pack aujourd'hui).
- Le registre élargi change l'empreinte signée. `ORIENTATION_RULES_V1` est
  re-signée par le responsable dans ce lot.
