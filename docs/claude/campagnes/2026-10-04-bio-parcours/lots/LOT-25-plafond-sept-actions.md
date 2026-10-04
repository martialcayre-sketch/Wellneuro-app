---
id: "LOT-25"
titre: "BP-25 — Plafond d'actions porté à 7"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-25 (BP-25) — Plafond d'actions porté à 7

## But

Porter le plafond d'actions à 7, comme le responsable l'a arbitré : il amende
`D-105`.

## Résultat observable

`baremeChargeV1` et `tableRepliV1` sont re-signés. La garde littérale et la
couverture de la table de repli sont à jour, et les gardes de saisie vertes à
7.

## Périmètre

- Barème de charge (`D-198`) et table de repli, re-signés à cinq termes.
- `seuilsLitterauxMotives.guard.test.ts`, `tableRepliV1.guard.test.ts`.
- Gardes de saisie rejouées.

## Hors périmètre

Le reste de la phase 5 « Actions » (catalogue d'actions, complétion IA
relue), qui suit les fiches.

## Fichiers probables

- `web/src/lib/` (barème, table de repli et leurs gardes)

## Interdits

- `D-xxx` amendant `D-105` d'abord, avec son fragment `changelog.d/`.
- Signature à cinq termes avec `shaPerimetre` littéral ; passe Codex
  obligatoire (module clinique signé).
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-00 (BP-00).

## Étapes

- [ ] Rédiger la décision amendant `D-105`.
- [ ] Re-signer les deux tables.
- [ ] Mettre à jour les gardes.

## Tests

T3 (module clinique signé).

## Critères de done

Signatures à cinq termes ; gardes vertes à 7.

## Résultats

À compléter à la clôture.
