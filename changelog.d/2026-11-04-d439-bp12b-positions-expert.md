### Décisions : BP-12b, positions d'expert et arbitrage de conflit (D-439, 2026-11-04)

- D-439 cadre BP-12b. Une position d'expert signée devient une pièce
  versionnée en base, `WN-PE-NNNN@vN.M`, sous le contrat de D-266 §8. Elle
  n'est jamais un claim du corpus et n'entre jamais dans la recherche.
- L'arbitrage d'un conflit de sources déclaré se pose par question (une
  fiche d'usage), en ajout seul, sans donnée patient. Il s'affiche à côté
  de l'escalade de DC-55, qu'il ne remplace pas.
- `conflitsSourcesV1` sera re-signé avec les conflits des dossiers clos.
  Les positions des cinq dossiers clos entreront par l'atelier, jamais par
  une migration.
- Décision seule : aucune migration, aucun code, aucun drapeau dans cette
  PR. La migration suit dans sa propre PR.
