---
id: "LOT-00"
titre: "Audit des sources de vérité"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — Audit des sources de vérité

## But

Lire les documents canoniques et identifier les affirmations susceptibles d'être obsolètes.

## Résultat observable

Une matrice `affirmation → source → date → confiance → vérification requise`, sans modification.

## Périmètre

- Lire `docs/roadmap.md`, `docs/claude/SESSION_LOG.md`, `docs/claude/PROJET_CONTEXTE.md` et les README pertinents.
- Lister les modules annoncés comme terminés, en cours ou différés.
- Repérer les conflits de dates et de statut.

## Hors périmètre

- Modifier des fichiers
- Interpréter le code en profondeur
- Décider une architecture cible

## Fichiers probables

- docs/roadmap.md
- docs/claude/SESSION_LOG.md
- docs/claude/PROJET_CONTEXTE.md
- README.md

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Lire la dernière entrée du journal de session.
- [ ] Construire la matrice des divergences.
- [ ] Marquer chaque point comme confirmé, probable ou à vérifier.
- [ ] Produire une note de cadrage pour LOT-01.

## Tests

- Aucun test applicatif
- Relire les citations et dates
- Vérifier qu'aucune donnée patient réelle n'est reproduite

## Critères de done

- [ ] La matrice couvre Sheets, OAuth, routes, modules livrés et dette UX.
- [ ] Aucune modification du dépôt.

## Risques / points de vigilance

- Prendre un document récent pour vrai sans vérifier le code.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
