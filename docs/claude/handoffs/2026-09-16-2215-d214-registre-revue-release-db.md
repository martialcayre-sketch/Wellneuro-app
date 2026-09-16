# Handoff — 2026-09-16 — `D-214` : la règle du jour reçoit son entrée au registre

Suite directe du merge `ad6c8057`. Le responsable a répondu « oui » à la seule
question restée ouverte : faut-il enregistrer la règle comme décision.

## Branche et état Git

`wn-d214-registre-2026-09-16`, branchée sur `origin/main` (`ad6c8057`). Diff
purement documentaire — registre, fragment, clôture, plus une ligne dans le
fichier de règle pour qu'il cite sa décision.

## Ce que porte le lot

| Fichier | Rôle |
|---|---|
| `docs/DECISIONS.md` | **`D-214`**, en tête de section active |
| `.claude/rules/pr-revue-et-release-db.md` | Une ligne : le fichier cite la décision qui le pose, et redit qu'il ne réarbitre ni `D-087` ni `D-120` |
| `changelog.d/`, `SESSION_LOG.md`, ce handoff | Clôture, écrite sur la branche vivante |

## Ce que `D-214` grave, et ce qu'elle ne fait pas

Elle grave **le pourquoi** (quatre PR mergées sur CI vert le 2026-09-16 ; six
constats laissés, quatre réels, dont deux défauts en production ; aucun visible
au CI), **l'obligation** (trois verdicts, aucun commentaire sans l'un d'eux ;
`release-db` en sept étapes constatées, avec sa fenêtre de panne et ses cinq
pièges), et **son épreuve sur elle-même** — quatre constats Copilot retenus sur
la PR qui la posait, dont deux visant le texte qu'elle venait d'écrire.

Elle **n'exécute rien de neuf** : la règle, l'étape 6 bloquante de `/wn-merge` et
les deux renvois corrigés vers le conteneur one-off sont en service depuis
`ad6c8057`. Elle ne réarbitre ni [[D-087]] ni [[D-120]], et
`docs/DEPLOIEMENT_RELEASE_DB.md` reste la source de la procédure.

## Le point de vigilance de ce lot

**Le numéro se prend au merge.** `D-214` était libre au moment de l'écriture
(registre à 213, sans trou). Sept collisions ont été constatées en deux jours
cette semaine : re-jouer `node scripts/lib/decisions-numerotation.mjs` juste
avant de merger, et passer le `--subject` qui porte le **bon** numéro — éditer le
titre de la PR ne changerait rien au sujet du squash.

## Validations exécutées

`node scripts/lib/decisions-numerotation.mjs` → **214 décisions, D-001 à D-214,
sans doublon ni trou** · `bash scripts/check_no_secrets.sh` → OK ·
`node --test scripts/changelog-collate.test.mjs` → 12 verts ·
`node --test scripts/wn-etat-reel.test.mjs scripts/wn-coherence-etat.test.mjs`
→ 39 verts. Au CI : `verify` vert sur `c8ef87c0`, `head=` du SNAPSHOT identique
à la tête réelle de la PR. Revue Copilot lue et traitée (un constat, retenu).

## Problèmes ouverts

- **Le numéro n'est pas réservé tant que la PR n'est pas mergée.** Si une autre
  session prend `D-214` d'ici là, l'entrée se renumérote et le `--subject` suit.
- **Ce correctif-ci ne sera pas relu par Copilot** : il revoit une fois, à
  l'ouverture (§1.6 de la règle). Le verdict du premier passage est le seul
  garanti.
- **Le handoff du même jour à 21 h 54** (`…-regles-revue-et-release-db.md`,
  déjà mergé) omet les trois mêmes rubriques. Il n'est pas réécrit — corriger un
  handoff historique le réinterpréterait — mais le défaut est de **classe**, pas
  d'occurrence : rien ne contrôle qu'un handoff porte les huit rubriques que
  `handoffs/README.md` exige. **Non routé faute d'adresse naturelle** :
  `FILE_ATTENTE.md` range des campagnes, `ROADMAP_TECHNIQUE.md` est une
  cartographie. Le dire ainsi plutôt que de le déguiser en routage — un « on
  verra » n'en est pas un, et c'est la règle de ce lot même.

## Interdits encore actifs

- **Aucune écriture en production dans ce lot** — diff documentaire. Approuver
  `release-db` et le déclencher restent des gestes humains, refusés au
  classifieur de permissions.
- **Pas de `D-215`** : rien d'autre n'est arbitré ici, et un numéro annoncé sans
  être écrit ne le réserve pas.
- **Pas de force-push** ; l'autorisation de commit/push/PR/merge court jusqu'au
  **2026-09-17**, la production et les arbitrages restant à demander.

## Prochaine action

PR `--base main`, `wn-attendre-ci` hors tube et **hors enchaînement avec le
push** (il a rendu `0` sur la tête précédente aujourd'hui), lecture de la revue
avec un verdict par commentaire, puis merge avec `--subject`.
