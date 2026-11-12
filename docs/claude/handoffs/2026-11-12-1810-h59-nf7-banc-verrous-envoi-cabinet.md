# Handoff — 2026-11-12 — H59 (J2-base), NF-7 : verrous de l'envoi éprouvés contre PostgreSQL

## Branche et état Git

- Worktree `.claude/worktrees/h59-nf7-lot3`, réutilisé : il a d'abord été
  détaché sur `origin/main` après le merge de #2021, puis l'ancienne branche
  a été supprimée.
- Branche neuve `feat/h59-nf7-banc-verrous`, partie d'`origin/main`, puis
  avancée en `--ff-only` sur `9a680203` (#2032).
- PR ordinaire (ni migration, ni authentification, ni chemin clinique) :
  déclarée « prête @<sha> » à l'intégrateur, sans merger.

## Objectif

Le lot 3 laissait ouvert un problème : les verrous `FOR SHARE` (envoi) et
`FOR UPDATE` (modification) n'étaient éprouvés que comme chaînes SQL. Il faut
les éprouver contre PostgreSQL avant l'allumage du drapeau NF-7.

## Décisions prises

- **B, permanent**, arbitré par le responsable : un banc joue les vrais
  écrivains, à chaque T3 et à chaque CI.
- **Aucune extraction de code de production.** Les handlers
  `file-envoi/envoyer` (POST) et `instruments` (PATCH) sont appelés tels
  quels, par une instance jiti propre au banc. Seuls `next-auth` et
  `@/lib/auth` y sont remplacés, par des substituts sous
  `web/scripts/banc-stubs/`, jamais importés par l'application. Les tests des
  routes, dont la régression P1-1 et le comportement drapeau éteint, sont
  inchangés.
- **Course 10.** La modification concurrente y est rejouée en SQL par le
  tiers : l'écrivain éprouvé est l'édition du titre, qu'aucun verrou ne
  permet de suspendre entre sa lecture et son écriture sans bloquer aussi les
  autres écrivains.
- **« Déclarer » et l'envoi ne visent jamais la même ligne.** « Déclarer »
  n'agit que sur un publié non déclaré, que l'envoi écarte dès sa lecture.
  Le banc le constate dans les deux ordres, au lieu de fabriquer une course
  impossible.
- **Question `20261111-2148-a`.** Son option 1 est corrigée dans la liste
  commune (D-277 préalable à l'allumage). La question reste ouverte.

## Fichiers modifiés

- `web/scripts/banc-envoi-cabinet-deux-sessions.test.ts` (neuf) : dix courses.
- `web/scripts/banc-stubs/next-auth.ts`, `web/scripts/banc-stubs/auth.ts`
  (neufs).
- `.github/workflows/ci.yml` : pas « Cabinet instrument send race bench ».
- `scripts/wn-test-worktree.sh` : le même banc, avec la garde « ci.yml le
  lance ».
- `changelog.d/2026-11-12-h59-nf7-banc-verrous-envoi-cabinet.md`,
  `docs/claude/plan-journal/H59/2026-11-12-04-nf7-banc-verrous-envoi-cabinet.md`.

## Validations exécutées

- Banc vert sur la base locale `wn-dev-db` (dix courses), puis aucune ligne
  de fixture restante.
- Quatre mutations du code de production, chacune restaurée par
  `git checkout` ; toutes rougissent le banc :
  - envoi sans `FOR SHARE` ;
  - modification sans `FOR UPDATE` ;
  - modification sans recomptage sous verrou ;
  - retour du défaut P1-1.
- Nettoyage constaté après les runs en échec : aucune ligne restante.
- T1 (`check:rapide`) vert, après `prisma generate` : le client local
  ignorait la table de #2018.
- T3 : voir la PR.

## Problèmes ouverts

- **Lot à part D-277** (`20261111-2148-a`, ouverte) : préalable à l'allumage.
- **Copies NULL** : 0 assignation `CAB_` en production (one-off-5712, le
  2026-11-12). Compte à refaire juste avant l'allumage.
- **Reprise avant un rallumage** : inchangée (`docs/FEATURE_FLAGS.md`).
- **Porte 24** (`20261109-1354-c`) : non tranchée.
- **Worktree.** Le worktree porte encore le nom du lot 3 ; à supprimer depuis
  la copie principale après le merge de ce lot.

## Prochaine action exacte

T3, push, PR, CI en fond, revue PR-Agent sur la tête (D-499), un verdict par
remarque, puis « prête @<sha> » à l'intégrateur. Ensuite, le lot D-277
(cadrage sans code) une fois `20261111-2148-a` répondue. L'allumage reste un
geste du responsable.

## Interdits encore actifs

- Ni migration ni `schema.prisma` ; rien sous `web/src/lib/clinical/`.
- Texte de l'encart D-275 inchangé ; rien de D-277 sur un `CAB_` tant que son
  lot n'est pas arbitré.
- Ne pas reposer :
  - D-303, D-493 ;
  - les réponses 0027-a à 0030-a ;
  - les arbitrages P2-1, P2-3 et P2-4 ;
  - le choix B.
- Production en lecture seule, par conteneur, en agrégats.
- Allumage : geste du responsable.
