---
id: "LOT-01"
titre: "BP-01 — Gardes avant surface"
statut: "terminé (2026-10-04)"
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

- [x] Écrire chaque banc, vert sur le code actuel.
- [x] Prouver chaque banc par sa mutation.
- [x] Étendre le hook DC-17.

## Tests

T2 (`npm run test:worktree -- --fast`).

## Critères de done

T2 vert ; chaque garde a sa mutation qui rougit.

## Résultats

Bancs sous `web/src/lib/bio-parcours/`, chacun prouvé par une mutation
appliquée puis retirée (le rouge a été constaté à chaque fois) :

| Garde | Banc | Mutation qui rougit |
|---|---|---|
| Empreintes du chemin documentaire | `cheminDocumentaire.guard.test.ts` | import (de type) de `biology-library` dans `canonical.ts` ; la carte qui recopie son entrée dans l'empreinte |
| Liste blanche `biology-library` (26 importeurs figés) | `importeursBiologyLibrary.guard.test.ts` | importeur neuf |
| Faits du laboratoire (modèle entier, 5 fichiers d'accès) | `lecteursResultatBiologique.guard.test.ts` | lecteur neuf de `resultatBiologique` |
| Sentinelle (mots de verdict sur une valeur, couleur, priorité ; `innerText`) | `web/e2e/helpers/sentinelle.ts` | texte « anormal / priorité / urgent » rejeté |
| Hook DC-17 sur toute table signée (`.ts`, `.mts`, `.cts`, `.json`, clé entre guillemets) | `.claude/hooks/protect-wellneuro-files.{mjs,test.mjs}` | détection désactivée : 11 tests rouges |
| Aucune phrase dans une structure signable (verrou posé ou éteint) | `aucunePhraseStructureSignee.guard.test.ts` | structure signée neuve portant une phrase |
| Vérificateur DC-03 bloquant (doses collées à l'unité comprises) | `verifierDc03.ts` + `appelantsLlmBiologie.guard.test.ts` | rédacteur LLM biologie sans le vérificateur |
| « Besoin 2 » hors `catalogueConduitesV1` | `catalogueConduitesSepare.guard.test.ts` | importeur neuf du catalogue ; le catalogue qui importe un module neuf |
| `signature(err)` sur les routes biologie | `journalisationRoutesBiologie.guard.test.ts` | `err.message` rétabli |

Écarts au lot, constatés au cadrage :

- **Liste blanche** : la liste prévue (un seul fichier) était fausse,
  `biology-library` ayant déjà 26 importeurs. On les a figés (arbitrage du
  2026-10-04).
- **Journalisation** : 9 lignes (6 routes et `portesBiologiquesService`)
  écrivaient `err.message`. Elles sont corrigées vers `signature(err)` ou
  `classeEtCode(err)`, sans effet sur les réponses.
- **Reporté** :
  - « entrées décisionnelles du nouveau module tracées » → BP-12a (le module
    n'existe pas) ;
  - garde des faits du laboratoire champ par champ → BIO-INGEST LOT-07 ;
  - forme « région » de la sentinelle → première surface patient (BP-16) ;
    aucune page du portail ne montre de biologie aujourd'hui.
- **Exemption DC-03** : `biology-library/import/extraction.ts` (BIO-INGEST).
  Sa sortie suit un schéma fermé (D-256), est validée ligne à ligne et n'est
  jamais servie telle quelle. L'exemption est liée à cette forme : les champs
  du schéma sont épinglés.
- **Revue `wn-reviewer`** : 2 P1 et 5 P2, tous traités dans ce lot.
  - P1 : la sentinelle refusait « déficit », qui figure dans le libellé de
    population d'un panel signé ; ce n'est pas un verdict, les mots de
    population sont retirés de la liste.
  - P1 : `verifierDc03` ne voyait pas une dose collée à son unité.
  - P2 : limites des bancs écrites ; hook étendu ; détecteur de journal
    élargi ; structures au verrou éteint jugées.
