---
id: "LOT-03"
titre: "Photo ou scan"
statut: "terminé (2026-10-04)"
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

- [x] Vérifier que l'amendement RGPD du LOT-02 couvre les images.
- [x] Brancher l'extracteur image.
- [x] Validations.

## Tests

Mêmes invariants que le LOT-02 ; formats refusés ; taille maximale.

## Critères de done

Photo acceptée sans nouvelle table ni nouvelle voie d'écriture.

## Résultats

Livré le 2026-10-04 en une PR, sans migration : le CHECK `type_mime` du LOT-02
admettait déjà JPEG, PNG et WebP, et le §2 ter du dossier RGPD déclarait déjà
« photo ou scan ».

- **Admission** : format lu à la signature, concordant avec le type déclaré ;
  HEIC et GIF refusés (415).
- **Métadonnées** (arbitrage du responsable, 2026-10-04) : l'image est
  réencodée au dépôt par `sharp`, devenue dépendance directe. Orientation
  appliquée, EXIF et GPS retirés avant consignation et envoi ; une ligne au
  dossier RGPD.
- **Plafonds** : 10 Mo reçus ; image préparée ≤ 3,75 Mio (5 Mio en base64 chez
  le fournisseur) et ≤ 8 000 px de côté. Pas de redimensionnement : une image
  trop lourde est refusée avec un message.
- **Extraction** : bloc `image` au lieu de `document`, même consigne et même
  schéma, procédé `bio-extraction-v1` inchangé.
- **Hors lot** : un compte rendu de plusieurs pages en plusieurs photos (une
  photo par dépôt) ; HEIC.
- **Non livré : « Relancer la lecture »**. Le geste avait été rattaché au
  LOT-03 lors de l'arbitrage du 2026-10-03, et la PR du lot ne l'a pas porté.
  Le 2026-10-05, le responsable l'a déplacé vers sa propre fiche, le
  [LOT-09](LOT-09-relancer-la-lecture.md), sans le rattacher au LOT-07. Aucune
  relance n'y est permise après qu'une ligne a été validée.
- **Clôture administrative** : le 2026-10-05, la campagne et `.wn/state.json`
  marquaient encore le LOT-03 « à_faire » et courant ; ils sont réalignés.
