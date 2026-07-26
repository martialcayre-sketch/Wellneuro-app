### Corrigé

- **Banc de certification — trois défauts du comparateur qui accusaient à tort.**
  Les sous-échelles étaient comparées aux `sections` (le découpage d'écran) et
  non aux dimensions calculées par le moteur ; les inversions n'étaient
  cherchées que dans le *type* de scoring, en ignorant `subScores[].reversed` ;
  les bornes de score étaient balayées item par item, ce qui est faux dès qu'une
  composante décroît quand l'item croît. Après rejeu des 59 instruments :
  **9 instruments** à divergence critique au lieu de 11, **13 critiques** au lieu
  de 16, **3 `sous_echelles`** au lieu de 7. L'UPPS (ses 25 inversions sont bien
  appliquées) et le QIF (99,9/100 atteignable) sortent de la liste ; le PSQI perd
  une de ses deux critiques (21/21 atteignable). Six tests de non-régression,
  écrits d'après les instruments réels, échouent sur la version d'origine.

### Ajouté

- **`certify.mjs --recomparer`** : rejeu de la comparaison sur les
  spécifications déjà en cache, sans appel de modèle. Corriger le comparateur ne
  coûte plus deux lectures par instrument.
- **Dossier d'arbitrage du lot 4**
  (`docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/ARBITRAGES-2026-07-26.md`)
  : sept décisions praticien, chacune avec ce qui a été vérifié et comment
  (exécution du moteur, lecture sur pièces, ou inférence à confirmer). Aucune
  correction n'est appliquée — le banc constate, le praticien tranche.
