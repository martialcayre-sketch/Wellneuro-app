### Ajouté — la table des résultats biologiques réels (étage 2, CB-09, D-122 §2) (2026-09-03)

- **Migration `resultats_biologiques`** : la mesure, par analyte seulement —
  pas de ratio en V1 (ils se calculent), entité distincte, jamais un champ de
  la proposition. `valeur` en numeric (V1 quantitative seulement : un résultat
  qualitatif attendra sa propre décision plutôt qu'un champ libre),
  `preleve_le` posé par le praticien (borne « date non future » côté route —
  `now()` interdit en CHECK), `source` bornée par CHECK aux deux origines de
  la décision (`saisie_praticien`, `import_labo`), `saisi_par`/`saisi_le`
  posés serveur.
- **Le vocabulaire d'unités partagé s'applique une quatrième fois** : le CHECK
  d'`unite` reprend la liste du catalogue (« défini une fois, appliqué quatre
  fois ») et le contrat SQL tient l'égalité des listes — une unité acceptée au
  catalogue et refusée sur les résultats ne peut plus exister sans signal.
- **Sécurité et complétude dès cette PR** : RLS deny-all (posture `D-005`),
  deux FK en RESTRICT (`patients`, `biology_analytes`), entrée dans la
  transaction d'effacement IDP2, contrat SQL négatif
  `cb_resultats_biologiques_v1_negatif.sql` joué par le CI — liste blanche de
  dix colonnes, CHECK mordants (trou `btrim/1` fermé), série de deux mesures
  prouvée acceptée.
- Migration seule dans sa PR (`D-087`) : la saisie, l'instrument
  estimé ↔ mesuré et le drapeau `WN_CB_RESULTS_ENABLED` (reposé avec le code
  qui le lit, geste daté `D-081`) arrivent dans une PR de code, après
  application `release-db` approuvée et constatée par conteneur.
