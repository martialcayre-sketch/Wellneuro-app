---
id: "LOT-05"
titre: "Charge thérapeutique, validation et document patient"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Charge thérapeutique, validation et document patient

## But

Rendre le protocole explicable, validable et imprimable.

## Résultat observable

Calcul déterministe de charge, justification si excessif, validation explicite et HTML imprimable patient.

## Périmètre

- Calcul 0-3 léger, 4-6 modéré, 7-9 chargé, 10+ excessif.
- Case de validation praticien explicite.
- Document patient : priorité, 3 actions, plan minimal, fiche, critère J21, limites.

## Hors périmètre

- PDF natif
- Email
- Archivage DB
- Signature électronique

## Fichiers probables

- web/src/lib/protocol/therapeuticLoad.ts
- web/src/components/protocol/TherapeuticLoadPanel.tsx
- web/src/components/documents/PatientProtocolPrintable.tsx

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

- [ ] Implémenter fonction pure et tests.
- [ ] Ajouter affichage non fondé sur couleur seule.
- [ ] Bloquer validation excessive sans justification.
- [ ] Créer CSS print et aperçu.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le score de charge est reproductible.
- [ ] La validation est obligatoire.
- [ ] L’impression est lisible en A4.

## Risques / points de vigilance

- Validation décorative
- CSS print non testé.

## Résultats

À compléter à la clôture du lot : fichiers modifiés, commandes exécutées, captures, écarts, dette restante et décision de poursuite.
