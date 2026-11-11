# Handoff — 2026-11-11 — Portail : « Mon accompagnement » ouvert sur lecture du protocole en échec

## Branche et état du dépôt

- Branche `claude/hub-accompagnement-ouvert`, créée depuis `origin/main`
  (`1a393528`) dans le worktree `wt-hub-accompagnement`. À déclarer
  « prête @<sha> » pour l'intégrateur (D-373, D-454) après CI et revue de
  bot.
- Indépendante de #1978 (session expirée, fichiers disjoints), encore ouverte
  à la création de la branche.
- Checkout principal non touché.

## Objectif

Corriger le résidu de C1 vu à l'écran le 2026-11-11 (handoff
`2026-11-11-0935-portail-session-expiree.md`) : sur une coupure du protocole,
l'erreur et « Réessayer » de l'accueil restaient dans « Mon accompagnement »,
replié. Réponse du responsable : « Oui, lot maintenant ».

## Décisions prises

- Le hub ouvre le groupe quand SA lecture de `/api/portail/protocole` échoue
  (coupure, statut d'erreur, `ok: false`). Il ne lit pas l'état de
  `PatientCompanionHome` : les deux lectures restent indépendantes, comme
  depuis #1973.
- Lecture de [[D-423]] §3, sans amendement : « déplié d'office quand un
  protocole est servi, replié sinon » ; « sinon » est l'absence confirmée
  (`ok: true, protocoleDiffuse: false`), et une lecture en échec ne dit pas
  qu'aucun protocole n'est servi. Si le responsable lit « sinon » comme tout
  autre cas, c'est un amendement de D-423 §3 à écrire.
- Les signaux de la frise et du fil (`signauxProtocole`) restent au plus
  prudent en cas d'échec, comme avant. Aucun texte neuf.

## Fichiers modifiés

- `web/src/app/portail/[token]/questionnaires/page.tsx` : état
  `lectureProtocoleEchouee`, `<details open>` qui en tient compte.
- `web/src/app/portail/[token]/questionnaires/page.test.tsx` : cinq cas
  (absence confirmée repliée, servi déplié, coupure, 500 et 409 dépliés).
- `changelog.d/2026-11-11-hub-accompagnement-ouvert.md`, ce handoff.

## Validations exécutées

- `npm ci` et `npx prisma generate` dans le worktree.
- Vitest ciblé : 57/57 ; les trois cas d'échec échouent sur l'ancien code
  (rejoué en remettant la page de `HEAD`, puis restaurée).
- T1 complet (`npm run check`) : vert.
- T2 (`npm run test:worktree -- --fast`) : vert ; Vitest 16 713 réussis,
  50 sautés ; Playwright 357 réussis, 23 sautés.
- Constat à l'écran local, le 2026-11-11 : base de dev du worktree, build de
  production, patient fictif Jennifer Martin (`PAT_SEED_02`), programme de
  banc diffusé par les routes praticien, coupure du protocole par
  interception réseau, Chromium (spec temporaire, non versée). *Observé* :
  sans aucun clic, « Mon accompagnement » est déplié et montre « Connexion
  interrompue. Vérifiez votre connexion et réessayez. » avec « Réessayer » ;
  la reprise rend le protocole. *Non vu* : WebKit, le confort 112,5 %.

## Problèmes ouverts

- Aucun du lot.

## Prochaine action exacte

Après « prête » : l'étape 2 de la refonte (réponses 2 a, 3 a, 4 b, 5 a, 6 a
du 2026-11-11).

## Interdits encore actifs

- Aucun texte patient neuf sans acceptation mot pour mot ; aucun chiffre,
  compteur ni pastille côté patient ([[D-333]]).
- Aucune surface neuve à un mineur ([[D-283]] §5) ; aucun drapeau posé ou
  retiré sans demande explicite.
- Production en lecture seule, et seulement sur demande ; aucune identité ni
  identifiant de dossier au dépôt.
