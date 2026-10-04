---
id: "LOT-07"
titre: "Faits du laboratoire : intervalle et marquage imprimés"
statut: "à_faire"
dépend_de: "LOT-02, BIO-PARCOURS BP-00 et BP-01"
---

# LOT-07 — Faits du laboratoire : intervalle et marquage imprimés

## But

Transcrire, comme **faits du laboratoire**, l'intervalle de référence et le
marquage d'anomalie tels qu'imprimés sur le compte rendu, avant la purge du
document (`D-258`). Ajouté par `D-266` §15 et avancé avant LOT-04.

## Résultat observable

Sur un compte rendu importé, l'intervalle et le marquage imprimés sont
proposés en lignes candidates. Ils sont validés par le praticien, persistés sur
le résultat validé et restitués juxtaposés, attribués au laboratoire. Ils ne
produisent ni statut, ni couleur, ni priorité.

## Périmètre

Schéma d'extraction et parseur à clés exactes étendus, colonnes de staging,
persistance sur le résultat validé, validation humaine, restitution
juxtaposée, contrats SQL.

## Hors périmètre

- Les résultats qualitatifs (toujours écartés, `D-256` §3).
- Toute lecture de valeur par le moteur, toute plage Wellneuro.
- L'adaptateur laboratoire (LOT-05, inchangé).

## Fichiers probables

- `web/prisma/migrations/` (migration seule, première PR)
- `web/src/lib/biology-library/import/`

## Interdits

- **Migration : confirmation distincte**, seule dans sa PR, `release-db`
  approuvée, constat par conteneur, puis le code dans une seconde PR
  (`D-087`, `D-266` §11). Passe Codex obligatoire.
- La consigne `D-256` (« ni valeurs de référence ») est amendée par décision
  **avant** le code ; `D-157` est précisée ; `D-258` et `D-059` §4 restent
  intactes.
- Un intervalle transcrit n'est jamais recalculé ni réutilisé comme plage
  citable par une règle.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-02 ; BIO-PARCOURS BP-00 (`D-266`) et BP-01 (garde de non-consommation).

## Étapes

- [ ] Rédiger la décision amendant la consigne `D-256` et précisant `D-157`.
- [ ] Livrer la migration seule, puis la faire appliquer par `release-db`.
- [ ] Livrer l'extraction, le staging, la validation et la restitution.

## Tests

T3 ; contrat de staging à jour ; banc « un intervalle transcrit ne produit ni
statut, ni couleur, ni priorité ».

## Critères de done

`release-db` constatée ; contrats à jour ; restitution juxtaposée attribuée au
laboratoire.

## Résultats

À compléter à la clôture.
