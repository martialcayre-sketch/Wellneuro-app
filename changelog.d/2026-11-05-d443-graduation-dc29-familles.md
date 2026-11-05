### D-443 : la convergence de `DC-29` se gradue par familles de mesure, quatre règles du registre arbitrées ; amende D-103 et D-041 (d58) (2026-11-05)

- La forme `CONVERGENCE` compte des familles de mesure concordantes sur un
  même axe : `SIGNAL` 1, `CONVERGENCE_FAIBLE` 2, `CONVERGENCE_MODEREE` 3,
  `CONVERGENCE_FORTE` 4 ou plus. Arbitrage WellNeuro nommé comme tel : aucune
  source ne fonde ces bornes (D-103, D-426 §2). Les quatre noms de D-041 et
  son garde-fou (aucun champ de certitude) ne changent pas.
- Registre des familles candidates : `AUTO`, `ANAMNÈSE`, `CLINICIEN`,
  `TIERS`, `JOURNAL`, `BIOLOGIE`, `PHYSIO`. `AUTO` est une seule famille ; les
  sous-scores des mêmes réponses font une famille ; une dépendance inconnue
  vaut même famille ; `ANAMNÈSE` est distincte. À flux constants, aucun axe de
  l'orientation ne dépasse `CONVERGENCE_FAIBLE` : plafond assumé.
- Biologie, agendas et physiologie restent au cockpit et à « Mon équilibre »,
  hors convergence d'orientation. `Q_ALI_01` déclenche `R2-ALI-01` sans
  compter dans la convergence digestive. Les lectures rassurantes ne
  retiennent pas la graduation ; la discordance ne sort que par règle signée
  (`C-STR` seule aujourd'hui). Le constat nomme chaque instrument une fois
  par axe, membre de `AUTO`.
- Aucun code dans ce lot : la forme `CONVERGENCE` reste vide en production.
  Le lot de graduation vient en file A sous `web/src/lib/clinical/`
  (release-db), précédé d'une relecture de la production en agrégats après
  t59 et t60. Paragraphes d'amendement datés sous D-103 et D-041.
