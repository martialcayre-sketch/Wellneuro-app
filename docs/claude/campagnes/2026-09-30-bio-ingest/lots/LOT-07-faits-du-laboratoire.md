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
proposés en lignes candidates. Ils sont validés par le praticien, conservés sur
la ligne lue (`intervalle_lu`, `marquage_lu`, `D-267` : jamais sur le résultat,
`D-256` A5 intact) et restitués juxtaposés au résultat qu'elle a créé,
attribués au laboratoire. Ils ne
produisent ni statut, ni couleur, ni priorité.

## Périmètre

Schéma d'extraction et parseur à clés exactes étendus (`bio-extraction-v2`),
colonnes de staging, validation humaine, restitution juxtaposée, contrats SQL,
banc BP-01 des lecteurs étendu aux deux colonnes, TRUST `usage_ia` v5 et
registre RGPD (`D-267` §7-§8).

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
- La consigne `D-256` (« ni valeurs de référence ») est amendée et `D-157`
  précisée par `D-267` ; `D-258` et `D-059` §4 restent intactes.
- Rien sur `ResultatBiologique` (`D-267` §2).
- Un intervalle transcrit n'est jamais recalculé ni réutilisé comme plage
  citable par une règle.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-02 ; BIO-PARCOURS BP-00 (`D-266`) et BP-01 (garde de non-consommation).

## Étapes

- [x] Rédiger la décision amendant la consigne `D-256` et précisant `D-157`
  (`D-267`).
- [x] Livrer la migration seule (`20261005150000_bio_ingest_faits_laboratoire_v1`,
  contrat `bio_ingest_faits_laboratoire_v1_negatif.sql`), puis la faire
  appliquer par `release-db`.
- [ ] Servir et constater TRUST `usage_ia` v5 et le registre RGPD (`D-267` §8),
  avant toute ligne de code d'extraction.
- [ ] Livrer l'extraction, le staging, la validation et la restitution.

## Question ouverte pour le code

Un intervalle imprimé de plus de 300 caractères (tableau par phase du cycle,
par exemple) ferait échouer tout l'import sous `createMany`. Tronquer
trahirait le verbatim : choisir et tester un comportement (fait laissé NULL et
signalé, ou échec motivé). Relevé par `wn-reviewer` sur #1326. La preuve de
survie à la purge (`D-267` §3) vit dans `bio_ingest_faits_laboratoire_v1_negatif.sql`.

## Tests

T3 ; contrat de staging à jour ; banc « un intervalle transcrit ne produit ni
statut, ni couleur, ni priorité ».

## Critères de done

`release-db` constatée ; contrats à jour ; restitution juxtaposée attribuée au
laboratoire.

## Résultats

À compléter à la clôture.
