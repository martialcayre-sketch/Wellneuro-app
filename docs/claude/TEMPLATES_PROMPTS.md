# Templates de Prompts pour Claude IA

Ces templates servent a obtenir des reponses robustes et compatibles avec le MVP GAS.

## 1) Correction ciblee

```text
Contexte: projet Wellneuro NNPP2 (MVP Google Apps Script).
Tache: corrige le bug suivant dans [fichier]: [description bug].
Contraintes:
- ne pas modifier la logique clinique,
- ne pas ajouter de SHEET_ID en dur,
- conserver les textes UI en francais,
- changements minimaux.
Verification demandee:
- decrire la cause racine,
- decrire les fichiers modifies,
- proposer un test manuel de validation.
```

## 2) Refactor limite

```text
Contexte: MVP GAS Wellneuro NNPP2.
Tache: ameliorer la lisibilite de [fichier/fonction] sans changer le comportement.
Contraintes:
- aucun changement fonctionnel,
- pas de modification clinique,
- code lisible pour non-developpeur.
Livrable:
- diff logique attendu,
- points de vigilance regression,
- plan de verification rapide.
```

## 3) Revue de risque

```text
Agis en reviewer technique.
Analyse [fichiers] et liste d'abord les risques critiques puis majeurs puis mineurs.
Pour chaque point: cause, impact, correction proposee.
Contexte de securite:
- pas de donnees patients reelles,
- pas de secrets,
- SHEET_ID uniquement via Script Properties.
```

## 4) Ajout de documentation

```text
Cree/complete la documentation de [sujet] pour Wellneuro NNPP2.
Exigences:
- francais clair,
- orientation praticien + dev,
- aucune donnee sensible,
- etapes actionnables.
Ajoute un exemple fictif si necessaire.
```

## 5) Preparation de test end-to-end

```text
A partir de la checklist MVP, prepare un plan de test manuel pour [scenario].
Contrainte:
- utiliser uniquement Sophie Nicola, Jennifer Martin ou Michel Dogne.
Resultat attendu:
- preconditions,
- etapes,
- resultat attendu par etape,
- criteres de succes/echec.
```
