# Handoff — 2026-11-25 — Relancer : la fiche ne propose que ce que le serveur relancera (D-562 §2, amendement)

## Branche et état du dépôt

- Worktree `.claude/worktrees/relance-historique-rappels-323ef8`, branche
  `claude/relance-historique-rappels-323ef8`, partie d'`origin/main`
  97e0d72d (récupéré au démarrage). Aucune avance ni fusion depuis.
- PR du lot : voir la PR qui porte ce fichier. Un commit.

## Objectif

Suite de #2350 (D-562). Le dialogue « Relancer » de la fiche-trajectoire
listait tous les envois échus, alors que la route de relance exclut ceux
qu'un rappel parti a couverts il y a moins de 3 jours (cadence). La fiche
ne voyait pas l'historique des rappels.

## Décisions prises

- Question `20261125-1420-d` (liste commune), tranchée par le responsable :
  Q1 A et Q2 A. Relayée par l'orchestration, puis cadrage confirmé par
  écrit en session (« Oui, codez »).
  - Q1 A : `GET /api/praticien/patients` sert, par envoi attendu,
    `rappelPossibleLe` (ISO, ou `null`).
  - Q2 A : ligne échue sous cadence sans bouton « Relancer », badge T-81
    conservé, aucun texte neuf.
- Une seule règle : `rappelPossibleLe(envoisPrecedents)` est extraite de
  `deciderRelanceAssignation` (refactor pur) ; la lecture de la fiche
  l'appelle sur les mêmes rappels que la route (type
  `relance_questionnaire`, `FILTRE_ENVOIS_PARTIS`, même dossier,
  `envoisDeLAssignation`). Une requête groupée par page, sur les seules
  assignations `En attente`.
- Champ absent (serveur antérieur) : rien n'est masqué. L'instant se
  compare à l'heure de la lecture : fiche ouverte, une cadence qui expire
  ne rend le bouton qu'à la lecture suivante (en retard, jamais à tort).
- D-562 : amendement daté du 2026-11-25 sous le §2. Fragment
  `changelog.d/2026-11-25-relance-envois-historique.md`.
- Écartés : le Fil (carte « retard ») n'est pas visé, il dit le refus du
  serveur sous cadence comme avant ; D-488 inchangé (aucun texte neuf).

## Fichiers modifiés

- `web/src/lib/praticien/relanceAssignation.ts` (+ banc)
- `web/src/app/api/praticien/patients/route.ts` (+ banc)
- `web/src/components/FichePatientPanel.tsx` (+ banc)
- `docs/decisions/D-562.md`, `changelog.d/2026-11-25-relance-envois-historique.md`

## Validations exécutées

- T1 (`check:rapide`) vert après chaque édition ; `npm run check` vert
  avant commit.
- T2 `--fast` : vert à la troisième passe (479 E2E, Vitest 18 672).
  - Passe 1 rouge : `docs/claude/MATRICE_CONSOMMATION.md` dérivé (la lecture
    des patients importe désormais le module de cadence : 55 → 56 surfaces
    indirectes du corpus V1) ; régénéré après `git add -A`.
  - Passe 2 rouge : un seul E2E, `portail-rail-lateral.spec.ts` (réduit,
    confort 100 %, Chromium) — le lien « Transmettre un compte rendu
    d'analyses », à condition `sonde`, est apparu entre deux relevés des
    liens. Course du banc, hors périmètre ; passe 3 verte.
- Contre-revue Codex P0 (`wn-codex-avis.mjs --mode revue`, code 0) : aucun
  P0/P1. Un P2 écarté avec motif : la fiche compare `rappelPossibleLe` à
  l'horloge du navigateur ; même décalage que l'échéance
  (`isDeadlineExpired`), et l'effet borné au refus serveur existant (« Un
  rappel est déjà parti il y a moins de 3 jours. »), sans envoi.
- Pas de constat à l'écran local : le banc jsdom de la fiche vérifie le cas
  sous cadence (badge, bouton, liste du dialogue).

## Problèmes ouverts

- La course de `portail-rail-lateral.spec.ts` (sonde du lien « compte
  rendu ») peut rougir un T2 sans rapport : à instruire par le lot du rail
  si elle revient.

## Prochaine action exacte

- L'intégrateur merge sur « prête @<sha> » ; aucune migration, aucun
  drapeau, pas de suivi post-merge dû.

## Interdits encore actifs

- `WN_RELANCE_QUESTIONNAIRE` inchangé ; aucun e-mail réel ; contrôles à
  l'écran sur fixtures seulement.
