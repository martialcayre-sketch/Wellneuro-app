# Matrice de risque canonique — LOT-00

## Objectif

Fixer les niveaux de risque WN-AUTO et les actions autorisées sans ambiguite.

## Niveaux

| Niveau | Portee | Actions autorisees | Gate requis | Sortie attendue |
|---|---|---|---|---|
| Vert | Documentation, cadrage, scripts non sensibles, qualite locale | Execution autonome | Aucun gate humain prealable | PR ou commit documentaire trace |
| Orange | Code applicatif non clinique, tests, correctifs limites, CI | Execution autonome bornee | Validation humaine avant fusion | PR avec preuves et revue independante |
| Rouge | Clinique/scoring, auth/permissions, secrets, migrations, prod, donnees sante | Planification uniquement | Validation humaine explicite avant toute action | Plan + checklist + escalade needs-human |

## Regles d'arret immediat (stop criteria)

Bascule immediate en `needs-human` si l'un des signaux suivants apparait :

- demande de modification clinique, de scoring ou de seuil ;
- tentative de migration Prisma/SQL ;
- besoin de secret, token, mot de passe, ou acces sensible ;
- action de deploiement production ;
- manipulation de donnees patient reelles ;
- modification des regles d'authentification/roles ;
- echec repete hors seuil de retries defini par lot.

## Interdits non negociables

- Aucun secret en dur.
- Aucune donnee patient reelle dans le depot, les logs ou la CI.
- Aucune migration ou ecriture base sans confirmation explicite.
- Aucun deploiement production automatique.
- Aucune decision clinique automatisee.

## Politique d'autonomie

- Vert : autonome de bout en bout.
- Orange : autonome jusqu'a la proposition de changement, fusion conditionnee a validation humaine.
- Rouge : preparation documentaire uniquement, pas d'implementation.

## Traceabilite minimale

Chaque action WN-AUTO doit conserver :

- le niveau de risque attribue ;
- la raison du classement ;
- les evidences de verification ;
- la decision de gate (si orange/rouge).

## Decision LOT-00

Le referentiel officiel de risque WN-AUTO est ce document pour la suite de la campagne.
