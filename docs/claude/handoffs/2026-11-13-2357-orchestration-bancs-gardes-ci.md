# Handoff — 2026-11-13 — Orchestration (3) : réconciliation avec l'audit externe, puis bancs des gardes de merge en CI

## Branche et état Git

- Branche `chore/orchestration-bancs-garde-ci`, partie de `origin/main` à 921f0908, dans le worktree
  `.claude/worktrees/orch-ci` (la branche précédente, `chore/ci-allegement`, est mergée : #2086).
- Session concurrente « Orchestration », file D : `git` et `gh` en direct. La PR se déclare « prête » ; l'intégrateur
  merge.
- Deux lots du carnet (D-510) dans cette session : `orchestration-7` (fait, sans PR) puis `orchestration-3` (ce lot).

## Objectif

1. `orchestration-7` : réconcilier le plan du super-orchestrateur (rapport Claude Docs, section 7) avec l'audit
   d'architecture externe du 2026-11-13 (annexe A du rapport), sans code.
2. `orchestration-3` (L1 bis) : faire jouer par le CI le banc du contrôle des registres et les cinq bancs de garde de
   merge qui ne tournaient qu'à la main.

## Décisions prises

- Aucune D-xxx. Aucun arbitrage déjà rendu n'est reposé (1941-d à 1944-d, 2205-d, 1703-g).
- Réconciliation : la section 7 du rapport suit l'ordre de l'audit (socle, superviseur en lecture seule, pilote,
  cockpit, généralisation). Le barème quitte L6 (1944-d), l'identité des réponses passe à L5b, les épreuves du socle
  rejoignent L0. Titres d'`orchestration-3`, `-4` et `-6` ajustés au carnet ; ordre inchangé.
- Cockpit (1943-d, surface séparée) : le contrat d'exécution des pages (0.2.74) donne une base par artefact. Une autre
  page ne peut donc pas lire les registres. Question posée : 20261113-2355-d (recommandée : seconde page dans le même
  artefact, après un essai à blanc). Contrôle de version, identité et bouton des questions ordinaires sont cadrés en
  section 7 du rapport.
- Superviseur qui lance des agents : question 20261113-2356-d (recommandée : essai à blanc d'une routine cloud après
  L2, sans écriture).
- Release-db : régime inchangé. `orchestration-6` recouvre `autonomie-release-db`, encore « bloque » alors que 1703-g
  est répondue ; signalé à la boîte D (20261113-2359-orchestration), sans toucher la ligne.
- L1 bis : une seule étape dans `controles`, avant npm, comme les autres bancs d'outillage. Les six bancs restent dans
  `bancs-outillage-check` : la parité l'exige.

## Fichiers modifiés

- `.github/workflows/ci.yml` : étape « Gardes de merge et contrôle des registres (bancs) ».
- `changelog.d/2026-11-13-ci-bancs-gardes-de-merge.md` ; ce handoff.
- Hors dépôt : rapport Claude Docs (section 7, note sous l'annexe B), carnet, liste commune, registre des messages,
  mémoire `orchestration-arbitrages-2026-11-13`.

## Validations exécutées

- Les six bancs, un à un : 170 tests, 0 échec, codes 0 (registres 19, revue PR-Agent 47, sonde release-db 24,
  chevauchement 10, contrôle de fusion 40, avis Codex 30). Le plus long dure 16 s.
- Les mêmes, avec un environnement vidé (`env -i`, `HOME` vide, `PATH` réduit à node, `/usr/bin` et `/bin`, sans
  `gh` ni `codex`) : tous verts. Ce test, joué sur macOS, ne prouve pas à lui seul les points propres au runner
  Ubuntu. La lecture du code (revue `wn-reviewer`) les règle : les commits des bancs passent `-c user.name/user.email`,
  et le script de fusion ne commite pas. Le `gh` réel du runner n'est jamais atteint : faux `gh` en tête du `PATH`,
  dépendances injectées, sortie sur erreur d'usage. Sur le runner, l'étape a pris 5 s, au vert.
- `node --test scripts/parite-check-ci.test.mjs scripts/ci-invariants.test.mjs` : 76/76, code 0. Les six fichiers
  entrent dans la parité.
- Premier CI de `main` après #2086 (cb608354), puis 921f0908 : quatre jobs `success`.
- T1 complet : voir la PR. T2 non joué : ni UI ni API touchées.

## Problèmes ouverts

- Questions 2355-d (forme du cockpit) et 2356-d (routine cloud) en attente du responsable.
- Lots à inscrire au carnet selon la section 7 : L0 (contrat et épreuves du socle), veille locale (1942-d), L3
  (outillage de l'intégrateur, 1941-d), L4 (pilote), L5a et L5b (cockpit).
- Fusion `orchestration-6` / `autonomie-release-db` : à la file D.
- Identité : les sessions écrivent aux registres sous le compte du responsable ; aucune base ne distingue son clic.

## Prochaine action exacte

1. `npm run check`, commit, PR, `node scripts/wn-attendre-ci.mjs <N>` en fond, puis
   `node scripts/wn-revue-pr-agent.mjs <N>`. Lot P1 (orchestration CI) : `wn-reviewer`, mission « la PR retire-t-elle
   une couverture, l'étape est-elle hermétique ? ».
2. Relire la boîte `orchestration` et la ligne `orchestration-3`, puis déclarer « prête @<sha> ».
3. Lot suivant de la file D : `orchestration-4` (L2), après le merge.

## Interdits encore actifs

- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ni approbation ni déclenchement de release-db.
- Aucune adresse de page de suivi ni texte de registre dans le dépôt.
