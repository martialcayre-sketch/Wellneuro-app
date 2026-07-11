# Revue independante et preview protegee — LOT-04

## Objectif

Imposer une seconde lecture independante et un gate de preview avant toute fusion sensible.

## Separation des roles

- Agent implementateur: produit le changement et les preuves.
- Agent reviewer independant: evalue le diff sans l'avoir implemente.
- Validateur humain: decide le go/no-go final.

Regle: le reviewer independant doit etre distinct de l'implementateur.

## Criteres de revue obligatoires

Le reviewer doit verifier, au minimum:

- securite (aucun secret, permissions coherentes) ;
- donnees (aucune PII, aucun patient reel) ;
- clinique (aucune modification de logique/scoring sans validation explicite) ;
- migration/base (aucune migration Prisma/SQL non autorisee) ;
- perimetre (changement minimal, conforme au lot).

## Preuves requises

Avant gate humain, joindre:

- resume du diff cible ;
- resultat des validations minimales executees ;
- liste des fichiers modifies ;
- avis explicite du reviewer independant (`ok`/`ko` motive).

## Gate preview protege

Pour les changements orange/sensibles:

- preview accessible uniquement sous protection ;
- verification fonctionnelle sur preview avant fusion ;
- absence de validation humaine => pas de fusion.

## Decision go/no-go

| Condition | Decision |
|---|---|
| Critere de revue non satisfait | `NO-GO` |
| Preuves incomplètes | `NO-GO` |
| Risque rouge sans validation explicite | `NO-GO` |
| Tous criteres ok + validation humaine | `GO` |

## Escalade

Bascule immediate en `needs-human` si:

- contradiction entre reviewer et implementateur ;
- ambiguite clinique/securite ;
- comportement inattendu en preview.

## Decision de cadrage

La separation preview/release est retenue:

- LOT-04 couvre le gate preview et la revue independante ;
- LOT-05 explicitera le gate release final et l'observabilite continue.

## Definition of done LOT-04

- revue independante obligatoire formalisee ;
- preuves minimales normalisees ;
- gate preview protege defini ;
- regles go/no-go explicites.
