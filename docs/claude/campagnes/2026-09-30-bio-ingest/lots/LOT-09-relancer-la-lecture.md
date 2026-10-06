---
id: "LOT-09"
titre: "Relancer la lecture d'un compte rendu sans ligne validée"
statut: "terminé"
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

- [x] Cadrage : sort de l'import précédent et de ses lignes (ci-dessous).
- [x] Garde serveur, avec un test qui prouve le refus après validation.
- [x] Geste à l'écran.
- [x] Validations.

## Tests

- Relance refusée dès qu'une ligne est validée (serveur, pas seulement
  l'écran).
- Relance permise après un échec, une interruption ou un import sans ligne
  validée.

## Critères de done

T2 vert ; le refus après validation est prouvé côté serveur.

## Résultats

- **Sort de l'import précédent.** Rien n'est effacé ni réécrit. L'import
  précédent et ses lignes restent tels quels, proposées ou écartées (motifs
  compris). Le nouvel import devient le courant dès son ouverture
  (`idExtractionCourante` : la plus récente qui n'a pas échoué). La décision
  refuse alors les lignes de l'ancien (`import_remplace`). Si la relance
  échoue, l'ancien redevient le courant et ses lignes se décident à nouveau.
- **Garde serveur.** `ouvrirExtraction` refuse `ligne_validee` (409) dès
  qu'une ligne d'un import de ce compte rendu est `validee`. La lecture se
  fait sous le verrou du compte rendu, que prend aussi la décision : une
  validation et une relance ne se croisent pas. Elle suit la clôture des
  imports périmés, pour qu'un import mort ne reste pas « courant ». Bancs : refus sans aucune
  écriture ni appel au fournisseur, lecture après le verrou, nouvel import
  sans écriture sur l'ancien ; route 409. Mutation (garde retirée) vue rouge.
- **Écran.** « Relancer la lecture » sur une lecture aboutie, non purgée,
  sans ligne validée dans aucune lecture, avec une confirmation qui dit que
  le document repart au service de lecture. Le refus du serveur se dit.
  Mutation (condition retirée) vue rouge.
- Aucune migration, aucune écriture dans `resultats_biologiques`.
- Revue `wn-reviewer` : GO, ni P0 ni P1. P2 corrigés : garde après la
  clôture des imports périmés, « Lancer la lecture » masqué s'il y a une ligne
  validée, confirmation au conditionnel (une relance échouée rend l'ancienne
  lecture décidable).
- À signaler au responsable : D-258 purge le document dès que toutes les
  lignes de la lecture courante sont décidées. Un praticien qui écarte tout
  parce que la lecture est mauvaise ne peut donc plus relancer. Ce cas reste
  hors périmètre.
