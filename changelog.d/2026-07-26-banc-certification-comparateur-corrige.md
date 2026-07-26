### Corrigé

- **Banc de certification — cinq défauts du comparateur, dans les deux sens.**
  Il accusait à tort : les sous-échelles étaient comparées aux `sections` (le
  découpage d'écran) et non aux dimensions calculées par le moteur ; les
  inversions n'étaient cherchées que dans le *type* de scoring ; les bornes
  étaient balayées item par item, ce qui est faux dès qu'une composante décroît
  quand l'item croît. Il taisait aussi : un plafond non atteint ne produisait
  plus aucune ligne — pas même pour dire que le banc n'avait pas conclu — et
  aucune règle ne lisait le **minimum** de la source.
  L'inversion est désormais établie **en exécutant le moteur** : on monte un
  item d'un cran et l'on regarde le sens dans lequel bouge le score. C'est le
  seul procédé qui couvre les trois mécanismes du catalogue — `reversed`,
  `reversedItems`, et l'inversion écrite en dur dans le moteur (QIF, ECAB) — et
  il détecte en prime une déclaration *morte*, annoncée mais sans effet.
  Après rejeu des 59 instruments : **10 instruments** à divergence critique au
  lieu de 11, **14 critiques** au lieu de 16, **3 `sous_echelles`** au lieu de
  7. L'UPPS, le QIF et le Karasek sont blanchis ; **`Q_CAN_02` entre dans la
  liste** alors qu'il figurait parmi les 12 déclarés « propres » — il descend à
  21 sous une échelle publiée 23–92. Onze tests de non-régression, écrits
  d'après les instruments réels.

### Ajouté

- **`certify.mjs --recomparer`** : rejeu de la comparaison sur les
  spécifications déjà en cache, sans appel de modèle. Corriger le comparateur ne
  coûte plus deux lectures par instrument.
- **Dossier d'arbitrage du lot 4**
  (`docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/ARBITRAGES-2026-07-26.md`)
  : huit décisions praticien, chacune avec ce qui a été vérifié et comment
  (exécution du moteur, lecture sur pièces, ou inférence à confirmer). Aucune
  correction n'est appliquée — le banc constate, le praticien tranche.
