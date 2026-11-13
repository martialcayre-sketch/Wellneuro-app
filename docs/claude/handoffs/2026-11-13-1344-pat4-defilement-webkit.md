# Handoff — 2026-11-13 — Refonte Lien PAT-4, suite de #2056 : défilement du message de sécurité en WebKit, sans tolérance

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat4-defilement-webkit`, créée sur `origin/main` après le merge (squash) de #2056 en `52a7e0eb`, dans le worktree `.claude/worktrees/pat4-questionnaires-agendas`. PR #2059 en brouillon.
- La session ne merge pas : elle déclare « prête @<sha> », et l'intégrateur merge.

## Objectif

Le responsable refuse la tolérance WebKit que #2056 avait introduite dans l'E2E D-506 (2026-11-13, « Refuse la tolérance », relayé par la session parente). #2056 avait été mergée à 12:25:15Z, avant ce refus ; la déclaration « prête » a été retirée à 12:30Z, sans effet.

Ce qui est attendu :
- retirer la tolérance ;
- instruire l'arrêt court du défilement animé en WebKit ;
- corriger dans le composant, pas dans le test ;
- porter la question au responsable si le correctif touche le comportement fixé par D-506.

## Décisions prises

- **Instruction.**
  - La position du message dans le document (haut + défilement) vaut 4 421 dans tous les runs, bons comme mauvais : la page ne se décale pas.
  - Le journal du run réussi (#2059, `9011d660`) montre deux temps :
    - à 143 ms, Playwright amène la case B7 à 3 795 avant le clic, alors que le message est encore absent ;
    - à 702 ms, le défilement de D-506 va à 4 019 en un seul événement. Sous WebKit Linux, l'animation n'a pas d'étapes intermédiaires.
  - Le run raté de `29bfdbaf` s'était arrêté exactement à 3 795. Lecture : la demande de défilement a été **ignorée** par le moteur, et non interrompue en route. Pour les runs ratés de `c4a448cc` (3 872) et de `361cadbb` (538, soit 3 883), ce n'est qu'une hypothèse : elle tient si Playwright y avait laissé B7 à une autre position. S'il s'agissait d'arrêts en cours de route, la page a bougé, la relance ne joue pas, et l'E2E strict rougira de nouveau : ce sera l'issue honnête.
  - Les trois runs avec journal (`1efdffda`, `97e0fd09`, `9011d660`) sont tous bien placés : la présence des écouteurs a pu changer le minutage. C'est un fait, pas une cause établie.
- **Correctif** (`MessageReponseSuicide.tsx`) : après 600 ms, si la page est toujours à la position d'avant la demande et que le message n'est toujours pas entièrement visible, la même demande est renouvelée, une fois.
  - La relance garde le même défilement minimal, la même animation hors mouvement réduit, et le focus inchangé.
  - Une page qui a bougé, y compris par le patient, n'est jamais relancée.
  - La vérification est annulée au démontage du message.
  - Lecture de la session : cela met en œuvre D-506 sans en changer le comportement. Ni les moments (§4), ni le texte, ni l'emplacement ne changent. À confirmer par la revue.
- **E2E** : la tolérance est retirée, et `bienPlace` est exigée partout. Le journal est consigné à chaque mesure, et aussi quand la position ne se stabilise pas (remarque de PR-Agent, corrigée).

## Fichiers modifiés

- `web/src/components/patient/MessageReponseSuicide.tsx` et son test (quatre cas de relance, minuterie simulée).
- `web/e2e/portail-message-securite.spec.ts`.
- `changelog.d/2026-11-13-pat4-defilement-webkit.md`, ce handoff.

## Validations exécutées

- Vitest ciblés : 158/158 (`MessageReponseSuicide`, `GenericQuestionnaire`, portail).
- CI de `9011d660` (tolérance retirée, sans correctif) : e2e vert, WebKit animé bien placé sous la question et au résumé ; `controles` rouge, faute de ce handoff.
- T1 rapide (`check:rapide`) : vert, 16 étapes.
- Revue wn-reviewer sur `1ad95dad` : la relance met D-506 en œuvre fidèlement, sans en changer le comportement, et ne relève donc pas du responsable. NO-GO sur un P1 : la fenêtre de stabilité de l'E2E (800 ms) se fermait avant que la relance puisse atterrir. Corrigé : dix relevés identiques, soit 1,8 s, avec un délai de 12 s. P2 traités : test de la relance en mouvement réduit ; hypothèse reformulée ci-dessus.
- Deuxième revue, sur `479fbac1` : NO-GO sur un P1. L'écouteur `scroll` ajouté pour un P2 (« tout événement compte comme un mouvement ») désarmait la relance au résumé : l'événement du `scrollTo(0, 0)` qui précède le montage arrive après la demande. Corrigé en retirant l'écouteur : la position seule fait foi, et un test fige la relance au résumé (il échouait avec l'écouteur). Le P2 d'origine (retour au même pixel en moins de 600 ms, toucher annulé avant toute image) est écarté : ces cas sont improbables, et l'écouteur rouvrait un défaut plus grave à un moment fixé par D-506 §4. Indentation de l'E2E corrigée.
- Vitest ciblés après correction : 160/160.
- Troisième revue, sur `ef973433` : **GO**, sans P0, P1 ni P2. La relance met D-506 en œuvre sans en changer le comportement : rien à porter au responsable.
- Verdicts sur PR-Agent (revue de `479fbac1`) :
  - « Comportement D-506 modifié sans décision ni fragment » : corrigé pour le titre de la PR, `test(e2e)` devenu `fix(patient)`, et pour sa description. Écarté pour le reste : le fragment `changelog.d/2026-11-13-pat4-defilement-webkit.md` est dans la PR, et la revue clinique juge la relance fidèle à D-506 (un mouvement par apparition, jamais après un mouvement de la page).
  - « Journal tronqué au début » : corrigé. Le journal garde ses 20 premières et ses 100 dernières entrées.
  - « Relance limitée à la page immobile » : écarté. Relancer après un mouvement partiel contredirait D-506 §1 et §3, puisque rien ne distingue un arrêt du moteur d'un défilement du patient. Un arrêt en cours de route ferait rougir l'E2E strict : c'est l'issue voulue.

## Problèmes ouverts

- L'arrêt court est intermittent, et non reproduit depuis l'ajout du journal. Un vert de la CI ne prouve donc pas sa disparition : la relance couvre la demande ignorée, et le journal consigné dira, au prochain écart, si la relance a joué.
- Mesure sur iPhone réel (`20261113-1302-d`, liste commune) : toujours due.
- Décision clinique de `20261113-1050-d` (texte ou ordre du message au zoom 200 %) : hors de ce lot, à rédiger.

## Prochaine action exacte

1. Pousser, puis `node scripts/wn-attendre-ci.mjs 2059` en tâche de fond.
2. Revue : `node scripts/wn-revue-pr-agent.mjs 2059` ; à défaut, wn-reviewer sur la nouvelle tête.
3. Si la revue la juge hors de D-506 et que la CI sort à 0 : passer la PR hors brouillon, déclarer « prête @<sha> » et écrire la ligne au registre. Sinon, poser la question à la liste commune avec les faits du journal.

## Interdits encore actifs

- Aucune tolérance dans l'E2E (refus du responsable du 2026-11-13).
- Rien de clinique au-delà de [[D-506]] ; aucun texte hors de [[D-488]] ; aucun drapeau, aucune migration.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seulement ; production en lecture seule.
- La session ne merge pas.
