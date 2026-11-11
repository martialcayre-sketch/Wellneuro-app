# Handoff — 2026-11-11 — Refonte Lien / Empreinte, PAT-3 : Mon parcours, accompagnement, point de suivi

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat3`, créée depuis `claude/refonte-lien-pat1` (`2a780c37`, PR #1998 ouverte, non mergée) dans le worktree `wt-refonte-pat3`. À rebaser sur `origin/main` après le merge de #1998 ; une seule « prête » à la fois : PAT-3 ne se déclare pas tant que PAT-1 n'est pas mergée.
- Un commit de lot. La session ne merge pas.
- Checkout principal non touché. Aucun fichier du socle COM-0 modifié (`icone.ts` seulement importé) ; aucun fichier praticien touché ; aucun importeur praticien des fichiers modifiés (vérifié par recherche).

## Objectif

Lot PAT-3 du plan patient (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md`, fiche « PAT-3 — Mon parcours, accompagnement, suivi » ; U10, U18–U21, U41). Préalables : T-30 et Q-E2-5 inscrits dans [[D-488]] ; prototype de la famille validé par le responsable le 2026-11-11 ([[D-481]] §4), artefact « Prototype PAT-3 » lié sur la page de suivi patient.

## Décisions prises

- **Q1 et Q2 tranchées par le prototype validé** (journal de la page de suivi, 2026-11-11) : le compteur « (N) » des intertitres repliables du hub part ([[D-333]]) ; l'invitation à une réévaluation garde son texte servi, inchangé.
- **T-30 mot pour mot** : a (`entreesAutresEspaces.ts`), b et c (`ProtocolCheckinForm.tsx`, « semaine » en minuscule), d (`ProtocolCheckinTrend.tsx`), e et f (`PatientCompanionHome.tsx` ; le lien dit « Mon point de suivi » dû ou non, sa mise en avant reste), g (`filDuJour.ts`), h (`cycleDeVie.ts`, la seule constante), i (`api/portail/protocole/checkin/route.ts`, textes d'erreur seulement).
- **[[D-488]] §7** : la lecture du suivi distingue le refus 404 (`nonReconnu`) ; il se lit en forme « constat », sans « Réessayer ». Les autres erreurs gardent « Réessayer » ; le 401 renvoie toujours à l'entrée (#1978). Un 404 à l'envoi n'est pas visé (§7 parle de la lecture).
- **Erreurs encadrées opt-in** : `PatientErrorState` reçoit `forme` (`simple` par défaut, `erreur`, `constat`). Seuls le point de suivi et « Mon accompagnement » l'emploient ; les écrans de PAT-4 à PAT-6 gardent la forme simple jusqu'à leur lot — pas d'habillage hors périmètre.
- **Réponses** : `min-h-11`, `border-control-border`, 15 px medium ; choisi : aplat `primary`, inchangé.
- **Jour difficile** : `bg-lien-sand`, `rounded-lg`, sans bord (zone de repos) ; contrastes mesurés 9,5:1 et 4,8:1.
- **Volet « Mon accompagnement »** : même `<details>` et même condition d'ouverture (#1979) ; en-tête `min-h-12`, texte courant, chevron `ChevronDown` au trait `TRAIT_ICONE`, rotation `duration-reveal ease-lien`, neutralisée en mouvement réduit.
- **Frise** : `STATE_CLASSES.current` en anneau `border-[3px] border-primary bg-surface` (reprise de COM-0 renvoyée à PAT-3) ; `upcoming` bordé `control-border`. Partagé avec la frise navigable, dont l'anatomie suit.
- **Imprimable** : rien à changer — rail, en-tête, pied et barre basse sont déjà `print:hidden`.

## Fichiers modifiés

- `web/src/components/patient/PatientErrorState.tsx` : forme encadrée opt-in.
- `web/src/components/patient/PatientJourneyProgress.tsx` : anneau pétrole, à venir bordé.
- `web/src/components/patient-companion/ProtocolCheckinForm.tsx` : T-30b/c, §7, réponses, erreurs encadrées.
- `web/src/components/patient-companion/ProtocolCheckinTrend.tsx` : T-30d.
- `web/src/components/patient-companion/PatientCompanionHome.tsx` : T-30e/f, erreur encadrée, Jour difficile sable.
- `web/src/app/portail/[token]/questionnaires/page.tsx` : volet, compteur retiré.
- `web/src/components/patient/autres-espaces/entreesAutresEspaces.ts` (T-30a), `web/src/lib/portail/filDuJour.ts` (T-30g), `web/src/lib/patient/cycleDeVie.ts` (T-30h), `web/src/app/api/portail/protocole/checkin/route.ts` (T-30i).
- Tests : `ProtocolCheckinForm.test.tsx` (404 sans « Réessayer », titres, bord, saisie gardée), `PatientJourneyProgress.test.tsx`, `PatientCompanionHome.test.tsx`, `questionnaires/page.test.tsx` (aucun compteur), et les textes T-30a/e/g/h dans `autresEspaces.test.tsx`, `entreesAutresEspaces.test.ts`, `MenuMonEspace.test.tsx`, `RailMonEspace.test.tsx`, `filDuJour.test.ts`, `checkin/route.test.ts`.
- E2E : `portail-autres-espaces.spec.ts`, `portail-menu.spec.ts`, `portail-rail-lateral.spec.ts` (T-30a).
- `changelog.d/2026-11-11-refonte-lien-pat3-parcours-suivi.md`, ce handoff.

## Validations exécutées

- **T1** (`npm run check:rapide`, puis `npm run check` avant commit) : vert. Vitest ciblé (compagnon, frise, hub, autres espaces, menu, rail, fil, route du suivi, cycle de vie) : 45 fichiers, 887 tests verts.
- **T2** (`npm run test:worktree -- --fast --keep-db`) : Vitest complet vert ; Playwright 364 passés, 34 ignorés, 0 échec sur les specs du dépôt (Desktop Chromium et iPhone 13 / WebKit). Les quatre seuls échecs de la passe venaient de la spec de constat temporaire (deux sélecteurs : `getByRole('group')` et l'annonceur de route de Next, `role="alert"`) ; corrigée, rejouée seule contre la base conservée : 6 passés.
- **Constat à l'écran local** (build de production de T2, base éphémère, Sophie Nicola ; lectures client du protocole et du suivi simulées par `page.route`, la base n'ayant aucun protocole diffusé ; rien écrit ; captures relues une à une, non versionnées) à 1 280 px et 390 px : hub (frise à anneau pétrole, volet « Mon accompagnement » et chevron), accompagnement déplié et Jour difficile sur sable, point de suivi « — semaine 2 » aux réponses bordées, envoi coupé (réponses gardées, erreur encadrée, aucune confirmation), « Suivi non reconnu. » sans « Réessayer », autre échec avec « Réessayer ».
- **Relecture `ui-ux-pro-max`** (`ux-guidelines.csv`, lecture seule) : l.10 mouvement réduit (chevron neutralisé) ; l.23 cibles (réponses `min-h-11`) ; l.37 pas de couleur seule (message écrit, `role="alert"`) ; l.44 erreurs annoncées ; l.80 issue après erreur (« Réessayer » et aide, sauf 404 où reste « ← Mon parcours »). Aucune règle n'a demandé de changement ; aucune ne prime sur une décision ([[D-456]]).

## Problèmes ouverts

- **Forme encadrée des erreurs** : opt-in ; l'étendre aux autres écrans patient relève de leurs lots (PAT-4 à PAT-6), ou de PAT-7.
- **Historique du suivi** (`ProtocolCheckinTrend`) : gardé tel quel (cartes `rounded-xl`), hors des choix validés.
- **Reprises de COM-0 restantes** : barre de progression de `GenericQuestionnaire` (PAT-4) ; icônes `text-accent` et champs `control-border` des lots d'écrans.

## Prochaine action exacte

Après le merge de #1998 par l'intégrateur : rebase sur `origin/main`, T1, push, PR, CI (`node scripts/wn-attendre-ci.mjs <N>`, `head=` du SNAPSHOT vérifié), revue (`@coderabbitai full review`, sinon Copilot, sinon PR-Agent), verdict sur chaque remarque, puis « prête @<sha> » et page de suivi (`PAT-3` → `prete`).

## Interdits encore actifs

- Fichiers COM-0 gelés ; tout besoin commun passe par un COM-n, un seul ouvert à la fois.
- Aucun texte hors de [[D-488]] ; aucun chiffre, compteur ni pastille côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré ; aucune modification clinique, de questionnaire, de scoring, de route, de garde, de sonde ni de schéma ; aucune migration.
- `lib/portail/stockageAppareil.ts` jamais pour un état de rail (Q56).
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier réel au dépôt.
