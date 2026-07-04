# Templates de Prompts pour Claude IA

Ces templates servent a obtenir des reponses robustes et compatibles avec la stack Wellneuro NNPP2 (Next.js + Prisma + PostgreSQL).

## 1) Correction ciblee

```text
Contexte: projet Wellneuro NNPP2 (Next.js + Prisma + PostgreSQL, deploye sur Vercel).
Tache: corrige le bug suivant dans [fichier]: [description bug].
Contraintes:
- ne pas modifier la logique clinique,
- ne pas ajouter de secret ou de SHEET_ID en dur,
- conserver les textes UI en francais,
- changements minimaux.
Verification demandee:
- decrire la cause racine,
- decrire les fichiers modifies,
- proposer un test manuel de validation.
```

## 2) Refactor limite

```text
Contexte: Wellneuro NNPP2 (Next.js + Prisma + PostgreSQL).
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
- secrets et SHEET_ID uniquement via variables d'environnement (jamais en dur).
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
A partir de la checklist E2E (`docs/checklist_tests_end_to_end.md`), prepare un plan de test manuel pour [scenario].
Contrainte:
- utiliser uniquement Sophie Nicola, Jennifer Martin ou Michel Dogne.
Resultat attendu:
- preconditions,
- etapes,
- resultat attendu par etape,
- criteres de succes/echec.
```
