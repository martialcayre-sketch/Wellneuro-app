# Handoff — 2026-11-05 — File C, place 11 : la caméra rendue à la page de l'agenda (D-437)

## Branche et état Git

Branche `fix/h83-permissions-policy-camera`, dans le worktree
`.claude/worktrees/c-constat-capture-repas` (session concurrente, cycle en `git`/`gh`
direct, aucun `/wn-*`). Partie d'`origin/main` 36a095fb. Sans migration, sans release-db :
ni `schema.prisma`, ni `web/src/lib/clinical/**`.

## Objectif

Rendre la photo du repas (D-437) réellement disponible. Elle est activée en production
depuis le 2026-11-04 (23:59 CET, `WN_PORTAIL_CAPTURE_REPAS=true` posé par le responsable,
web redémarré), mais le bouton n'apparaissait sur aucun appareil.

## Décisions prises

- Cause, constatée le 2026-11-05 : `Permissions-Policy: camera=()` sur `/:path*`
  (`web/next.config.mjs`). Sur un dossier de test majeur, la route de lecture rend
  `captureRepas: true`, mais `navigator.permissions.query({ name: 'camera' })` rend
  `denied` (Chrome macOS ; Pixel 9 Pro signalé par le responsable). La production rend
  `camera=()` sur la page de l'agenda.
- Correctif : une règle `headers()` pour `/portail/:token/questionnaires/:idAssignation`,
  placée après `/:path*`, pose `camera=(self), microphone=(), geolocation=()`. Next 15
  remplace la valeur (`resolve-routes.js`, la dernière règle gagne) ; une seule valeur par
  réponse, vérifiée sur `next dev` et par l'E2E sous `next start`.
- Portée : on ne peut pas descendre en dessous de cette route, qui sert tous les
  questionnaires du portail ; l'URL porte l'assignation, pas le questionnaire. Aucun
  iframe ni script tiers sur le portail ; `self` exclut les cadres d'autres origines ;
  l'invite du navigateur demeure.
- Revue `wn-reviewer` : GO, ni P0 ni P1. P2 retenus : un commentaire sur la navigation
  côté client (la politique est figée au chargement du document ; toutes les entrées
  sont des `<a>` simples aujourd'hui), et les voisins du motif dans l'E2E (le hub, un
  sous-chemin). P2 écarté, avec son motif : lier l'en-tête au drapeau. Les en-têtes sont
  figés au build, le drapeau se lit à l'exécution.

## Fichiers modifiés

- `web/next.config.mjs` (`enTetesCameraPage`, règle `headers()`)
- `web/e2e/portail-permissions-camera.spec.ts` (neuf)
- `changelog.d/2026-11-05-d437-camera-rendue-a-la-page-agenda.md`
- `docs/claude/plan-journal/H83/2026-11-05-01-camera-rendue-a-la-page-agenda.md`

## Validations exécutées

- `next dev` local, à la main : `camera=(self)` sur la seule route de l'agenda ;
  `camera=()` sur le hub, un sous-chemin (404), la connexion, l'entrée du portail et
  `/login`. Une seule valeur par réponse.
- T1 complet (`npm run check`) vert ; T1 rapide vert après les retouches de la revue.
- T2 (`npm run test:worktree -- --fast`) vert en 8 min 54 s, sur la version d'avant les
  retouches de la revue (commentaire, et deux chemins ajoutés à la boucle négative de
  l'E2E) ; l'E2E neuf y passe en Chromium et WebKit. Le CI rejoue la version finale.

## Problèmes ouverts

- Constat de D-437 §7 non fait. Il attend le déploiement de ce correctif, puis le geste
  du responsable sur iOS et Android. La requête en agrégats est prête hors dépôt.
- Une journée a été enregistrée sur le dossier de test pendant l'essai sans bouton
  (2026-11-05, 00:07 CET), sans photo ; elle ne vaut pas constat.
- Un patient dont la caméra est refusée ne voit pas le bouton, et rien ne lui dit
  pourquoi. C'est le choix de D-437 §6 (aucun texte neuf), non rouvert ; il sera noté au
  constat.

## Prochaine action exacte

1. CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond ; revue CodeRabbit, ou
   PR-Agent sur la tête (D-393 §2) ; lire tous les commentaires, en ligne compris ;
   « prête @<sha> », sans merger (essai D-373).
2. Après le déploiement : relire l'en-tête de production sur la route de l'agenda
   (`curl -sI`) ; le drapeau est déjà posé.
3. Geste du responsable (photo prise, journée enregistrée, galerie iOS et Android), puis
   requête du constat en conteneur détaché, et PR de doc (journal H83, état du drapeau
   dans `docs/FEATURE_FLAGS.md`, handoff).

## Interdits encore actifs

- L'assistant ne pose aucun drapeau et ne redémarre rien (porte 18, D-437 §7).
- Aucune IA, aucune dictée, aucune photo transmise ni conservée ; aucun texte patient
  hors des deux textes de D-437 §5.
- Aucune migration. Production en lecture seule, par conteneur détaché, en agrégats ;
  jamais une fixture pour le constat ; aucun nom ni e-mail de dossier dans le dépôt.
- Aucun lien d'artefact dans ce dépôt public. Aucun merge par la file C (D-373).
