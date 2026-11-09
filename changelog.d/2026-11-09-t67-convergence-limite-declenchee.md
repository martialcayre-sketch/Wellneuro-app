### Convergence : une règle citée « déclenchée » n'est pas une recommandation servie (D-470, t67, 2026-11-09)

Question `20261107-1748-a` (liste commune), répondue le 2026-11-07 ; texte validé le 2026-11-09. Précise D-455 §1
(double verrou). Aucune migration ; re-signature de `ORIENTATION_RULES_V1`, `release-db` approuvée séparément.

- Quatrième limite commune de `LIMITATIONS_CONVERGENCE` (`convergenceV1.ts`), sur toutes les cartes `CONV-B<n>` :
  « Les règles citées comme « déclenchées » satisfont leur critère de déclenchement sur les données retenues. Leurs
  recommandations peuvent toutefois être affichées comme éteintes, rangées parmi les explorations écartées ou
  absentes parce que les questionnaires concernés sont déjà renseignés. »
- Le double verrou de D-455 §1 vise l'activation globale de l'orientation (drapeau et signature), pas l'affichage
  de chaque recommandation citée.
- Contre-preuve avant re-signature : sans la nouvelle limite, la table hache l'empreinte signée du 2026-11-07
  (`16517749…`) ; nouvelle empreinte `a9aaaf32…`. Instantané des textes (`convergenceEngine.test.ts`) mis à jour.
