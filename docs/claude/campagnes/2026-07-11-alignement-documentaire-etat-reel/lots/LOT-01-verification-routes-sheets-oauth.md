---
id: "LOT-01"
titre: "Vérification read-only des routes Sheets et OAuth"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Vérification read-only des routes Sheets et OAuth

## But

Confirmer dans le code l'état réel de la décommission Google Sheets/OAuth.

## Résultat observable

Un inventaire exact des références restantes, avec impact et recommandation, sans modification.

## Périmètre

- Rechercher les imports, scopes OAuth, appels Sheets, routes de migration et types session associés.
- Distinguer code actif, archive et documentation.
- Identifier les tests ou scripts encore dépendants.

## Hors périmètre

- Supprimer les références
- Changer l'authentification
- Modifier les routes

## Fichiers probables

- web/src/app/api/**
- web/src/lib/**
- web/src/types/**
- archive/gas-legacy/**
- package.json et fichiers OAuth pertinents

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

- [x] Chercher les chaînes `spreadsheets`, `googleapis`, `migrate-historique` et références Sheets.
- [x] Classer les occurrences actives/archives/docs.
- [x] Comparer avec LOT-00.
- [x] Écrire la conclusion go/no-go.

## Tests

- Recherche globale reproductible
- Aucun diff applicatif

## Critères de done

- [x] Chaque dette annoncée est confirmée ou infirmée par une preuve dans le code.
- [x] Les impacts sur la campagne cockpit sont identifiés (aucun — pas de dette Sheets/OAuth active).

## Risques / points de vigilance

- Confondre archive et code exécuté.

## Résultats

**Clôturé le 2026-07-11.** Périmètre couvert par le même agent Explore que LOT-00 (recherche `googleapis`/`sheets`/`SHEET_ID`/`migrate-historique` sur `web/src/` hors `archive/gas-legacy/`). Aucune modification de fichier.

**Inventaire des références restantes** :
- `web/src/lib/auth.ts:16` — commentaire historique (« plus de dépendance runtime à Google Sheets ») : documentation, pas de code actif.
- `web/src/lib/questionnaires-catalog.ts:6,9` — commentaires expliquant que le catalogue vivait auparavant dans Sheets et a été codé en dur (lot E0) : documentation, pas de code actif.
- Aucune occurrence de `googleapis`, client Sheets, ou dépendance `package.json` correspondante.
- `SHEET_ID` et `migrate-historique` : zéro occurrence dans `web/`.
- 6 routes praticien spot-checkées (`metrics`, `patients-pg`, `assignations`, `reponses`, `packs`, `questionnaires`) : Prisma uniquement, `questionnaires/route.ts` utilise le catalogue statique en dur (cohérent avec le point ci-dessus).
- `web/src/lib/auth.ts:17` — scope OAuth exact : `openid email profile`.

**Conclusion go/no-go** : **GO**. Aucune dette Sheets/OAuth active ne bloque la campagne cockpit ni C1. Décision de poursuite : passage à LOT-02 pour corriger l'unique écart identifié en LOT-00 (ligne R8 obsolète, sans lien avec Sheets/OAuth).
