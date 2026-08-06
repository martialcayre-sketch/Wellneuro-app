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

- Geste praticien en production : désactivation du **second** pack créé par
  le praticien (« Florence 1 », `PACK_b8sda7asd-h_B8x8061uORhc`) et des 5
  packs de doctrine actifs, via « Questionnaires & packs »
  (`DELETE /api/praticien/packs?idPack=…`) — **« Base de consultation » n'est
  JAMAIS désactivée** (arbitrage du 2026-08-06, [[D-030]]) ; `PACK_HUMEUR_NEURO`
  est déjà inactif. Total : 6 packs désactivés.
- Code : journalisation de la perte de cible d'orientation ; ajustements
  minimaux de `PacksPanel` si l'état « un seul pack actif » dégrade la lisibilité
  (badge inactif existant).
- Garde `IDS_SUSPENDUS` sur `POST`/`PATCH /api/praticien/packs`
  (`packs/route.ts:52-60,86,102,182,191-193`) : ni la création ni l'édition
  d'un pack ne filtrent aujourd'hui les qids suspendus, et `PATCH` accepte
  `parDefaut` sur n'importe quel pack sans garde ([[D-030]] point 4, réserve
  du LOT-01).
- Repli par nom de `resoudrePackBase` (`valider/route.ts:24,28-31`) : mort en
  l'état — `NOM_PACK_BASE` (majuscules) ne correspond jamais au nom réel
  « Base de consultation », l'égalité Prisma/PostgreSQL étant sensible à la
  casse. Recherche insensible à la casse, ou garde interdisant de
  désactiver/démarquer le pack `parDefaut` ([[D-030]], réserve du LOT-01).
- Porte oubliée du bloc « Packs suggérés » (`PatientsPanel.tsx:750,900-928`,
  alimenté par `packsRecommandes` de `questionnaires-functional.ts:78,209-268`
  via `api/praticien/questionnaires/registry/route.ts:8,25`) : sans geste, ses
  boutons continueront de citer des packs désactivés après le retrait
  (LOT-01, matrice section Praticien).
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
- `web/src/app/api/praticien/packs/route.ts` (garde `IDS_SUSPENDUS` sur
  POST/PATCH, garde anti-démarquage `parDefaut`)
- `web/src/app/api/portail/valider/route.ts` (repli par nom insensible à la
  casse, ou remplacement par une garde amont)
- `web/src/components/PatientsPanel.tsx` et
  `web/src/lib/questionnaires-functional.ts` (bloc « Packs suggérés »,
  porte oubliée — ajoutés en revue adversariale du LOT-01)

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
- Invariant « exactement un pack actif » ET « `resoudrePackBase` rend
  toujours un pack », y compris par le repli par nom une fois réparé (ajouté
  en revue adversariale du LOT-01).
- `POST`/`PATCH /api/praticien/packs` refuse un qid `IDS_SUSPENDUS` (ajouté
  en revue adversariale du LOT-01).

## Critères de done

- Un seul pack actif, prouvé par lecture.
- Journalisation en place et testée.
- Aucun parcours patient cassé (onboarding, réévaluation).

## Résultats

À compléter à la clôture.
