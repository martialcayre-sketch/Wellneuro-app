### Base : iode et sélénium, polyphénols et antioxydants dans la liste fermée des dossiers de preuve (BP-12b, D-464, 2026-11-08)

- La contrainte `positions_expert_versions_dossier_ferme` accepte désormais
  `iode_selenium` et `polyphenols_antioxydants`, en plus des cinq dossiers
  d'origine (migration `positions_expert_dossiers_v2`, ajout seul, aucune
  ligne écrite ni modifiée).
- D-464 amende D-439 §2 et §5 : chaque dossier de preuve entre à sa clôture
  par une migration de ce type, puis par le code consommateur. La liste
  reste fermée.
- Contrat SQL négatif `positions_expert_dossiers_v2_negatif.sql`, joué en CI
  et en T3 : une seule contrainte sur `dossier`, définition exacte, sept
  dossiers acceptés ; une valeur inconnue, un quasi-homonyme, une casse, un
  blanc de bord, une chaîne vide ou NULL sont refusés. Le contrat v1 éprouve
  désormais une valeur hors liste à la place d'`iode_selenium`.
- Migration seule : l'atelier ne propose les deux dossiers qu'avec la PR
  suivante, après l'application constatée.
