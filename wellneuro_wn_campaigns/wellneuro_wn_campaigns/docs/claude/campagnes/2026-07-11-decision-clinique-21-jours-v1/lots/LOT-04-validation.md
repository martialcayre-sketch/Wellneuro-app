---
id: "LOT-04"
titre: "Protocole 21 jours minimal"
statut: "terminé"
dépend_de: "LOT-03"
---

# LOT-04 — Protocole 21 jours minimal

## But

Permettre la composition d'un brouillon de protocole sobre, limité à trois
actions, puis sa validation explicite par le praticien.

## Résultat observable

Un ProtocolDraft avec objectif, actions, plans, charge, critères observables,
précautions, versions et statut de validation.

## Périmètre

- trois actions maximum ;
- plans idéal, minimal et secours ;
- budget de charge et justification des dérogations ;
- brouillon et validation praticien.

## Hors périmètre

- persistance longitudinale C2 ;
- envoi automatique ;
- choix autonome de produit, dose ou priorité.

## Fichiers probables

- DecisionCard LOT-03
- intentions cliniques existantes après audit
- composants partagés HC-F

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [x] Vérifier les hypothèses.
- [x] Implémenter le changement minimal.
- [x] Exécuter les validations.
- [x] Relire le diff.
- [x] Documenter les résultats.

## Tests

Tests unitaires du budget de charge, validation des transitions d'état et E2E
brouillon→validation sans transmission implicite.

## Critères de done

- maximum de trois actions garanti ;
- protocole excessif bloqué ou justifié ;
- plans et critères présents ;
- validation humaine obligatoire.

## Résultats

Le lot livre un contrat pur `ProtocolDraft` versionné et hashé, lié à une
`DecisionCard` dont la priorité a été explicitement sélectionnée par le
praticien. Le brouillon contient une raison d'être, un critère observable à
J21, jusqu'à trois actions avec plans idéal/minimal/secours et une charge
qualitative saisie manuellement. Aucun barème, score ou seuil de charge n'est
calculé. Une charge « excessive » exige une justification.

Les seuls états sont `draft` et `practitioner_reviewed`. Toute révision remet
le protocole en brouillon ; aucun statut actif, envoi ou stockage n'existe. Les
cartes en abstention, sans priorité sélectionnée ou avec sécurité non revue
sont refusées. Une intention de complément exclut les champs produit, forme,
marque et dose, avec rappel visible dans l'interface.

`ProtocolMiniBuilder` fonctionne entièrement en mémoire, avertit avant reset,
affiche « Brouillon local non enregistré » et ne produit aucune requête
réseau. Dans la fiche réelle, il reste désactivé tant que le flux runtime ne
fournit pas de `DecisionCard` sélectionnée. `PatientPreview` est inchangé.

Validations : 12 tests Vitest ciblés, 140 tests Vitest globaux, `type-check`, lint,
certification des 63 questionnaires, contrôle anti-secrets, `git diff --check`
et revue indépendante GO. Le scénario Playwright bureau/tablette/mobile a
été enrichi mais son exécution locale reste bloquée avant démarrage par
l'absence de `NEXTAUTH_SECRET`.

Aucune API, persistance, migration Prisma/SQL, écriture Supabase, règle ou
seuil clinique, IA, posologie ou diffusion patient n'a été ajouté.
