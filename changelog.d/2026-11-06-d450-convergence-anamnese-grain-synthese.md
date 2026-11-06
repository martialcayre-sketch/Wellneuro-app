### D-450 : convergence de `DC-29`, les quatre questions de D-443 tranchées ; l'axe attend un rattachement propre ; amende D-443 (d58) (2026-11-06)

- `ANAMNÈSE` reste une famille distincte des auto-questionnaires, en
  sachant que l'anamnèse est déclarée par le patient au portail. Le plafond
  reste `CONVERGENCE_FAIBLE` à flux constants.
- Une condition atteinte compte sur un axe dès qu'au moins une règle y a
  déclenché, même si l'autre condition de sa propre règle manque. Sans règle
  déclenchée sur l'axe, aucun constat. Arbitrage WellNeuro nommé. Limite
  assumée : un seuil abaissé peut compter sans sa condition sur un axe
  ouvert par une autre règle. Le constat ne présente jamais une condition
  comme une règle déclenchée.
- L'axe est le besoin que mesure la condition, par un rattachement propre,
  dicté sous provenance avant le lot. Le champ `needIds` des règles désigne
  le besoin que l'exploration vise, pas celui du signal, et ne sert donc pas
  d'axe.
- Les constats `CONVERGENCE` entrent dans les vigilances de synthèse dès le
  lot de graduation, comme objets signés, sous une version de consigne
  nouvelle. Ils ne bloquent toujours aucune extinction.
- Relecture de production faite (34 dossiers, agrégats masqués sous cinq) :
  aucun axe ne dépasse `CONVERGENCE_FAIBLE`.
- Aucun code, aucune migration. Paragraphe d'amendement daté sous D-443.
