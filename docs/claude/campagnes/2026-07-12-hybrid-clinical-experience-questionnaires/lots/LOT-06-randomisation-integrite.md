---
id: "LOT-06-randomisation-integrite"
titre: "Randomisation contrôlée et intégrité psychométrique"
statut: "à_faire"
dépend_de: ["LOT-05"]
---

# LOT-06 — Randomisation contrôlée et intégrité psychométrique

## But

Introduire une variété d'ordre uniquement lorsqu'elle réduit un biais ou la monotonie sans altérer la compréhension, la comparabilité ou le scoring.

## Périmètre

- politique déclarative d'ordre des options ;
- permutation déterministe des options nominales autorisées ;
- options épinglées ;
- stabilité pendant une tentative ;
- tests de mapping, scoring et correction ;
- matrice clinique de validation.

## Fichiers probables

- `web/src/lib/questionnaire-types.ts`
- utilitaire pur de permutation dans `web/src/lib/**`
- définitions des questionnaires pilotes dans `web/src/lib/questions.ts`
- renderer d'options patient
- logique de brouillon si la version d'ordre doit être stockée localement
- tests Vitest
- tests Playwright ciblés
- documentation de l'inventaire

## Interdits

- aucune randomisation globale par défaut ;
- aucun mélange d'échelle ordinale ;
- aucun mélange Oui/Non ;
- aucun mélange d'items validés ;
- aucune graine contenant email, nom, date de naissance ou donnée clinique ;
- aucune dépendance à `Math.random()` au rendu ;
- aucune valeur calculée à partir de la position affichée ;
- aucun changement de scoring.

## Politique cible

```ts
type OptionOrderPolicy =
  | { kind: 'fixed' }
  | {
      kind: 'shuffle_nominal';
      version: 'v1';
      pinnedValues?: number[];
    };
```

La politique doit être explicite par question ou groupe. L'absence de politique vaut `fixed`.

## Algorithme

- fonction pure ;
- permutation déterministe ;
- ensemble d'options inchangé ;
- options épinglées retirées avant permutation puis réinsérées ;
- résultat stable par `idAssignation + questionId + version` ;
- aucune donnée personnelle ;
- comportement documenté si `idAssignation` absent dans un aperçu.

## Étapes

1. Finaliser la matrice clinique des questionnaires et questions éligibles.
2. Faire valider chaque éligibilité.
3. Implémenter un utilitaire pur et testé.
4. Ajouter la politique au contrat statique du catalogue.
5. Activer uniquement sur quelques questions internes pilotes.
6. Vérifier que le brouillon et le retour arrière conservent l'ordre.
7. Vérifier correction après déverrouillage.
8. Comparer payloads et scores.
9. Documenter les effets observés et décider d'une extension ou d'un retrait.

## Tests unitaires

- même seed -> même ordre ;
- seed différent -> ordre potentiellement différent ;
- ensemble identique ;
- valeurs et libellés inchangés ;
- options épinglées stables ;
- tableaux vides ou à un élément ;
- aucun effet sur options `fixed` ;
- sérialisation/reprise stable ;
- aucune utilisation de donnée sensible.

## Tests E2E

- sélectionner un libellé dans un ordre mélangé -> valeur attendue ;
- recharger -> même ordre ;
- précédent/suivant -> même ordre ;
- quitter/reprendre -> même ordre ;
- transmettre -> même score de référence ;
- demander correction -> même ordre ou règle documentée ;
- mobile et lecteur d'écran.

## Validation clinique

Pour chaque activation :

- instrument interne ou autorisation documentée ;
- options réellement nominales ;
- aucune relation logique entre ordre et compréhension ;
- approbation explicite ;
- résultat des tests ;
- entrée dans la matrice.

## Done

- [ ] Politique opt-in uniquement.
- [ ] Algorithme déterministe testé.
- [ ] Aucune donnée sensible dans la graine.
- [ ] Aucun ordinal mélangé.
- [ ] Mapping et scoring inchangés.
- [ ] Pilote validé ou randomisation retirée.
- [ ] LOT-07 autorisé.
