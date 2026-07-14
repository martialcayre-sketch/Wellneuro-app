---
id: "2026-07-11-suivi-j7-j14-j21-et-persistance"
titre: "Persistance du protocole et suivi J7/J14/J21"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-00"
---

# Persistance du protocole et suivi J7/J14/J21

## Objectif

Persister et versionner le protocole 21 jours validé, ajouter un suivi minimal J7/J14/J21 et exposer un compagnon patient calme.

## Résultat observable

Après validation praticien, le protocole est retrouvé, son historique est traçable, le patient voit son action du jour et les check-ins alimentent une décision J21.

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

- Biologie réelle
- Messagerie libre
- Notifications nombreuses
- IA autonome patient
- Boussole et compléments

## Décisions prises

- Le schéma est spécifié avant toute migration.
- LOT-02 est bloqué jusqu’à confirmation explicite.
- Une seule migration courte couvre le modèle validé.
- Le check-in reste très court et non diagnostique.
- Le patient voit une action principale, pas tout le cockpit.

## Questions ouvertes

- Quel mécanisme d’auth patient est retenu pour l’espace persistant ?
- Les snapshots J7/J14/J21 sont-ils calculés à la volée ou stockés ?
- Quels événements créent une nouvelle version du protocole ?

## Dépendances

- Campagne `2026-07-11-decision-clinique-21j-v1` terminée avec validation UX.
- Confirmation explicite obligatoire avant LOT-02
- Auth patient E3/R8 à vérifier

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d’origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit des flux et besoins de persistance | à_faire | aucun |
| LOT-01 | Spécification du modèle et gate migration | à_faire | LOT-00 |
| LOT-02 | Migration Prisma et API minimale — confirmation obligatoire | bloqué_confirmation | LOT-01 |
| LOT-03 | Versionnement et validation du protocole | à_faire | LOT-02 |
| LOT-04 | Check-ins et décision J21 | à_faire | LOT-03 |
| LOT-05 | Compagnon patient minimal | à_faire | LOT-04 |
| LOT-06 | Tests, rétrocompatibilité et handoff | à_faire | LOT-05 |

## Commande `/wn` de reproduction

```text
/wn creer "Persistance protocole et suivi J7 J14 J21" --source docs/claude/wellneuro-3 --slug suivi-j7-j14-j21-et-persistance --lots 7 --auto-final
```

## Done de campagne

- [ ] Migration explicitement confirmée et documentée.
- [ ] Protocoles versionnés et récupérables.
- [ ] Check-ins courts et non anxiogènes.
- [ ] Décision J21 disponible côté praticien.
- [ ] Compagnon patient utilisable mobile.
- [ ] Tests de sécurité, droits et rétrocompatibilité réussis.

## Backlog ultérieur

- Notifications
- Momentum avancé
- Messagerie contextualisée
- Documents archivés multi-destinataires
