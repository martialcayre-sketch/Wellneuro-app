---
id: "LOT-05"
titre: "Compagnon patient minimal"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Compagnon patient minimal

## But

Exposer la priorité, l’action du jour, la fiche et le check-in sur mobile.

## Résultat observable

Accueil patient calme lié au protocole actif.

## Périmètre

- Une action principale.
- Progression simple.
- Mode jour difficile/je n’ai pas suivi.
- Accès protocole et fiche.

## Hors périmètre

- Score détaillé
- Messagerie
- Notifications push

## Fichiers probables

- web/src/app/patient/**
- web/src/components/patient-companion/**
- layout patient

## Interdits

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Intégrer les données persistées.
- [ ] Respecter thème patient clair.
- [ ] Tester états sans protocole/check-in dû/terminé.
- [ ] Tester tactile.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le patient sait quoi faire en 10 secondes.
- [ ] Aucun détail clinique anxiogène.

## Risques / points de vigilance

- Répliquer le cockpit praticien côté patient.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
