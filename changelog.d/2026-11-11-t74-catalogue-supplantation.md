### Atelier des règles de compléments : un claim supplanté ne fonde plus une règle (D-479, t74, 2026-11-11)

Dette t74 (§8), inscrite par t73. Cadrage validé le 2026-11-11. Aucune migration, aucune re-signature, aucune
`release-db` : aucun fichier du lot n'est sous les chemins de `release-db.yml`. Production : 0 règle dans
`clinical_rules`, effet nul au déploiement.

- La prévisualisation de l'atelier exige un claim valide au corpus ET non supplanté (`claimsAdmissiblesAuCatalogue`),
  c'est-à-dire le critère de D-472 §2 et de D-476 §2. Une règle dont le claim est supplanté est refusée sous la cause
  existante `claims_non_valides`. Si l'une des deux lectures échoue, la prévisualisation rend une erreur, comme avant.
- La création et la révision d'une règle appliquent le même critère : l'atelier n'enregistre plus une règle que sa
  prévisualisation refuserait.
- Textes alignés : « … ne satisfait pas les critères de validité du corpus. » à la prévisualisation ; « Ce claim ne
  satisfait pas les critères de validité du corpus : … Une règle ne peut reposer que sur un claim signé et non
  supplanté. » à l'écriture.
- §8 du plan : t74 soldée ; t76 inscrite. La Bibliothèque filtrée par intention sert les règles validées sans
  contrôler leur claim. Le comportement reste à cadrer.
