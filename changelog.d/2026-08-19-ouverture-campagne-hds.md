### La campagne HDS est ouverte — réconciliée avec D-078, LOT-01 courant

- La campagne de rang 1 (`2026-08-18-echeance-hds-g-trust-04`), cadrée par
  #720, est **activée** : campagne primaire, `en_cours (ouverte 2026-08-19)`,
  lot courant LOT-01, état machine et vue `ACTIVE_CAMPAIGN.md` synchronisés
  par les scripts.
- **Réconciliation avec `D-078`**, rendu dans la même PR que le cadrage mais
  après l'écriture des lots : LOT-01 réduit à l'annexe HDS (l'arbitrage
  migrer/reconduire est rendu — migrer, sans attendre l'annexe ; demande du
  2026-08-12, relance du 2026-08-19 cochées sur preuve) ; LOT-02 débloqué —
  l'ordre « (a) d'abord » de `D-006` est suspendu par `D-078` §4, ses
  confirmations obligatoires geste par geste demeurent, et deux verrous sont
  écrits en tête : décommissionnement interdit avant l'annexe signée (seul
  geste irréversible), fenêtre bascule→signature moins couverte, à dire à qui
  exécute ; LOT-04 recentré sur la revue du 2026-10-21 (la levée est
  consignée à la source, au registre et dans la vue machine). LOT-03
  intouché.
- `FILE_ATTENTE.md` : rang 1 → ouverte ; le geste « désarmer
  `WN_CB_RESULTS_ENABLED` » (posé le matin par #717) est marqué **renversé
  par `D-078`** — le relevé était exact, c'est la règle qui a changé ; la
  tension entre le commentaire du verrou code et `D-078` est portée en dette
  propre (hors rature), à réviser quand CB-09 s'ouvrira.
- **Ce que la revue (`wn-reviewer`) a changé — GO sous conditions, refermé** :
  le « Done de campagne » réimposait l'ordre que `D-078` écarte (critère
  devenu insatisfiable sur le chemin choisi — aligné sur la chronologie
  consignée + décommissionnement) ; « la migration reste impossible » du
  LOT-01 disait encore l'inverse de `D-078` ; la case « demande partie » du
  LOT-01 est **décochée** — sa seule preuve était `D-078` lui-même (preuve
  circulaire), la référence du canal reste à consigner pour cocher ; `D-078`
  entre dans « Décisions qui bornent la campagne » ; la vue machine est
  réconciliée (`next_action` périmée remplacée, `recent_decision_ids` à
  jour, phrases historiques du `blocking_issue` marquées « ordre suspendu ») ;
  les passages §6/§14 du dossier RGPD antérieurs à `D-078` sont entrés au
  périmètre du LOT-03, nommément.
