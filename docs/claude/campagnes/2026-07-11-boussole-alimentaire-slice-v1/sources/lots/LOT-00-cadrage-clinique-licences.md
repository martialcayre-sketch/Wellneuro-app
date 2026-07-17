---
id: "LOT-00"
titre: "Cadrage clinique, sources et licences"
statut: "livré — validation praticien via revue de PR"
dépend_de: "aucun"
---

# LOT-00 — Cadrage clinique, sources et licences

## But

Valider besoin 1, aliments, variables, sources et vocabulaire.

## Résultat observable

Spécification clinique du slice et liste de 12 aliments maximum.

## Périmètre

- Relire Boussole contexte.
- Sélectionner variables besoin 1.
- Documenter Ciqual/Etalab et OFF si retenu.

## Hors périmètre

- Coder
- Importer DB

## Fichiers probables

- docs/claude/BOUSSOLE_ALIMENTAIRE_CONTEXTE.md
- corpus aliments vedettes

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

- [x] Valider distinction intrinsèque/contextuel.
- [x] Choisir aliments (liste candidate de 12, validation praticien requise).
- [x] Définir libellés patient (principes non absolus ; noms de fiches au lot UX).
- [x] Documenter sources (Ciqual/Etalab 2.0 ; OFF/ODbL différé hors slice data).

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l’affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [x] Aucun axe hors slice n’est inclus.
- [x] Vocabulaire non absolu.

## Risques / points de vigilance

- Réintroduire des axes narratifs comme scores directs.

## Résultats

- **Livrable** : `../../SPEC_SLICE_BESOIN_1_LOT-00.md` — distinction
  intrinsèque/contextuel confirmée, 5 variables besoin 1 (constituants
  Ciqual), liste **candidate** de 12 aliments vedettes (+ alternatives),
  libellés patient non absolus, licences documentées (Ciqual Etalab 2.0
  avec attribution ; OFF/ODbL différé hors slice data ; preuve niveau B).
- **Commandes** : `bash scripts/check_no_secrets.sh` (vert) ;
  `type-check`/`scoring-check` non applicables (aucun code touché) ; smoke
  test navigateur non applicable (aucune interface touchée).
- **Écarts** : aucun code Ciqual ni valeur embarqués (résolus au LOT-02
  depuis la table officielle — « aucune valeur inventée »).
- **Dette / suite** : validation praticien de la liste = revue de cette PR ;
  toute substitution à répercuter sur A7-12 (marqueurs JA). Poursuite :
  LOT-01 (mapping et normalisation, versionné).
