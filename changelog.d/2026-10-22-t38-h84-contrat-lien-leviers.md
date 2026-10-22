### Besoins : contrat du lien besoin → leviers (H84, D-338 §1, t38)

- **Module pur `web/src/lib/besoins/lienLeviers.ts`** : liste fermée des
  leviers (règle, action, analyte, axe, fiche), trois modes de lien — clé
  posée dans la table signée du levier, déduction d'un amont signé nommé
  (`BESOIN_SOURCES` seul, D-338 §1), « sans objet » avec motif écrit — et
  `controlerLien`, qui refuse besoin hors des douze, doublon, liste vide,
  amont inconnu, motif vide et champ étranger au mode.
- **Arbitrages du responsable du 2026-10-22** : module hors des chemins
  cliniques ; trois modes ; motif en texte libre non vide (aucune liste
  arbitrée) ; état de mesure d'un besoin hors contrat.
- Le banc lit, sans les toucher, les `needIds` des tables de priorité et
  d'orientation : tous valides au contrat. Aucune clé posée, aucune table
  signée ni version du score touchée (D-338 §2), aucune migration.
