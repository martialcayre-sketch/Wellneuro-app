### t59 : fenêtres de fraîcheur de l'orientation, une par instrument, en code (D-430) (2026-11-03)

- Le champ `repetition` quitte les vingt règles de `ORIENTATION_RULES_V1` :
  les quinze fenêtres de D-430 §2 vivent dans un registre par instrument,
  `FENETRES_FRAICHEUR_ORIENTATION`, recopiées telles quelles et épinglées une
  à une par un banc. Les 365 jours uniformes de D-180 point 3 cessent.
- `cibleDejaCouverte` lit la fenêtre de l'instrument, quelle que soit la règle
  qui le propose. Un instrument sans fenêtre ne couvre plus sa cible : aucun
  repli implicite (D-430 §3).
- Banc d'exhaustivité avec contre-épreuve. Le même contrôle entre dans
  `tableSignee()` : une table qui vise un instrument sans fenêtre éteint
  l'orientation.
- Le registre entre dans l'empreinte signée (`{ regles, grilles, fenetres }`).
  `ORIENTATION_RULES_V1` est re-signée par le responsable dans ce lot.
