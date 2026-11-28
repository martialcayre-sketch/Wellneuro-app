# Handoff — 2026-11-27 — Banc de `run-certify-bancs.sh`

Lot `banc-run-certify-bancs` (file D, P1, lieu cloud), mené par la passe de
l'orchestrateur cloud `20261127-1209-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-v2c3z0`, tirée d'`origin/main` à `67807e3c`.
- Un commit de lot (banc, câblage `check`/CI, fragment, ce handoff), poussé ;
  PR ouverte sur `main`, sortie du brouillon avant le CI.

## Objectif

`scripts/run-certify-bancs.sh` est un garde bloquant de `npm run check`
(`certify-check`, web/package.json) et du CI, et un garde d'outillage joué
par `check` sans banc. Prouver sa promesse écrite en tête : un dossier de
`tools/corpus/*/lib` sans aucun `*.test.mjs` fait échouer en 1, avec un
message, au lieu du `# tests 0` vert d'un motif nu.

## Décisions prises

- **Banc hermétique, patron `repo-hygiene.test.mjs`.** Le script est copié
  dans `<tmpdir>/scripts/` (il dérive sa racine de `BASH_SOURCE`), les quatre
  dossiers sont garnis d'un banc trivial qui pose un fichier témoin, et le
  script est joué depuis un `cwd` hors de la racine jetable.
- **Scènes.** Vert : code 0, ligne « bancs de certification exécutés (4) »,
  chaque chemin listé, quatre témoins. Mutation, répétée pour chacun des
  quatre dossiers : suffixe de test changé et fichier d'outil restant →
  code 1, message qui nomme le dossier, aucune liste, aucun témoin. Dossier
  absent → même verdict. Contre-épreuve : un banc rouge rend le script rouge.
- **`NODE_TEST_CONTEXT` retiré** de l'environnement du script : le banc est
  lui-même joué par `node --test`, et ce contexte ne doit pas passer au
  `node --test` imbriqué.
- **Témoins plutôt que sortie du reporter** : la forme du rapport de
  `node --test` (tap ou spec) dépend de la version et du terminal.
- Comportement du script inchangé ; bancs de corpus réels hors périmètre.

## Fichiers modifiés

- `scripts/run-certify-bancs.test.mjs` (nouveau).
- `web/package.json` : banc inscrit à `bancs-outillage-check`.
- `.github/workflows/ci.yml` : banc inscrit à l'étape « Outillage de
  l'intégrateur, de l'orchestrateur et des paliers (bancs) », commentaire de
  l'étape complété.
- `changelog.d/2026-11-27-banc-run-certify-bancs.md`, ce handoff.

## Validations exécutées

- `node --test scripts/run-certify-bancs.test.mjs` : 7 tests verts.
- Mutations du script, jouées sur une copie au bloc-notes de la session
  (le banc copié à côté) : contrôle `exit 1` neutralisé → 5 rouges ; dossier
  `claims/lib` retiré de la liste → 3 rouges ; code de `node --test` avalé
  (`|| true`) → 1 rouge. Script du dépôt jamais modifié.
- `node --test scripts/parite-check-ci.test.mjs scripts/ci-invariants.test.mjs
  scripts/workflows-environnements.test.mjs` : 116 verts.
- T1 complet (`npm run check`) : le premier passage rougit au type-check,
  faute de client Prisma dans le clone frais (environnement). Après
  `npx prisma generate`, le rejeu rend 0 : `bancs-outillage-check` joue le
  nouveau banc, 1365 verts. Les corrections P2 ci-dessous ne touchent que
  des commentaires. Ensuite, banc et parité rejoués : 116 verts.
- Revue P1 `wn-reviewer` avant le push : **GO**, aucun P0 ni P1. Elle a
  rejoué les mutations et en a ajouté (`nullglob` désactivé, premier banc
  sauté), toutes rouges. Le mutant `exec node … || true` reste vert, et il est
  équivalent : `exec` remplace le shell. Trois P2 :
  1. date du constat d'herméticité dans le commentaire de `ci.yml`, corrigée ;
  2. « le seul script joué par `check` sans banc » était trop absolu
     (`check_questionnaire_certification.js` n'a pas de banc dédié). Corrigé
     en « un garde d'outillage » dans le banc, le fragment et ce handoff ;
  3. environnement presque entier hérité par le `node --test` imbriqué
     (`NODE_OPTIONS`, `NODE_V8_COVERAGE`), écarté : c'est la pratique des
     bancs voisins, et ni `check` ni le CI ne les exportent aujourd'hui.
- Ni T2 ni T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Ligne `20261125-1300-b` de la boîte `D` (E2E instable
  `e2e/portail-rail-lateral.spec.ts:128`) : toujours `lu`, hors de ce lot.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
« prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur
la ligne du lot. Merge : l'intégrateur.

## Interdits encore actifs

Passe cloud : ni merge, ni release-db, ni T2/T3, ni `test:e2e`, ni lot
suivant. Comportement de `run-certify-bancs.sh` hors périmètre. Aucune
adresse d'artefact dans le dépôt.
