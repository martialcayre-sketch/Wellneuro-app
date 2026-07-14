---
id: "2026-07-11-decision-clinique-21j-v1"
titre: "Décision clinique 21 jours V1 — cockpit et protocole minimal"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-00"
---

# Décision clinique 21 jours V1 — cockpit et protocole minimal

## Objectif

Livrer un vertical slice complet permettant au praticien de passer de la fiche patient existante à un protocole phase 1 de 21 jours en moins de 10 minutes, sans migration.

## Résultat observable

Sur la fiche d’un patient fictif, le praticien voit une priorité, les convergences, les limites, construit 3 actions, voit la charge, valide et imprime un document patient.

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

- Persistance DB
- Envoi automatique patient
- Messagerie
- Biologie réelle
- Boussole alimentaire
- Base compléments
- Modification scoring
- Chatbot

## Décisions prises

- Phase 1 limitée à 3 actions maximum, 1 fiche prioritaire et 1 critère de suivi.
- Le protocole V1 n’est pas persistant.
- Le cockpit affiche d’abord la décision, les détails restent accessibles en second niveau.
- Aucun appel IA nouveau dans cette campagne.
- Le premier document est HTML imprimable, pas PDF natif.

## Questions ouvertes

- Quelles données existantes peuvent alimenter le résumé sans nouvelle API ?
- Le score de charge doit-il être modifiable manuellement ou seulement calculé ?
- Quel emplacement conserve l’historique technique sans dominer l’écran ?

## Dépendances

- Campagne `2026-07-11-alignement-documentaire-etat-reel` terminée avec go.
- Design system D1 existant
- Mon équilibre et données patient déjà disponibles

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d’origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit de la fiche patient et des données disponibles | à_faire | aucun |
| LOT-01 | Contrat UX, états et parcours E2E | à_faire | LOT-00 |
| LOT-02 | Découpage du cockpit sans régression | à_faire | LOT-01 |
| LOT-03 | Résumé décisionnel, données manquantes et discordances | à_faire | LOT-02 |
| LOT-04 | Protocole 21 jours statique | à_faire | LOT-03 |
| LOT-05 | Charge thérapeutique, validation et document patient | à_faire | LOT-04 |
| LOT-06 | Accessibilité, mobile et compatibilité legacy | à_faire | LOT-05 |
| LOT-07 | Tests, documentation et go/no-go | à_faire | LOT-06 |

## Commande `/wn` de reproduction

```text
/wn creer "Décision clinique 21 jours V1" --source docs/claude/wellneuro-3 --slug decision-clinique-21j-v1 --lots 8 --auto-final
```

## Done de campagne

- [ ] Parcours E2E praticien fonctionnel avec les trois patients fictifs.
- [ ] Aucune migration ni modification API non nécessaire.
- [ ] Maximum 3 actions appliqué et alerté.
- [ ] Validation explicite avant document final.
- [ ] Type-check, secrets, scoring-check et smoke tests réussis.
- [ ] Documentation et handoff produits.

## Backlog ultérieur

- Persistance et versionnement protocole
- Check-ins J7/J14/J21
- Compagnon patient
- Fiches conseils enrichies
