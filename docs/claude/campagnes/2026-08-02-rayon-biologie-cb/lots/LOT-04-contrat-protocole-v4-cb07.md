---
id: "LOT-04"
titre: "contrat-protocole-v4-cb07"
statut: "non livré — transféré en FILE_ATTENTE (clôture campagne 2026-09-04)"
dépend_de: "LOT-02 (CB-05)"
---

# LOT-04 (CB-07) — Contrat protocole V4 `BiologyCatalogRef`

> **Requalifié à la clôture de campagne (2026-09-04, arbitrage du
> responsable).** Seul contenu de la campagne encore éventuellement dû :
> `BiologyCatalogRef` n'existe pas dans le code. Le constat du bilan du
> 2026-09-04 le replace dans son vrai problème : la boucle
> arbitrage→révision est livrée mais **aucun producteur d'intentions
> `conditionnelle_biologie`** n'existe (D-056 dormant, builder sans geste).
> Ce contrat se réexamine AVEC ce producteur — entrée « à cadrer » de
> FILE_ATTENTE, pas un reste isolé de cette campagne.

## But

Poser le contrat `BiologyCatalogRef` sur l'action de protocole
`biological_exploration`, en miroir exact du patron `SupplementCatalogRef`
(contrat protocole V3, PR #340) : référence catalogue opaque et gouvernée,
un seul type d'action, posée uniquement par le praticien — jamais par l'IA,
jamais en texte libre.

## Résultat observable

- `BiologyCatalogRef` défini et branché sur `ProtocolActionType.biological_exploration`
  (`web/src/lib/clinical-engine/types.ts`).
- Référence opaque : aucune valeur biologique, aucun résultat — seulement un
  identifiant vers le catalogue/la proposition signée.
- Le praticien seul pose l'action ; l'IA ne peut jamais l'écrire.

## Périmètre

- Extension du contrat protocole (`web/src/lib/clinical-engine/types.ts` et
  fichiers associés).
- Validation structurelle du contrat (patron `SupplementCatalogRef`).
- Revue adversariale obligatoire (contrat clinique).

## Hors périmètre

- La génération de documents (CB-06, déjà faite).
- L'UI (CB-08).

## Fichiers probables

- `web/src/lib/clinical-engine/types.ts`
- `web/src/components/ProtocolMiniBuilder.tsx` (affichage « Exploration
  biologique à discuter », déjà présent — à vérifier, pas à dupliquer)
- Tests de contrat existants pour `SupplementCatalogRef` (patron à répliquer)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Aucune migration prévue ici (contrat TypeScript, pas de nouvelle table) —
  si le contrat implique un stockage nouveau, traiter comme CB-05
  (confirmation obligatoire).
- L'IA ne doit jamais pouvoir écrire ce contrat en autonomie.
- Pas de refactor hors lot.

## Étapes

- [ ] Relire le contrat V3 `SupplementCatalogRef` (patron exact à répliquer).
- [ ] Implémenter `BiologyCatalogRef` en miroir.
- [ ] Faire relire par un sous-agent `wn-reviewer` (revue adversariale, contrat
  clinique — non négociable pour ce lot).
- [ ] Exécuter les validations (T2).
- [ ] Documenter les résultats.

## Tests

- T2 avant tout commit.
- Tests de contrat : validation stricte des champs, refus d'un contrat
  malformé ou posé par un rôle autre que praticien.

## Critères de done

- Revue adversariale `wn-reviewer` faite et ses constats traités.
- Contrat testé, aucune valeur biologique dans le contrat.

## Résultats

À compléter à la clôture.
