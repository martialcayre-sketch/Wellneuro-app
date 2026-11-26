### Matrice de consommation : un spécificateur d'import se lit entier (2026-11-25)

La colonne « Patient » disait « oui » pour la Boussole alimentaire après son
retrait du portail (D-365) : `protocol/fromPrisma.ts`, qui ne fait que valider
la référence d'un protocole, passait pour son lecteur, et cinq routes
`api/portail/*` avec lui (revue CodeRabbit de #1736). La cause n'était pas une
lecture de validation confondue avec un affichage, mais un faux appelant :
`mentionne` cherchait un spécificateur par simple inclusion, si bien que la
forme abrégée du baril, `@/lib/food-compass`, se trouvait dans
`'@/lib/food-compass/refValidation'` et `'@/lib/food-compass/plates'`.

`scripts/wn-matrice-consommation.mjs` lit désormais un spécificateur (`@/…`,
`./…`, `../…`) entier, entre guillemets. Pour toute la matrice, régénérée : la
Boussole passe à « non » (3 surfaces praticien au lieu de 20) ; le catalogue
des compléments, la compatibilité et la résolution perdent leurs faux appelants
(`catalogue` trouvé dans `catalogueDecisionPrisma`), le catalogue des
questionnaires les siens (`@/lib/questions` dans `@/lib/questionnaires/…`).
Aucune source ne devient dormante. Deux bancs neufs. Aucun code de `web/`.
