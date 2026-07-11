# WellNeuro Autonomous Engineering Policy

## Principe directeur

L'IA peut explorer, planifier, coder, tester, corriger et documenter seule, mais sous contraintes strictes.

## Interdictions absolues

- Modifier une règle clinique sans validation humaine explicite.
- Effectuer une migration Prisma ou SQL sans confirmation distincte.
- Écrire dans Supabase sans autorisation explicite.
- Manipuler des données patient réelles.
- Modifier l'authentification ou les droits sans validation.
- Déployer en production sans approbation humaine.

## Niveaux d'autonomie

### Vert

- Documentation.
- Corrections de liens.
- Amélioration de tests.
- Textes d'interface en français.
- Accessibilité simple.
- Formatage.
- Correctifs visuels sans impact métier.

### Orange

- Fonctionnalité nouvelle.
- Route API.
- Logique Prisma sans migration.
- Prompt IA clinique.
- Dépendance mineure.
- Changement d'accès à une donnée.
- Changement important de parcours.

### Rouge

- Migration Prisma ou SQL.
- Écriture Supabase.
- Authentification NextAuth.
- Rôles et autorisations.
- Secrets.
- Suppression de données.
- Déploiement production.
- Scoring clinique.
- Seuil clinique.
- Prescription ou décision automatisée.
- Export de données patient.

## Règle d'arrêt

Toute tâche rouge produit uniquement une analyse d'impact, un plan d'intervention, un plan de retour arrière, les tests nécessaires et la liste des validations humaines.
