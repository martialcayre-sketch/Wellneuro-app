### BIO-INGEST LOT-07 : migration des faits du laboratoire (2026-10-05)

- `lignes_biologiques_candidates` gagne `intervalle_lu` et `marquage_lu`
  (`D-267`). Ces colonnes portent les faits tels qu'imprimés : TEXT
  nullables, non vides si présentes (`~ '\S'`), bornées à 300 et 50
  caractères (bornes techniques, aucune clinique).
- La fonction de modification de la ligne fige ces deux colonnes avec ce qui a
  été lu : une décision ne les réécrit pas.
- `resultats_biologiques` reste inchangé (`D-256` A5).
- Le nouveau contrat `bio_ingest_faits_laboratoire_v1_negatif.sql` vérifie
  six points : absence ⇒ NULL, verbatim, refus du vide (tabulation comprise),
  bornes, gel à la décision, survie à la purge. Il vérifie aussi qu'aucune
  colonne de faits n'apparaît sur le résultat.
- La migration est livrée seule. Le code consommateur attendra `release-db`,
  le constat par conteneur, puis TRUST `usage_ia` v5 et le registre RGPD.
