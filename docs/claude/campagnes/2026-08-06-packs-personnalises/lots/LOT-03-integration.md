---
id: "LOT-03"
titre: "Retrait effectif des packs non-base"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Retrait effectif des packs non-base

## But

Désactiver tous les packs sauf « Base de consultation », maintenant que plus
aucune règle d'orientation ne les cible (LOT-02). Le retrait est un
**soft-delete de données par l'UI** (route DELETE existante,
`actif: false`) — pas une migration, pas une suppression physique :
l'historique des assignations continue de pointer sur eux.

## Résultat observable

- Lecture SQL : exactement un pack `actif: true` (« Base de consultation »).
- La perte de cible d'une règle d'orientation est **journalisée** (nouveau code
  d'événement), au lieu de la disparition silencieuse actuelle
  (`orientationService.ts` charge `actif: true` seulement ; aucun log quand un
  pack ciblé manque — précédent documenté : `PACK_HUMEUR_NEURO`).
- `pack-reevaluation` : comportement vérifié pour les patients dont le pack de
  la dernière consultation validée est désactivé (repli `parDefaut`), conforme
  à la qualification du LOT-01.
- `portail/valider` (assignation du pack de base à l'onboarding) intact,
  prouvé par E2E.

## Périmètre

- Geste praticien en production : désactivation des packs non-base via
  « Questionnaires & packs » (`DELETE /api/praticien/packs?idPack=…`) — les
  5 packs de doctrine actifs non-base et les 2 packs praticien (arbitrage du
  2026-08-06) ; `PACK_HUMEUR_NEURO` est déjà inactif.
- Code : journalisation de la perte de cible d'orientation ; ajustements
  minimaux de `PacksPanel` si l'état « un seul pack actif » dégrade la lisibilité
  (badge inactif existant).
- Vérification production par lecture seule.

## Hors périmètre

- Réactivation de packs depuis l'UI (dette latente notée, hors campagne).
- `questionnaire_packs.actif` jamais relu par `resolvePackQuestionnaireIds`
  (dette latente notée au cadrage, hors campagne tant que la lecture ne bascule
  pas sur le registre).
- Toute migration ; toute suppression physique.

## Fichiers probables

- `web/src/lib/clinical/orientationService.ts` (journalisation)
- `web/src/lib/consultation/packRegistry.ts` ou module d'event codes voisin
- `web/src/components/PacksPanel.tsx` (ajustement minimal éventuel)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase — la désactivation passe par l'UI
  praticien, jamais par du SQL.
- Pas de refactor hors lot.

## Étapes

- [ ] Poser la journalisation de perte de cible (avec test).
- [ ] Geste praticien : désactiver les packs non-base dans l'UI.
- [ ] Lecture SQL : un seul pack actif ; état avant/après consigné.
- [ ] Vérifier `pack-reevaluation` sur un patient concerné (fixture fictive en
      local ; lecture seule en production).
- [ ] Documenter les résultats.

## Tests

- T1 après chaque édition ; T2 avant commit (UI/API touchées).
- E2E onboarding : le pack de base s'assigne toujours (`portail/valider`).

## Critères de done

- Un seul pack actif, prouvé par lecture.
- Journalisation en place et testée.
- Aucun parcours patient cassé (onboarding, réévaluation).

## Résultats

À compléter à la clôture.
