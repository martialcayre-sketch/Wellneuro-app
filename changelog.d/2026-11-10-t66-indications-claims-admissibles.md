### Biologie : une règle d'indication dont un claim n'est plus admissible n'est pas appliquée (D-472, t66, 2026-11-10)

Dette t66 (§8), arbitrée le 2026-11-07 ; périmètre, critère et textes validés le 2026-11-10. Aucune migration, aucune
re-signature : la table `INDICATIONS_BIOLOGIE_V1` et son empreinte sont inchangées. `release-db` approuvée séparément.

- Le service de proposition lit à chaque appel les couples admissibles de la table (valides au corpus ET non
  supplantés, le critère du préflight) ; corpus illisible ⇒ aucune proposition, motif dit au praticien.
- Le moteur (`deriverStatutsBiologie`) reçoit cet ensemble, obligatoire, après la vérification de l'empreinte et
  après le constat des discordances : une règle dont un couple n'est pas admissible ne produit aucune ligne, et le
  panel remonte dans `panelsIndisponibles`, distinct des lignes. Il n'entre ni au courrier ni au document patient.
- Le cockpit dit, hors du bloc replié : « Bilan indisponible : {panel}. Au moins un claim cité par la règle {id} ne
  satisfait pas les critères de validité du corpus. Cette règle n'est pas appliquée. », couples au détail.
- La fiche d'analyte de la Bibliothèque suspend motif et citation d'une mention non indiquée dont un claim n'est
  plus admissible, et le dit.
- Trois dettes versées au §8 du plan : t71 (orientation, priorités), t72 (arrêts, contradictions, conflits — rien
  n'est tranché), t73 (supplantation non constatée par les portes et les assiettes).
