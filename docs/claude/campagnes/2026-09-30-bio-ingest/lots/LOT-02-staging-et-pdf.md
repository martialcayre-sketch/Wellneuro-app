---
id: "LOT-02"
titre: "Staging d'import, extraction PDF, écran de validation"
statut: "à_faire"
dépend_de: "LOT-01, amendement RGPD/TRUST"
---

# LOT-02 — Staging d'import, extraction PDF, écran de validation

## But

Un compte rendu PDF produit des lignes candidates, relues puis validées par le praticien avant de devenir des résultats (A2, A4, A5).

## Résultat observable

Un PDF déposé produit un lot d'import et ses lignes candidates (analyte proposé, valeur, unité source, page, statut de mapping). La validation crée les `resultats_biologiques`. Rien n'est créé sans elle.

## Périmètre

**Deux PR.** (1) **Migration seule — confirmation obligatoire** : tables de lot d'import et de lignes candidates, document source en base (A2), référence du staging **vers** le résultat (A5), contrat SQL négatif, RLS ; release-db approuvée puis constat par conteneur. (2) Code consommateur : upload praticien, extraction par IA vision, écran de validation (extension du LOT-01).

## Hors périmètre

Photo, portail patient, laboratoire. Aucune colonne sur `resultats_biologiques`, `source` inchangée.

## Fichiers probables

- `web/prisma/schema.prisma`, `web/prisma/migrations/`, `web/prisma/checks/`
- `web/src/lib/biology-library/`
- `docs/DOSSIER_RGPD.md`, document patient TRUST (`D-251`)

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-01, amendement RGPD/TRUST

## Étapes

- [ ] **Préalable, geste distinct** : amender le registre RGPD et le document patient TRUST pour l'envoi de comptes rendus au sous-traitant IA.
- [ ] Mode Plan du modèle de staging.
- [ ] PR migration seule, puis release-db, puis constat.
- [ ] PR code consommateur ; drapeau posé seulement après l'amendement.

## Tests

Contrat SQL négatif du staging ; tests de route de la validation (aucune écriture sans geste) ; import du même document deux fois ; unité divergente refusée ; ligne qualitative refusée ; aucune donnée de santé dans les logs ; effacement patient (IDP2) étendu au staging.

## Critères de done

Migration appliquée et constatée ; extraction active seulement après l'amendement ; T3 vert.

## Résultats

À compléter à la clôture.
