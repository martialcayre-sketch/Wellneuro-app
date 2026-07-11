---
id: "LOT-03"
titre: "boucle-tests-reparation-bornees"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-03 — Boucle tests et réparation bornées

## But

Décrire une boucle de validation et de réparation avec limite stricte de tentatives.

## Résultat observable

Un mécanisme clair : tests → réparation → tests, puis arrêt après trois échecs.

## Périmètre

- matrice de tests minimaux ;
- classification des erreurs ;
- compteur de tentatives ;
- étiquette `needs-human`.

## Hors périmètre

- ajout de fonctionnalité ;
- élargissement des tests sans raison ;
- contournement silencieux d’un échec.

## Fichiers probables

- `.claude/skills/wn-test/SKILL.md`
- `.claude/skills/wn-debug/SKILL.md`
- `.claude/skills/wn-review/SKILL.md`
- `BOUCLE_TEST_REPARATION_LOT03.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration.
- Pas de déploiement.

## Étapes

- [x] Définir la liste des tests utiles.
- [x] Définir les règles de retry.
- [x] Définir la sortie d’échec.
- [x] Définir le passage en needs-human.

## Tests

- Cas d’échec simulé.
- Cas de succès après correction unique.

## Critères de done

- La boucle est bornée.
- Les sorties d’arrêt sont explicites.
- La réparation ne peut pas tourner indéfiniment.

## Résultats

- Lot clôturé le 2026-07-11.
- Contrat de boucle bornée produit dans `BOUCLE_TEST_REPARATION_LOT03.md`.
- Limite fixée à 3 tentatives avec escalade `needs-human` au-delà.
- Classification des erreurs alignée avec les garde-fous WN-AUTO.
