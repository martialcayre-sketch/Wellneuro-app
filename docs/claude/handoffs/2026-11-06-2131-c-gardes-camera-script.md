# Handoff — 2026-11-06 — File C, place 11 : gardes de la caméra après le constat (H83, D-437)

## Branche et état Git

Branche `c-h83-gardes-camera-script`, partie d'`origin/main` 0e576389 (#1894 mergée, 6e203843),
dans le worktree `.claude/worktrees/c-constat-capture-repas`. Il s'agit d'une session concurrente :
le cycle se fait en `git`/`gh` direct, sans `/wn-*`. Le lot ne comporte ni migration, ni release-db,
ni drapeau.

## Objectif

Traiter les deux points de revue de #1878 routés vers le « lot qui suit le constat » sur la fiche
H83 :
1. le nitpick CodeRabbit : vérifier la politique caméra effective dans l'E2E de l'agenda ;
2. le constat PR-Agent : `camera=(self)` ouvre la caméra à tout script de la page, et rien ne
   refuse un script d'une autre origine.

## Décisions prises

- **Point 1.** `e2e/portail-agenda-alimentaire.spec.ts` vérifie sous Chromium, avec
  `document.permissionsPolicy ?? featurePolicy`, que le document du hub n'ouvre pas la caméra et
  que celui de l'agenda, atteint par le lien du hub, l'ouvre. Si aucune des deux API n'existe, le
  test lève une erreur au lieu de passer à vide. Sous WebKit, le contrôle est sauté, faute d'API.
- **Point 2 : un en-tête plutôt qu'une E2E.** La route `/portail/:token/questionnaires/:idAssignation`
  porte `Content-Security-Policy: script-src 'self' 'unsafe-inline'; frame-ancestors 'none'`.
  L'en-tête a été retenu pour trois raisons :
  - le navigateur refuse à l'exécution, en production, tout script d'une autre origine, quel que
    soit le chemin qui l'insère (import dynamique, intégration chargée à la demande, balise posée
    par une dépendance) ;
  - une E2E sur les `<script src>` ne verrait qu'un instant du DOM d'une fixture, sur les branches
    parcourues ;
  - une E2E ne protège pas la production : elle ne fait que signaler en CI.
- **Ce qui protège Next et Sentry.**
  - `'unsafe-inline'` laisse passer l'amorçage et les charges RSC en ligne.
  - `'unsafe-eval'` est ajouté en développement seulement (condition `NODE_ENV`, figée au build).
  - Sentry est empaqueté dans `/_next/static`, Replay est désactivé (aucun worker `blob:`) et ses
    envois relèvent de `connect-src`, que l'en-tête ne pose pas.
  - `frame-ancestors 'none'` est repris, parce que la même clé remplace la valeur de `/:path*`.
- **Limite écrite.** Un script injecté en ligne (XSS) n'est pas couvert : seul un nonce le
  fermerait, et ce lot n'en pose pas.

## Fichiers modifiés

- `web/next.config.mjs` (en-tête CSP sur la seule route du questionnaire, commentaire)
- `web/e2e/portail-permissions-camera.spec.ts` (valeur exacte et unique de la CSP, sur la route et
  hors d'elle ; valeur attendue selon `PLAYWRIGHT_WEB_SERVER`)
- `web/e2e/portail-agenda-alimentaire.spec.ts` (politique caméra effective du hub et de l'agenda
  sous Chromium ; aucune violation de CSP en console pendant le parcours)
- `changelog.d/2026-11-06-d437-gardes-camera-script.md`
- `docs/claude/plan-journal/H83/2026-11-06-03-gardes-camera-script.md`
- ce handoff

## Validations exécutées

- T1 : `npm run check:rapide` est vert, avant et après les retouches de revue, et `npm run check`
  est vert. Le client Prisma a été régénéré au préalable, parce qu'il était périmé dans ce
  worktree. Le schéma n'a pas été touché.
- T2 : `npm run test:worktree -- --fast` est vert en 8 min 26 s, sur le build de production,
  Chromium et WebKit. Les deux tests de `portail-permissions-camera` et le parcours de l'agenda
  sont verts dans les deux projets, avec la version finale des specs.
- Revue P1 par `wn-reviewer`, sans bloquant. Deux points mineurs ont été corrigés :
  - la spec des en-têtes aurait rougi à tort sous `next dev` ;
  - le commentaire promettait une garde contre « tout script ».
  Le nit sur les motifs `:nom` dans la valeur a été traité par une ligne de commentaire. Deux nits
  ont été écartés : l'écoute CSP ne couvre que le parcours principal, et cela suffit pour
  l'hydratation ; `'self'` et les points de même origine sont couverts par `nosniff` et le JSON.

## Problèmes ouverts

- L'en-tête n'a pas encore été constaté sur `app.wellneuro.fr` après le déploiement. Il faut
  vérifier par `curl -sI`, puis contrôler sous Chrome et Safari qu'aucune violation de CSP
  n'apparaît en console.
- iOS n'a toujours pas été observé pour la capture (constat de D-437 §7).
- Le cas de l'injection en ligne (XSS) reste hors de la garde, faute de nonce.

## Prochaine action exacte

CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond. Ensuite, lire toute la revue de
CodeRabbit, ou celle de PR-Agent sur la tête : synthèse, corps, « Recommended focus areas » et
commentaires en ligne, avec un verdict pour chacun. Puis déclarer « prête @<sha> », sans merger
(essai D-373). Après le merge et le déploiement : `curl -sI` sur la route du questionnaire et sur le
hub.

## Interdits encore actifs

- L'assistant ne pose aucun drapeau et ne redémarre rien.
- La production se lit seulement, par conteneur détaché et en agrégats. Aucune fixture ne sert de
  constat.
- Aucun nom ni e-mail de dossier dans le dépôt. Aucun identifiant de dossier accompagné de mesures.
- Aucune IA, aucun texte patient neuf, aucune migration. Aucun lien d'artefact dans ce dépôt
  public. Aucun merge par la file C.
