---
id: "LOT-02"
titre: "Consolidation de l'état canonique 62/64"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Consolidation de l'état canonique 62/64

## But

Rendre cohérentes les sources canoniques sur le sens de 62/64 et le statut des
deux exceptions.

## Périmètre

- `docs/questionnaires-drive-mapping.md` ;
- `docs/claude/propositions/2026-07-29-certification-montee/` ;
- documentation d'état réellement divergente identifiée par LOT-01.

## Hors périmètre

- réactivation de `Q_PED_02` ou `Q_PED_03` ;
- reconstruction d'un scoring Conners ;
- changement des questionnaires servis.

## Étapes

- vérifier chaque affirmation contre le registre et le code ;
- corriger uniquement les contradictions actuelles ;
- conserver les snapshots historiques explicitement datés.

## Tests

- T1 : `cd web && npm run check`.

## Critères de done

- aucune ambiguïté entre couverture du dossier, disponibilité runtime et niveau
  de certification ;
- décisions existantes inchangées.
