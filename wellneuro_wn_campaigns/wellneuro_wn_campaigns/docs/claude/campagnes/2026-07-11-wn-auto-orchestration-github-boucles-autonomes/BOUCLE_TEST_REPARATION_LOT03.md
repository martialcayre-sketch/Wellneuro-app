# Boucle tests et réparation bornées — LOT-03

## Objectif

Définir une boucle de validation et correction limitée pour éviter toute itération infinie.

## Matrice minimale des tests

| Type | Commande cible | Usage | Condition de lancement |
|---|---|---|---|
| Doc | Vérification markdown ciblée | Contrôler la cohérence documentaire | Si changement docs uniquement |
| Type-check | `npm run type-check` | Vérifier les erreurs TypeScript | Si changement code TS/TSX |
| Lint ciblé | lint fichier/module touché | Vérifier la qualité locale | Si règle lint applicable |
| Test ciblé | test unitaire/e2e du périmètre | Valider le correctif | Si test existe pour le périmètre |

Règle: exécuter uniquement les tests nécessaires au périmètre pour limiter coût et bruit.

## Classification des erreurs

| Classe | Exemples | Action |
|---|---|---|
| `transient` | Flake CI, timeout réseau ponctuel | 1 relance max sans modification |
| `code` | Type error, test régressif, assertion KO | Correction ciblée puis retest |
| `policy` | Violation secret/RGPD/clinique/migration | Stop immédiat et `needs-human` |
| `unknown` | Erreur non classable rapidement | 1 tentative d'analyse, puis escalade |

## Règles de retry

- Tentatives maximales de réparation: `3`.
- Une tentative = correction ciblée + relance des validations minimales.
- Au-delà de 3 échecs: arrêt obligatoire.
- En cas de classe `policy`: arrêt immédiat sans retry.

## Sorties normalisées

Chaque itération doit produire:

- `attempt_index` (1..3)
- `error_class`
- `actions_done`
- `validation_result`
- `next_state`

## Conditions de bascule `needs-human`

- compteur de tentatives atteint (`attempt_index > 3`)
- erreur `policy`
- blocage persistant non reproductible
- ambiguïté de périmètre ou conflit de contraintes

## Etat machine associé (rappel)

- `implementing` -> `validating` -> `review_pending` si succès
- `validating` -> `implementing` si échec réparable et tentative restante
- `validating` -> `needs-human` si stop criteria atteint

## Definition of done LOT-03

- boucle bornée définie
- classes d'erreurs explicites
- règle de sortie et escalade normalisées
- aucune possibilité d'itération infinie
