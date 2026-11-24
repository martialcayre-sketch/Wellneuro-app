# Handoff — 2026-11-24 — Nettoyage des branches : un nom accentué sous bash 3.2

Lot `nettoyage-branches-bash32` (file D, P2, lieu cloud), mené par la passe
de l'orchestrateur cloud `20261124-1409-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-ey2q36`, tirée d'`origin/main` à `4ca99cfd`.
- Un commit de lot (script, banc, fragment de changelog, ce handoff),
  poussé ; PR en brouillon ouverte sur `main`.

## Objectif

P3 laissé de #2287 (handoff `2026-11-20-2001-orchestrateur-mise-en-service.md`
§ revue) : sous bash 3.2, un nom de branche accentué sortait « lecture GitHub
en échec » (sûr mais muet). Le dire nommément non interrogeable, sans jamais
le dire « prouvé » ni le supprimer.

## Décisions prises

- Cause : la plage `A-Za-z` de `branche_sure` suit la collation de la locale
  sous bash 3.2 ; « é » y tombe entre « e » et « f », donc le nom passait le
  filtre et partait non encodé vers `gh`, qui échouait (code 2).
- Correctif : l'alphabet s'écrit en toutes lettres, sans plage. Un caractère
  multioctet (lu en caractère ou en octets) est hors liste dans les deux cas.
- Écarté : encoder le nom (`@uri`) pour interroger quand même GitHub — plus
  de surface (dépendance `jq` hors `gh`) pour des noms rares ; la fiche admet
  « les dire nommément non interrogeables ».
- Écarté : `LC_ALL=C` local à la fonction — comportement de bash 3.2 non
  vérifiable ici.

## Fichiers modifiés

- `scripts/nettoyage-branches.sh` (`branche_sure`)
- `scripts/nettoyage-branches.test.mjs` (branche `fix-é`, sentinelle sans plage)
- `changelog.d/2026-11-24-nettoyage-branches-bash32.md`
- `docs/claude/handoffs/2026-11-24-1411-nettoyage-branches-bash32.md`

## Validations exécutées

- `node --test scripts/nettoyage-branches.test.mjs` → 4/4 verts.
- `npm run check:rapide` → 0 (18 étapes vertes, 2 sautées).
- `npm run check` (T1 complet) → 0.
- Non rejoué sous bash 3.2 : le conteneur n'a que bash 5.2 et la locale
  `C.utf8`. La sentinelle du banc tient la cause (aucune plage), pas le
  symptôme.
- T2/T3 non joués : interdits à la passe cloud, et non exigés (outillage).

## Problèmes ouverts

- Constat à faire sur le Mac (bash 3.2) avec une branche accentuée réelle,
  si l'occasion se présente : sortie attendue « nom de branche non
  interrogeable ».

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
puis « prête @<sha> » et ligne `prete` à la boîte `integrateur`. Merge par
l'intégrateur.

## Interdits encore actifs

- Jamais `--appliquer` depuis une session ; la logique de preuve et de
  suppression ne change pas.
- Passe cloud : ni merge, ni T2/T3, ni second lot.
