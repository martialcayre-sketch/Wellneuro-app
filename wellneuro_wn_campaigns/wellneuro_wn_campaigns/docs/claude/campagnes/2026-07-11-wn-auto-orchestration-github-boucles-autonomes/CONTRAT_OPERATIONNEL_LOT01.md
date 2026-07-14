# Contrat operationnel WN-AUTO — LOT-01

## Objectif

Definir un etat machine simple, traçable et durable pour toutes les taches WN-AUTO.

## Entites minimales

- `campaign_id`: identifiant campagne.
- `lot_id`: identifiant lot.
- `task_id`: identifiant tache (issue/PR ou identifiant interne).
- `risk_level`: `vert`, `orange`, `rouge`.
- `state`: etat courant de la tache.
- `evidence`: preuves de verification (tests, revue, checks).
- `gate_decision`: `pending`, `approved`, `rejected`, `not_required`.
- `updated_at`: horodatage de la derniere transition.

## Etats

| Etat | Signification |
|---|---|
| `draft` | Intention capturee, pas encore qualifiee |
| `triaged` | Triage fait, niveau de risque attribue |
| `planned` | Plan de lot/tache redige et valide |
| `implementing` | Execution en cours (vert/orange uniquement) |
| `validating` | Verifications techniques/documentaires en cours |
| `review_pending` | Attente de revue independante |
| `gate_pending` | Attente de decision humaine (orange/rouge) |
| `done` | Tache terminee et tracabilite complete |
| `blocked` | Blocage technique/fonctionnel |
| `needs_human` | Escalade immediate vers validation humaine |
| `cancelled` | Tache abandonnee explicitement |

## Transitions autorisees

| Depuis | Vers | Condition |
|---|---|---|
| `draft` | `triaged` | Triage complete |
| `triaged` | `planned` | Perimetre et contraintes valides |
| `planned` | `implementing` | Risque vert/orange |
| `planned` | `gate_pending` | Risque rouge (planification seule) |
| `implementing` | `validating` | Changement propose pret |
| `validating` | `review_pending` | Verifications minimales disponibles |
| `review_pending` | `gate_pending` | Revue independante terminee |
| `gate_pending` | `done` | Validation humaine explicite |
| `gate_pending` | `needs_human` | Validation manquante ou refusee |
| `blocked` | `needs_human` | Blocage persistant |
| `needs_human` | `planned` | Reprise apres arbitrage |
| `*` | `cancelled` | Decision explicite d'abandon |

## Transitions interdites

- passage direct `draft` -> `done`.
- passage direct `implementing` -> `done` sans `validating`.
- passage direct `review_pending` -> `done` sans gate humain si orange/rouge.
- execution `implementing` pour une tache classee rouge.

## Points d'arret obligatoires

Escalade immediate en `needs_human` si :

- action clinique/scoring detectee ;
- migration Prisma/SQL demandee ;
- action auth/permissions sensible detectee ;
- secret requis ;
- deploiement production demande ;
- donnees patient reelles detectees ;
- boucle de correction depasse le seuil defini.

## Artefacts persistants requis

Par tache, conserver au minimum :

- classification de risque et justification ;
- etat courant + historique de transitions ;
- references de preuves (`tests`, `review`, `checks`) ;
- decision de gate humain (si applicable).

## Regles de reprise

- la reprise repart toujours du dernier `state` persiste ;
- si l'historique est incomplet, retour force a `planned` ;
- une tache en `needs_human` ne peut pas revenir en execution sans arbitrage explicite.

## Definition of done LOT-01

Le contrat est considere valide si :

- les etats et transitions sont explicites ;
- les transitions interdites sont listees ;
- les points d'arret couvrent les risques rouges ;
- la reprise de session est possible sans ambiguite.
