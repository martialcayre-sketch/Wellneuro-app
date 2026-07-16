---
id: "LOT-03"
titre: "Versionnement et validation du protocole"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Versionnement et validation du protocole

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-03-versionnement-validation.md`.

## But

Persister les versions du `ProtocolDraft` et la validation praticien
(chaîne Relu → Validé → Envoyé, jamais d'envoi automatique).

## Résultat observable

Brouillon, validation, diffusion et historique traçables ; la version active
est identifiable sans ambiguïté.

## Périmètre

- Sauvegarde **explicite** (états HC-F — jamais de sauvegarde silencieuse).
- Nouvelle version (ligne append-only, `supersedes_draft_id`) sur changement
  clinique défini ; les hashes `inputHash`/`decisionCardInputHash` du contrat
  C1 restent la clé de cohérence.
- Horodatage de la validation praticien.
- Lecture de la version active et de l'historique.

## Hors périmètre

- Coédition temps réel.
- Signature qualifiée.
- Interface de relecture time-travel (SP-TT — seule la table
  `relecture_notes` relève de C2A).

## Fichiers probables

- Routes protocoles (`web/src/app/api/praticien/protocoles/**`)
- `web/src/lib/protocol/**`
- `ProtocolMiniBuilder` et panneaux de validation
  (`web/src/components/patient-cockpit/**`)

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Brancher le builder à l'API.
- [ ] Gérer erreurs/conflits simples.
- [ ] Afficher statut et version.
- [ ] Tester l'historique.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Un protocole validé n'est pas silencieusement écrasé.
- [ ] Le praticien sait quelle version est active.

## Risques / points de vigilance

- Créer trop de versions pour de simples changements de forme.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
