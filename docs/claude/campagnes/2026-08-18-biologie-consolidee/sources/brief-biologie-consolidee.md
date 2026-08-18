# Brief — Biologie consolidée : fermer les dettes de la surface vivante

## Objectif

La proposition de bilan biologique et le courrier médecin ancré sont en
production depuis le 2026-08-18 (`WN_CB_PROPOSITION` posé, campagne T0 close,
PR #710). Trois dettes ont été nommées à la clôture, aucune soldée. La
campagne les ferme : l'ancrage devient une garde lue, la surface a des
parcours joués, et le garde-fou des packs devient un contrat.

## État réel au cadrage (2026-08-18)

- `ancrage_sha256`/`ancrage_version` (D-073) sont en ÉCRITURE SEULE : aucun
  chemin de lecture ne les expose ni ne les compare à la table courante
  (fragment changelog `2026-08-18-courrier-biologie-branchement-lot06-clos.md`).
- Aucun E2E ne couvre la proposition ni le courrier, alors que la surface est
  vivante en production.
- Le prérequis « aucun pack actif ne référence un qid de `IDS_SUSPENDUS` »
  n'est asséré par aucun contrat `prisma/checks` — il a déjà cassé une fois
  (2026-08-06 18:02) et sa réserve est écrite à la clôture de
  dettes-packs-residuelles (:161-170).
- Question à confirmer comme choix, pas comme oubli : le courrier ne nomme
  jamais le patient dans son texte (minimisation, seul `id_patient` relie).

## Lots pressentis (3)

1. **Lecteur d'ancrage dans le fil de correspondance** : afficher
   « concordante / périmée » en comparant l'ancre consignée au SHA vivant de
   la table — c'est ce qui fait des colonnes D-073 la garde promise.
2. **E2E proposition + courrier** : parcours praticien complet (dossier →
   panneau → déclaration panel documenté → courrier), patients fictifs
   uniquement (Sophie Nicola, Jennifer Martin, Michel Dogné). E2E exclusifs
   au Mac, jamais deux runs en parallèle.
3. **Contrat `prisma/checks` packs actifs vs instruments suspendus** — le
   garde-fou cassé une fois devient un contrat joué par le CI.

## Contraintes et interdits

- `indicationsBiologieV1.ts`, `statuts.ts`, `courrier.ts` : périmètre
  intouchable sauf décision clinique D-xxx (tables signées).
- Aucune migration prévue ; si un lot en découvre une, il se scinde.
- Textes UI en français ; DC-34 (explicabilité) guide le lot 1.

## Dépendances

Aucune externe. Peut suivre immédiatement la clôture T0.
