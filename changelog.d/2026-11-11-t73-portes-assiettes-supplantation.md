### Portes biologiques et assiettes indiquées : un claim supplanté ne fonde plus une ligne servie (D-476, t73, 2026-11-11)

Dette t73 (§8), versée par t66. Cadrage et textes validés le 2026-11-11. Aucune migration, aucune re-signature : les
tables `PORTES_BIOLOGIQUES_ASSIETTES_V1` et `INDICATIONS_ASSIETTES_V1` et leurs empreintes sont inchangées.
`release-db` à approuver séparément.

- Les deux services lisent, sur tous les couples de leur table, les claims valides au corpus ET non supplantés,
  c'est-à-dire le critère du préflight et de D-472 §2. Si l'une des deux lectures échoue, le corpus est illisible,
  comme avant.
- Un claim encore `VALIDE` mais supplanté retire sa ligne. Le retrait est compté et annoncé. Pour les portes, le texte
  de ce claim n'est plus lu.
- Textes du cockpit alignés : « … ne satisfait pas les critères de validité du corpus. » au lieu de « … n'est plus
  valide au corpus. »
- §8 du plan : t74 est inscrite. Le catalogue décisionnel des compléments ne vérifie pas non plus la supplantation ;
  son comportement reste à cadrer.
