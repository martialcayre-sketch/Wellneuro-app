---
id: "LOT-03"
titre: "Photo ou scan"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Photo ou scan

## But

Accepter une photo ou un scan en réutilisant le pipeline du LOT-02 : seul l'extracteur change.

## Résultat observable

Une photo produit des lignes candidates dans le même écran de validation que le PDF.

## Périmètre

Extracteur image, formats acceptés, limites de taille.

## Hors périmètre

Toute seconde architecture parallèle.

## Fichiers probables

- `web/src/lib/biology-library/` (extracteur)

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-02

## Étapes

- [ ] Vérifier que l'amendement RGPD du LOT-02 couvre les images.
- [ ] Brancher l'extracteur image.
- [ ] Validations.

## Tests

Mêmes invariants que le LOT-02 ; formats refusés ; taille maximale.

## Critères de done

Photo acceptée sans nouvelle table ni nouvelle voie d'écriture.

## Résultats

À compléter à la clôture.
