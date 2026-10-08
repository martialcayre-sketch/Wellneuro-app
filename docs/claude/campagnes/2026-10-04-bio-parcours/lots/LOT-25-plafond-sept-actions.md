---
id: "LOT-25"
titre: "BP-25 — Plafond d'actions porté à 7"
statut: "terminé (2026-10-08, D-273)"
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

## Résultats

- `MAX_ACTIONS_PROTOCOLE_21J` vaut 7 (`D-273`, amende `D-105`) ; refus du
  moteur, aperçu patient et constructeur disent « sept ».
- Barème re-signé (`7848189d…`) : `CHARGE-02` 2 à 3, `CHARGE-03` 4 à 7 ; à
  trois actions engagées, « Chargé » devient « Modéré ».
- Table du repli réécrite **en proportion** (`etendueSansRepli` : aucune, une
  partie, chacune) et re-signée (`3d2e5f0d…`) : `REPLI-01`, `REPLI-04`,
  `REPLI-05` ; `REPLI-02` et `REPLI-03` retirées. Toujours lue par aucun écran.
  Une première version à deux lignes, déclarée conforme le matin, a été
  remplacée le soir même avant merge ; son périmètre est rangé.
- Constructeur : le comptage porte sur toutes les actions non suspendues du
  brouillon, et se tait tant qu'aucune n'est typée.
- Deux déclarations de conformité du responsable, chacune sur une surface
  produite avant la demande (`SURFACE_RELECTURE_BP25.md`, `D-195`).
- Validations : T1 complet vert, T3 complet vert (12 020 + 1 625 tests
  unitaires, 243 E2E, dérive schéma nulle). Revue `wn-reviewer` : GO, aucun
  P0/P1 ; trois écarts documentaires corrigés, le quatrième consigné dans
  `D-273`. Passe Codex : à lancer par le responsable sur la PR.
