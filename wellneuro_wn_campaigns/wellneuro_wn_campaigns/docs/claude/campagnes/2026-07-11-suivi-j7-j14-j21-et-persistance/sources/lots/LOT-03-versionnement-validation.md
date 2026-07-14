---
id: "LOT-03"
titre: "Versionnement et validation du protocole"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Versionnement et validation du protocole

## But

Persister les versions et la validation praticien.

## Résultat observable

Brouillon, validation, diffusion et historique traçables.

## Périmètre

- Sauvegarde explicite.
- Nouvelle version sur changement clinique défini.
- Horodatage validation.
- Lecture version active et historique.

## Hors périmètre

- Coédition temps réel
- Signature qualifiée

## Fichiers probables

- routes protocoles
- web/src/lib/protocol/**
- ProtocolMiniBuilder et panneaux validation

## Interdits

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Brancher le builder à l’API.
- [ ] Gérer erreurs/conflits simples.
- [ ] Afficher statut et version.
- [ ] Tester historique.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Un protocole validé n’est pas silencieusement écrasé.
- [ ] Le praticien sait quelle version est active.

## Risques / points de vigilance

- Créer trop de versions pour de simples changements de forme.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
