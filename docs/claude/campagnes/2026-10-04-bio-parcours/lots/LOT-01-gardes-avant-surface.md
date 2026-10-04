---
id: "LOT-01"
titre: "BP-01 — Gardes avant surface"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 (BP-01) — Gardes avant surface

## But

Poser, avant toute surface neuve, les bancs qui empêchent un résultat
biologique de modifier en silence le chemin documentaire, un prompt ou une
structure signée.

## Résultat observable

Les bancs sont verts sur le code actuel, et les mutations décrites par la
contre-revue les font rougir.

## Périmètre

- Empreintes égales avec et sans résultats sur le chemin documentaire
  (snapshot, carte, versions) ; `includedResponseIds` et `inputHash`
  inchangés ; les entrées décisionnelles du nouveau module sont tracées.
- L'import de `biology-library` est interdit hors liste blanche nominative
  (littéral du banc). La liste comprend `clinical/portesBiologiquesService.ts`
  (D-245) et, le jour venu, le lecteur d'attente C4. Le garde porte sur le
  code de production : les bancs en sont exclus.
- Les faits du laboratoire ne sont consommés que par les modules autorisés.
- La sentinelle est étendue (mots, couleur, priorité ; `innerText`).
- Le hook DC-17 est étendu aux tables signées récentes et futures.
- Aucune phrase dans une structure signée.
- Un vérificateur DC-03 bloquant couvre toute sortie LLM du programme
  (`D-266` §7).
- Le module « besoin 2 » reste hors de `catalogueConduitesV1` (`D-266` §6).
- `signature(err)` est imposé sur les routes biologie.

## Hors périmètre

Toute surface neuve, tout drapeau (aucun créé, `D-081`), toute migration.

## Fichiers probables

- `web/src/lib/**/*.guard.test.ts`
- `.claude/hooks/` (hook DC-17)

## Interdits

- Aucune modification de logique clinique.
- Une liste blanche ne s'élargit que par un diff relu.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-00 (BP-00).

## Étapes

- [ ] Écrire chaque banc, vert sur le code actuel.
- [ ] Prouver chaque banc par sa mutation.
- [ ] Étendre le hook DC-17.

## Tests

T2 (`npm run test:worktree -- --fast`).

## Critères de done

T2 vert ; chaque garde a sa mutation qui rougit.

## Résultats

À compléter à la clôture.
