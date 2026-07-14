# Observabilite et maintenance continue — LOT-05

## Objectif

Formaliser une boucle de suivi continue, non sensible, avec gate release explicite et incidents expurges.

## Signaux de maintenance

Surveillance hebdomadaire des signaux suivants:

- derive documentaire (incoherence campagne/lots/meta) ;
- derive des skills (doublons, alias obsoletes, references non canoniques) ;
- echec recurrent des validations minimales ;
- ecarts entre etat machine declare et execution reelle.

## Format normalise des incidents

Chaque incident cree doit contenir:

- `incident_id`
- `severity` (`low`, `medium`, `high`)
- `scope` (`docs`, `workflow`, `ci`, `governance`)
- `description`
- `evidence`
- `next_action`

Interdits:

- aucune PII ;
- aucune donnee patient ;
- aucun secret.

## Rythme hebdomadaire

- Fenetre de maintenance: 1 passage par semaine.
- Sequence minimale: collecter signaux -> classer -> ouvrir incidents -> proposer correction.
- Si risque rouge detecte: escalade immediate `needs-human`.

## Sorties d'audit attendues

- etat des campagnes (`lot_courant`, lots termines/restants) ;
- liste des incidents ouverts/clos ;
- liste des validations executees ;
- liste des points a arbitrer humainement.

## Gate release explicite

Le gate release est `GO` uniquement si tous les criteres suivants sont vrais:

- revue independante `OK` (LOT-04) ;
- validations minimales executees et stables ;
- aucun incident `high` non traite ;
- validation humaine explicite de fusion/release.

Sinon, decision `NO-GO` avec creation d'un incident et retour en planification.

## Definition of done LOT-05

- boucle de maintenance hebdomadaire definie ;
- format incident expurge defini ;
- sorties d'audit standardisees ;
- gate release explicite et non automatique.
