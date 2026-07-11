---
id: "LOT-04"
titre: "Cohérence protocole et fiche patient"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Cohérence protocole et fiche patient

## But

Intégrer une sélection manuelle avec vigilances simples.

## Résultat observable

Ajout au protocole, doublons signalés, fiche patient validable.

## Périmètre

- Sélection explicite.
- Calcul cumul simple sur composants renseignés.
- Vigilances non exhaustives.
- Fiche moment/durée/raison.

## Hors périmètre

- Prescription automatique
- Changement médicament

## Fichiers probables

- ProtocolMiniBuilder
- lib/supplements/coherence.ts
- documents/fiches

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

- [ ] Brancher sélection.
- [ ] Détecter doublons.
- [ ] Afficher limites.
- [ ] Générer fiche.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogne
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Aucune sélection automatique.
- [ ] Limites du moteur visibles.

## Risques / points de vigilance

- Faux sentiment de sécurité.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
