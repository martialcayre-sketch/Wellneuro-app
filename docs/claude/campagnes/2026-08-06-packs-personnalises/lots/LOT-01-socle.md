---
id: "LOT-01"
titre: "Inventaire des surfaces + décision produit D-0xx"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Inventaire des surfaces et décision produit

## But

Établir sur pièces, avant tout retrait, la matrice exhaustive de ce qui
consomme les packs non-base — puis écrire la décision produit formelle dans
`docs/DECISIONS.md`. Un retrait décidé sur une liste incomplète reproduit la
classe de défaut « toutes les portes du parcours doivent connaître
l'exemption ».

## Résultat observable

- Une matrice datée dans ce lot : surface → pack(s) consommé(s) → comportement
  après retrait → geste requis.
- Une entrée D-0xx dans `docs/DECISIONS.md` portant les trois arbitrages du
  2026-08-06 (packs praticien désactivés aussi ; geste = file d'envoi ;
  un seul pack actif restant).

## Périmètre

Surfaces déjà identifiées au cadrage, à vérifier et compléter :

- **Orientation** : 6 suggestions ciblent 3 `packId` —
  `R2-SOM-05` (sommeil), `R2-STR-02` et `R-STR-02` (stress), `R2-GAS-02`,
  `R2-ALI-01` et `R-GAS-01` (digestif), dans
  `web/src/lib/clinical/orientationRulesV1.ts`. Vérifier **règle par règle**
  si des cibles `questionnaireId` de repli existent ; lister la composition de
  remplacement attendue (l'absorption pack→membres de
  `orientationEngine.ts:686-748` disparaît avec les packs).
- **Réévaluation portail** : `web/src/app/api/portail/pack-reevaluation/route.ts`
  replie sur `parDefaut` quand le pack de la dernière consultation validée est
  désactivé — qualifier ce comportement (acceptable / à ajuster au LOT-03).
- **UI praticien** : `web/src/components/PacksPanel.tsx` (pas de réactivation
  possible depuis l'UI — badge inactif seulement) et la suture
  `suggestedPackSelection` de `PatientsPanel.tsx`.
- **PackProposition** (`web/prisma/schema.prisma:1347`) et
  `web/src/app/api/praticien/packs/assign/route.ts` (devient sans objet hors
  pack de base).
- **Doctrine** : `web/src/lib/questionnaires-functional.ts` — 16 packs
  déclarés, 6 avec `idPackBase`, 10 jamais créés ; sort des déclarations
  `phase_2`.

## Hors périmètre

- Aucun code applicatif — ce lot produit de l'inventaire et une décision.
- Aucune écriture en base.

## Fichiers probables

- `docs/DECISIONS.md`
- Ce fichier (matrice).

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier règle par règle les 6 suggestions à `packId` (cibles de repli).
- [ ] Compléter la matrice des surfaces (celles ci-dessus + recherche d'appelants oubliés).
- [ ] Qualifier le repli `pack-reevaluation`.
- [ ] Écrire D-0xx dans `docs/DECISIONS.md`.
- [ ] Relire la matrice contre le dépôt (pas contre la mémoire de session).

## Tests

- T1 après l'édition de `docs/DECISIONS.md` (lint des docs si couvert).
- Pas de test applicatif : lot documentaire.

## Critères de done

- Matrice exhaustive datée, chaque ligne avec preuve (chemin:ligne).
- D-0xx mergée.
- Les compositions de remplacement des 6 suggestions sont écrites et prêtes
  pour le LOT-02.

## Résultats

À compléter à la clôture.
