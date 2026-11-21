# Handoff — file D, lot `orchestrateur-l3-integrateur` : outillage de merge versé et durci (D-546, 2026-11-20)

## 1. Branche et état Git

- La branche `docs/orchestrateur-l3-integrateur` a été tirée d'`origin/main` (b5d01656) le 2026-11-20 à 20:49Z,
  dans le worktree `.claude/worktrees/orch-ci`. L'ancienne branche, `docs/orchestrateur-mise-en-service`
  (squashée par #2287), n'a pas été touchée.
- Commit tardif (D-518).
- Carnet : le lot `orchestrateur-l3-integrateur` (ordre 97) est pris le 2026-11-20 à 20:49Z, avec `if_version`.
- Boîte D : le `merge_fait` de #2287 a été accusé (`traite`).
- Les questions 20261118-2312-d, 1231-d et 1232-d sont closes par l'intégrateur. Je l'ai vérifié.
- Session concurrente de la file D, qui travaille en `git` et `gh` directs. La PR se déclare « prête », et
  l'intégrateur la merge.

## 2. Objectif

L3 du plan du super-orchestrateur, d'après D-540 §10 (4) et la réponse `20261113-1941-d` (« Verser et durcir,
avec délai de repentir »). L'outillage de merge de l'intégrateur entre au dépôt, avec ses bancs :
- origine des déclarations ;
- délai de repentir de dix minutes ;
- bail unique ;
- journal des merges.

D-xxx amendant D-454. Lot P0, au Mac, jamais en cloud.

## 3. Décisions prises

- **Cadrage : aucun arbitrage.**
  - 1941-d fixe le contenu et la valeur (dix minutes). Le texte de son option décrit la suspension : « toute
    reprise de parole sur la PR pendant ce délai suspend le merge ».
  - Les choix restants sont techniques, et écrits dans D-546. La décision reste contestable en séance (note de
    la réponse).
- **D-546** (numéro réservé par `wn-reserver-decision.mjs`) amende D-454. Une ligne d'amendement est ajoutée à
  D-454. Ses choix :
  - Est une parole toute prise de parole postérieure à la déclaration servie : commentaire, revue soumise ou
    commentaire en ligne, celle d'un robot comprise. Le texte n'est pas lu.
  - La marque `<!-- wn-integrateur -->` exempte les commentaires de l'intégrateur, comme sa prise en charge.
  - Reprise : une redéclaration neuve ; le délai repart d'elle.
  - Relecture de la parole et de la tête juste avant `gh pr merge`.
  - Bail sans expiration. Une reprise se fait par `--reprendre` déclaré, écrite au journal. La session est
    identifiée par `WN_S`.
  - Bail et journal : `<git-common-dir>/wn-integrateur/`, jamais suivis.
  - Le filet de D-454 passe par `--filet` : vingt minutes, sans bail. Il est refusé si un commentaire marqué
    existe.
  - Les codes d'`integrer.sh` sont gardés (9, 11 à 18). Codes neufs : 10, 19 à 23. J'ai évité le 24 (porte 24).
- **La sonde `prete`** reçoit le contrôle d'origine avec les mots du guetteur hors dépôt (`provenance=ok`,
  `CONTROLE-INDETERMINE(…)`). Ce que lit l'intégrateur ne change pas.
- **Écart trouvé au cadrage.** La sonde `prete` versée par #2076 n'avait pas le contrôle d'origine que
  `guetter.mjs` a reçu le même soir. Il est corrigé ici.
- **Mise en service (D-546 §8).** Cette PR est mergée avec l'ancien outillage. L'intégrateur prend ensuite le bail
  et bascule. Les fichiers hors dépôt ne sont pas touchés.

## 4. Fichiers modifiés

- Neufs :
  - `scripts/wn-integrer.mjs` et `scripts/wn-integrer.test.mjs` ;
  - `scripts/lib/origine-declaration.mjs` ;
  - `docs/decisions/D-546.md` ;
  - `changelog.d/2026-11-20-orchestrateur-l3-integrateur.md` et ce handoff.
- Modifiés :
  - `scripts/wn-guetteur.mjs` et son banc ;
  - `scripts/lib/gh-rest.mjs` (`isCrossRepository`, `headRepositoryOwner`) et son banc ;
  - `web/package.json` : le banc neuf entre dans `bancs-outillage-check` ;
  - `docs/decisions/D-454.md` (amendement), `CLAUDE.md`, `docs/ROLES_MACHINES.md`,
    `docs/claude/REGLES_PR_MERGE.md`.

## 5. Validations exécutées

- Bancs : `wn-integrer`, `wn-guetteur` et `gh-rest` sont verts, 96 tests en tout, après les corrections des
  revues.
- Lecture REST réelle de #2287, en lecture seule : origine `provenance=ok`, déclaration servie trouvée, paroles
  lues. Aucun merge et aucun lancement réel du script : il exige la copie principale.
- `npm run check:rapide` : **rouge préexistant sur main**, hors périmètre. C'est `interventions-check` :
  WN-SRC-0821, ajoutée au registre des sources par #2288, que le critère désigne et que le registre des
  interventions n'a pas.
- Joués un à un et verts :
  - `bancs-outillage-check`, `decisions-check`, `skills-check`, `hooks-check` ;
  - `secrets-check`, `plan-journal-check`, `ancres-check`, `registry-check` ;
  - `campaign-audit-check`, `lint`.
- Pas de T2 : ni UI ni API.
- **Contre-revue Codex** (P0, D-505, `gpt-6.1-sol`, avis conforme, code 0) : 4 P1 et 1 P2, aucun P0. Les cinq
  sont **corrigés**, avec leurs bancs :
  - une déclaration réécrite qui sautait le délai ;
  - une marque valable n'importe où ;
  - `main` comparé à une valeur relue, remplacé par `main0` ;
  - la course entre rendu et reprise du bail, réglée par un verrou `mkdir` ;
  - une avance `--ff-only` non vérifiée, qui rend désormais le code 25.
- **Revue `wn-reviewer`** : GO conditionnel en deux passes, puis **GO** sur le code courant. Une troisième passe
  a vérifié les deux conditions, et les deux sont **corrigées**, avec leurs bancs :
  - P1 : une déclaration barrée était servie. Une déclaration modifiée ne l'est plus jamais.
  - P2 : la marque n'était liée à aucun auteur. Elle exige maintenant le propriétaire et `OWNER`.
- P3 corrigés :
  - la tête est relue avant le retour de `--sans-merge` ;
  - une parole de la même seconde que la déclaration compte ;
  - refus si `scripts/` diffère de `main`, ce qui couvre le filet joué depuis une branche ;
  - le bail illisible ne vaut jamais « libre » ;
  - « rendre le bail avant /clear » est écrit dans D-546 §4.
- P3 laissés, avec leur motif :
  - le délai se mesure à l'horloge locale : quelques secondes d'écart ;
  - `e.message` est recopié au journal, qui est local et non suivi ;
  - les robots qui modifient leur résumé après « prête » suspendent le merge. C'est conforme, et il faut
    s'attendre à des redéclarations.

## 6. Problèmes ouverts

- Le rouge `interventions-check` (WN-SRC-0821) sur `main` est à router à la file de #2288 (corpus, H15).
- La bascule de l'intégrateur sur les scripts du dépôt est son geste, après le merge (D-546 §8).
- La phase 3 (pilote) attend le feu vert du responsable. `orchestrateur/arret` reste à `true`.
- La file D n'a plus de lot `pret` après celui-ci. `autonomie-pieges-restes` (ordre 35) reste pris.

## 7. Prochaine action exacte

1. (Fait : GO de `wn-reviewer`.)
2. Commit, push, PR (`--body-file`). Déposer le rendu de Codex sur la PR, avant « prête ».
3. `node scripts/wn-attendre-ci.mjs <N>` en fond, puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0 ; à défaut,
   `wn-reviewer` (D-448).
4. Un verdict par commentaire. Poser `pr` au carnet. Écrire « prête @<sha> » sur la PR et la ligne `prete` à
   l'`integrateur`.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Rien de `web/src/lib/clinical/`, pas de
  `prisma format`. Aucune écriture en production.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Ne créer, rallumer ni lancer aucune routine : `trig_01E33BkjkxbcRbsC3PF3KubZ` reste désactivée,
  `orchestrateur/arret` reste à `true`, et la phase 3 attend le feu vert.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système. Pas d'allongement du délai
  ni de retries. Porte 24 non levée.
- Ne jamais lancer `wn-integrer.mjs` en réel depuis une file, hors du filet de D-454.
