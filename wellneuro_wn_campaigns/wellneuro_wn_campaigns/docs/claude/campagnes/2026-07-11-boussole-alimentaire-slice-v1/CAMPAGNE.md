---
id: "2026-07-11-boussole-alimentaire-slice-v1"
titre: "Boussole alimentaire — vertical slice V1"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-00"
---

# Boussole alimentaire — vertical slice V1

## Objectif

Livrer une preuve de valeur limitée : sélectionner un aliment vedette, calculer/charger son profil intrinsèque et afficher une lecture contextualisée par l’objectif actif.

## Résultat observable

Pour Sophie Nicola, Jennifer Martin ou Michel Dogné fictifs, le même aliment reçoit une explication différente selon l’objectif, sans être qualifié de bon ou mauvais.

## Contraintes non négociables

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Hors périmètre global

- Scanner complet
- Panier
- Journal photo
- Chronobiologie
- Menus générés
- Biologie
- Score global aliment

## Décisions prises

- Le score intrinsèque ne dépend jamais du patient.
- Le patient ne voit que la lecture contextuelle.
- V1 = besoin 1, environ 12 aliments vedettes et substitutions simples.
- Pas de panier, photo repas, semaine ou chronobiologie dans ce slice.
- Aucune biologie dans le calcul.

## Questions ouvertes

- Stockage local/statique ou tables read-only après confirmation ?
- Quels 12 aliments vedettes ?
- Un produit OFF est-il nécessaire pour prouver le fallback dès V1 ?

## Dépendances

- Protocole V1 stable ; fiches conseils disponibles. Peut démarrer après `2026-07-11-decision-clinique-21j-v1`.
- Mapping clinique validé
- Attribution Ciqual
- Confirmation distincte si ingestion DB/migration

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d’origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Cadrage clinique, sources et licences | à_faire | aucun |
| LOT-01 | Mapping et normalisation versionnés | à_faire | LOT-00 |
| LOT-02 | Jeu de données Ciqual du slice | à_faire | LOT-01 |
| LOT-03 | Lecture contextuelle par objectif | à_faire | LOT-02 |
| LOT-04 | UX praticien et patient | à_faire | LOT-03 |
| LOT-05 | Substitutions et fiches aliments | à_faire | LOT-04 |
| LOT-06 | Tests, validation clinique et handoff | à_faire | LOT-05 |

## Commande `/wn` de reproduction

```text
/wn creer "Boussole alimentaire vertical slice V1" --source docs/claude/wellneuro-3 --slug boussole-alimentaire-slice-v1 --lots 7 --auto-final
```

## Done de campagne

- [ ] Mapping et normalisation versionnés.
- [ ] 12 aliments maximum dans le slice.
- [ ] Lecture contextuelle non culpabilisante.
- [ ] Sources/fiabilité visibles.
- [ ] Aucune dépendance à la biologie.
- [ ] Tests déterministes et E2E réussis.

## Backlog ultérieur

- Produit OFF
- Panier
- Repas/journée/semaine
- Chronobiologie
- Liste de courses
