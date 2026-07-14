---
id: "LOT-03"
titre: "Validation et handoff"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Validation et handoff

## But

Clôturer l’alignement et transmettre un état de départ fiable.

## Résultat observable

Un handoff court : état confirmé, dettes actives, fichiers canoniques et autorisation de lancer la campagne suivante.

## Périmètre

- Relire le diff.
- Documenter les commandes exécutées.
- Mettre à jour le statut de campagne.
- Préparer le contexte minimal pour la campagne suivante.

## Hors périmètre

- Commencer le cockpit
- Corriger une dette technique identifiée

## Fichiers probables

- CAMPAGNE.md
- lots/LOT-03-validation-handoff.md
- documentation modifiée dans LOT-02

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

- [ ] Vérifier tous les critères.
- [ ] Produire la liste des dettes hors périmètre.
- [ ] Décider go/no-go.
- [ ] Mettre à jour le journal selon les pratiques du repo.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le go/no-go est explicite.
- [ ] Aucune question bloquante n’est masquée.
- [ ] La prochaine campagne connaît ses dépendances réelles.

## Risques / points de vigilance

- Déclarer go alors qu’une divergence critique reste ouverte.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
