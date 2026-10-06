---
id: "LOT-07"
titre: "Faits du laboratoire : intervalle et marquage imprimés"
statut: "terminé"
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
- [x] Servir et constater TRUST `usage_ia` v5 et le registre RGPD (`D-267` §8),
  avant toute ligne de code d'extraction (#1328, constatée dans l'image servie
  682d7de1 le 2026-10-05).
- [x] Migration seule du signal « fait non transcrit » (`D-267` §10,
  `20261005210000_bio_ingest_faits_non_transcrits_v1`), `release-db`, constat
  (#1332, run `release-db` 37372358586 vert, colonnes, CHECK et fonction
  constatés par conteneur le 2026-10-05, production sur d0ee7e87).
- [x] Livrer l'extraction, le staging, la validation et la restitution
  (`bio-extraction-v2`, PR du code).

## Question tranchée pour le code

Un intervalle imprimé de plus de 300 caractères (tableau par phase du cycle,
par exemple) aurait fait échouer tout l'import sous `createMany`. **Tranché
(`D-267` §10, arbitrage du 2026-10-05)** : le fait reste NULL et la ligne
porte `intervalle_non_transcrit` (de même `marquage_non_transcrit` au-delà de
50 caractères), affiché à la validation. Rien n'est tronqué, l'import
n'échoue pas, aucune borne nouvelle. Le code mesure la longueur comme la base
(points de code, après le même rognage) et ne pose aucune `maxLength` dans le
schéma envoyé au modèle. La preuve de survie à la purge (`D-267` §3) vit dans
`bio_ingest_faits_laboratoire_v1_negatif.sql`.

## Tests

T3 ; contrat de staging à jour ; banc « un intervalle transcrit ne produit ni
statut, ni couleur, ni priorité ».

## Critères de done

`release-db` constatée ; contrats à jour ; restitution juxtaposée attribuée au
laboratoire.

## Résultats

- `bio-extraction-v2` : schéma fermé à deux clés de plus, sans `maxLength` ;
  consigne amendée (`D-267` §4), sans déduction de marque. Parseur : un fait
  vide ou sans caractère visible vaut `null` sans signal, un fait au-delà de
  sa borne (points de code) vaut `null` avec signal.
- Restitution : écran de validation et série des mesures, « Imprimé par le
  laboratoire », silences de §5 éprouvés à la route (aucun fait, unité
  discordante, correction, valeur modifiée à la validation). La décision du praticien ne touche à aucun fait
  (`decisions.test.ts`, données exactes).
- Revue `wn-reviewer` : GO, ni P0 ni P1. P2 corrigés : banc BP-01 étendu à la
  charge `faitsLaboratoire` ; classe du paragraphe et de la ligne figées ;
  faits rendus après les marqueurs DC-30 ; NUL et caractères invisibles
  rendus `null` (un NUL faisait échouer tout l'import).
- Copilot (#1333) : NUL intérieur retiré ; exemption portée par le vrai
  helper e2e et exercée par un spec ; lecture de §7 explicitée dans le banc.
- Codex (#1333) : P1 corrigé — valeur modifiée à la validation ⇒ silence
  dans la série (`D-267` §5 précisé) ; P2 corrigés — surrogate isolé, style
  sur la marque exemptée.
- Ouvert, à arbitrer (handoff du lot) : intervalle hors de l'élément exempté
  de la sentinelle ; intervalle imprimé dans l'autre unité d'un compte rendu
  à double unité.
- Reste à constater après déploiement : une extraction réelle porte
  `version_prompt = 'bio-extraction-v2'` et des faits non nuls.
