# Orchestrateur GitHub de base — LOT-02

## Objectif

Definir un pipeline de triage WN-AUTO limite a la preparation: issue, labels, branche et PR prete,
sans execution sensible automatique.

## Entree attendue

- `request_title`: titre court de la demande.
- `request_body`: description de besoin.
- `campaign_id`: identifiant campagne.
- `lot_id`: identifiant lot cible.
- `risk_level`: `vert`, `orange` ou `rouge` (issu de la matrice LOT-00).

## Mapping intention -> campagne

| Intention detectee | Cible | Action |
|---|---|---|
| Cadrage / documentation | Campagne active, lot courant | Ouvrir ou enrichir issue documentaire |
| Correctif non sensible | Campagne active, lot courant | Ouvrir issue + proposer branche |
| Changement sensible rouge | Campagne active, lot courant | Ouvrir issue en mode planification seule |

## Labels de risque canoniques

- `wn:auto`
- `wn:campaign`
- `wn:lot`
- `risk:vert`
- `risk:orange`
- `risk:rouge`
- `state:triaged`
- `state:needs-human`

Regle: un seul label `risk:*` actif a la fois.

## Sorties minimales de l'orchestrateur

Chaque triage doit produire:

- une issue GitHub (ou reference vers issue existante) ;
- le set de labels final ;
- une proposition de nom de branche ;
- un brouillon de PR (titre + checklist de garde-fous) ;
- un resume de decision de gate (`not_required`, `pending`, `approved`, `rejected`).

## Convention de branche

Format propose:

`wn-auto/<campaign_id>/<lot_id>/<slug-court>`

Exemple:

`wn-auto/2026-07-11-wn-auto-orchestration-github-boucles-autonomes/LOT-02/triage-base`

## Garde-fous obligatoires

- `risk:rouge`: aucune implementation automatique, issue en planification seule.
- `risk:orange`: proposition preparee, validation humaine requise avant fusion.
- `risk:vert`: preparation autonome autorisee, avec tracabilite complete.

## Strategie de reprise

- Si issue/PR existe: reprendre le dernier `state:*` connu.
- Si etat manquant: revenir a `state:triaged` et requalifier.
- Si conflit de labels: conserver le plus restrictif (`risk:rouge` > `risk:orange` > `risk:vert`).

## Hors perimetre confirme

- execution CI/CD automatique ;
- deploiement ;
- ecriture base ;
- migration Prisma/SQL.

## Definition of done LOT-02

- mapping intention -> campagne explicite ;
- labels de risque normalises ;
- sorties minimales documentees ;
- strategie de reprise definie ;
- aucune operation sensible automatisee.
