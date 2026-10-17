### Corpus : le journal des décisions de claims admet l'acte « étiquetage » (D-320, J3-12c, migration)

- Migration `20261017100000_rag_claim_decisions_etiquetage_v1` : un sixième
  type d'acte, `etiquetage`, pour poser ou corriger les clés de lien d'un
  claim déjà signé (besoins 1 à 12, rubrique parmi les dix des fiches
  d'usage) sans le re-signer. CHECK seul : un claim par acte, aucune
  décision, aucune pièce de tirage, clés complètes. Aucune donnée touchée,
  aucun changement de `schema.prisma`.
- Contrat SQL négatif `rag_claim_decisions_etiquetage_v1.sql` en CI ; banc
  d'alignement de la liste des rubriques sur `RUBRIQUES_FICHE_USAGE`.
- Le code qui pose les clés (route, atelier) suit dans une seconde PR, après
  application constatée.
