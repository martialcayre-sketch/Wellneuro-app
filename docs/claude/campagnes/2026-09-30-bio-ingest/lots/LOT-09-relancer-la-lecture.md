---
id: "LOT-09"
titre: "Relancer la lecture d'un compte rendu sans ligne validée"
statut: "à_faire"
dépend_de: "LOT-02, LOT-07"
---

# LOT-09 — Relancer la lecture d'un compte rendu sans ligne validée

## But

Pouvoir relire un compte rendu déjà déposé, par exemple après un échec, une
interruption ou une évolution du resolver, sans le retirer pour le déposer à
nouveau. Ce retrait-redépôt efface la lecture précédente. Le besoin a été
constaté au LOT-06 (2026-10-03). Il était prévu au LOT-03, qui ne l'a pas
livré ; le responsable l'a déplacé ici le 2026-10-05.

## Résultat observable

L'écran d'import propose « Relancer la lecture » sur un compte rendu non
purgé dont aucune ligne n'a été validée. Une nouvelle extraction produit un
nouvel import, et ses lignes candidates sont relues comme au LOT-02.

## Périmètre

- Le geste dans `ImportCompteRenduPanel.tsx` (aujourd'hui `peutLancer` exige
  qu'il n'y ait aucun import courant, ou un import interrompu).
- La garde côté serveur : la relance est refusée dès qu'une ligne d'un import
  de ce compte rendu est `validee`.
- La route accepte déjà une nouvelle extraction du même document. Ce lot
  vérifie ce qui advient de l'import précédent et de ses lignes, et l'écrit.

## Hors périmètre

- Toute relance d'un compte rendu dont une ligne est validée. Elle exigerait
  un mécanisme explicite de nouvelle version, à décider séparément.
- Les imports fantômes (réconciliation), qui viennent après LOT-07.
- Le worker, la queue et le retry automatique.

## Fichiers probables

- `web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx`
- `web/src/lib/biology-library/import/lancerExtraction.ts`
- `web/src/app/api/praticien/biologie/import/extraction/route.ts`

## Interdits

- **Aucune relance destructive** : rien de ce qui est validé n'est effacé,
  réécrit ou remplacé.
- Aucune écriture dans `resultats_biologiques` sans validation humaine
  explicite.
- Pas de migration hors d'un lot marqué « confirmation obligatoire »
  (`D-087`).
- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola,
  Jennifer Martin, Michel Dogné).

## Dépendances

LOT-02 ; LOT-07. Le responsable a placé ce lot juste après LOT-07 le
2026-10-05, avant le chantier worker. LOT-07 change le procédé d'extraction
(intervalle et marquage imprimés) ; la relance devient alors le moyen de
relire, sous le nouveau procédé, un compte rendu dont aucune ligne n'est
validée.

## Étapes

- [ ] Cadrage en mode Plan : sort de l'import précédent et de ses lignes.
- [ ] Garde serveur, avec un test qui prouve le refus après validation.
- [ ] Geste à l'écran.
- [ ] Validations.

## Tests

- Relance refusée dès qu'une ligne est validée (serveur, pas seulement
  l'écran).
- Relance permise après un échec, une interruption ou un import sans ligne
  validée.

## Critères de done

T2 vert ; le refus après validation est prouvé côté serveur.

## Résultats

—
