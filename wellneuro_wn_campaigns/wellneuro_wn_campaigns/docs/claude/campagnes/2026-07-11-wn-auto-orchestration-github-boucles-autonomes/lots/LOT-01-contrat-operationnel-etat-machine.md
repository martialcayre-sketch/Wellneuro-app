---
id: "LOT-01"
titre: "contrat-operationnel-etat-machine"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Contrat opérationnel et état machine

## But

Décrire comment une tâche WN-AUTO passe d’une intention à un état observable durable.

## Résultat observable

Une machine à états simple, lisible et compatible avec GitHub Issues / Projects.

## Périmètre

- états de travail ;
- artefacts durables ;
- transitions autorisées ;
- points de validation humaine.

## Hors périmètre

- implémentation GitHub Actions ;
- orchestration de branche ;
- notifications externes.

## Fichiers probables

- `CAMPAIGN_DRAFT.md`
- `CAMPAGNE.md`
- `CONTRAT_OPERATIONNEL_LOT01.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration.
- Pas de code applicatif.

## Étapes

- [x] Définir les états.
- [x] Définir les transitions.
- [x] Définir les artefacts persistants.
- [x] Définir les points d’arrêt.

## Tests

- Lecture croisée avec la proposition utilisateur.
- Validation de cohérence avec le flux `/wn-campaign-run`.

## Critères de done

- Un lot peut être décrit sans ambiguïté.
- Les états de blocage sont connus.
- Le contrat supporte une reprise de session.

## Résultats

- Lot clôturé le 2026-07-11.
- Contrat opérationnel canonique produit dans `CONTRAT_OPERATIONNEL_LOT01.md`.
- État machine défini avec transitions autorisées/interdites et règles de reprise.
- Points d'arrêt rouges alignés avec la matrice de risque LOT-00.
