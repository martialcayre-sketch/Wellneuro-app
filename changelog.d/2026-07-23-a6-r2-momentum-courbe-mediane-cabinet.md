### Fiche-trajectoire 5.0 — momentum en courbe et repère de cabinet (SP-TRAJ LOT-03, révision A6-R2)

- **Révision d'arbitrage actée au registre des frontières (A6-R2, décision
  utilisateur du 2026-07-23)** : la règle « jamais une courbe » (A6) est
  révisée pour la seule surface praticien de la Fiche-trajectoire, et le
  repère de cabinet (ex-SP-CAB) est avancé. Texte complet :
  `docs/claude/REGISTRE_FRONTIERES.md`.
- **Momentum en courbe** (`MomentumPanel`) : Δ vs T0 aux seuls jalons
  réellement mesurés — un jalon non mesuré est un trou visible dans la ligne,
  jamais un 0 (A8-2) ; aucun point interpolé, aucun pronostic ; sous 2 jalons
  mesurés, repli textuel. Équivalent texte complet (table lecteur d'écran).
  Invisible côté patient.
- **Repère de cabinet** (`GET /api/praticien/cabinet-momentum`) : médiane
  descriptive des momentums par jalon sur les cycles du cabinet de même
  `versionScore` que le cycle lu (A8-3 étendu à l'agrégat), `n=` toujours
  affiché, masquée sous 5 cycles comparables (A6-2 conservé,
  `SEUIL_COHORTE_CABINET`). Agrégat en 3 requêtes plates
  (`chargerTrajectoiresCabinet`, réutilisé par la page Trajectoires au
  LOT-04) ; la réponse n'expose aucune donnée individuelle d'un autre
  patient.
- **« Estimé ↔ mesuré »** : panneau présent en état « second temps — HDS
  requis », sans axe chiffré ni donnée fabriquée ; le gate HDS reste
  inchangé. Aucune migration, aucune modification de logique clinique ni de
  seuils.
