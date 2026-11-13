# Handoff — 2026-11-13 — Refonte Lien PRA-3b, PR 5 : Suivi, Réévaluation et Alimentation (P20–P24)

## Branche et état du dépôt

- Branche `worktree-refonte-lien-pra3b-pr5-suivi`, créée depuis `origin/main@f2677460` (PR 2 de PRA-3b #2055 mergée).
- Worktree `.claude/worktrees/refonte-lien-pra3b-pr5-suivi`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Deuxième PR du code de PRA-3b, groupe Suivi et réévaluation (P20–P24), dans l'ordre Q1a (PR 2, 5 et 6 d'abord : échecs de lecture lus comme des vides). Questions du groupe : Q3, Q4, Q9, Q17, répondues « Toutes en a » par le responsable (2026-11-13) ; textes T-61 à T-63 et corrections de l'onglet Alimentation inscrits dans D-488 par DOC-8 (#2050).

## Décisions prises

- T-61 : posé dans la météo d'adhésion (avec « Réessayer », T-17) et dans le point d'étape J21, à la place du score, du jour du cycle et des points d'étape. Les gestes d'ajustement restent : ils ne dépendent pas de la lecture.
- L'échec des check-ins est retenu par carte (`echecCheckinsPour`), distinct de « pas encore lus » (`checkinsLusPour`) : seul un échec avéré (statut HTTP, `ok: false`, réseau) fait dire T-61.
- T-62 et T-63 : posés dans l'onglet Alimentation, chacun avec son « Réessayer ». Les lectures passent en `useCallback` avec jeton d'obsolescence (comme `loadCheckins`), pour que la relecture ne soit jamais écrasée par une lecture plus ancienne. La liste des transmissions sans `snapshots` est lue comme un échec : la route rend toujours `snapshots` en lecture de liste.
- Un échec du bilan de calibrage, quand la liste est lue, reste silencieux (comportement d'avant, hors T-62).
- Q9a : deux mentions de version retirées, quatre apostrophes rétablies. « Activation protocole JA5-05 » (intitulé de sous-partie) et le lien « ← Retour fiche patient » ne figurent pas dans D-488 : laissés tels quels.
- Q3a : « Préparer la décision » et « Activer la décision JA » bordés ; « Enregistrer la trace » reste la seule action pleine.
- Q2a : panneaux du Suivi et de la Réévaluation en h4, sous-parties J21 en h5 (paragraphes-intitulés devenus titres, même texte) ; onglet Alimentation titré en h3 (même apparence), panneaux en h4.
- P22 (Les 12 besoins) et P24 (Trajectoire) laissés tels quels, conformément à la matrice du prototype.

## Fichiers modifiés

- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` : état `echecCheckinsPour`, props vers les deux panneaux, « Réessayer » de la Réévaluation à 44 px, titre du résumé en h4.
- `web/src/components/patient-cockpit/MeteoAdhesionPanel.tsx` : `echecLecture`, `onRelire`, T-61 et « Réessayer », focus rendu au panneau, h4.
- `web/src/components/patient-cockpit/J21DecisionPanel.tsx` : `echecLecture`, T-61, h4/h5, ajustements à 44 px.
- `web/src/components/food-observation/PractitionerFoodObservationPanel.tsx` : `echecCycle`, `echecTransmissions`, relectures, T-62, T-63, Q9a, Q3a, titres.
- Tests : `MeteoAdhesionPanel.test.tsx`, `J21DecisionPanel.test.tsx`, `PractitionerFoodObservationPanel.test.tsx` (bancs neufs ; le faux serveur par défaut rend `snapshots` en lecture de liste, comme la route).
- `changelog.d/2026-11-13-refonte-lien-pra3b-pr5-suivi-alimentation.md`, ce handoff.

## Validations exécutées

- Vitest ciblé : cinq suites, 133 tests verts.
- `npx tsc --noEmit` vert ; `npm run check:rapide` vert.
- Relecture `ui-ux-pro-max` (lecture seule) : T-61 annoncé deux fois (alerte de la météo et région `status` du point J21) — corrigé, seule la météo garde la région vivante. Écarté avec motif : pas d'état « relecture en cours » sur « Réessayer », même motif que la PR 2 (lecture courte, jeton d'obsolescence contre le double clic).
- T1 complet (`npm run check`) : vert.
- Revue PR-Agent (#2063, tête 24dd8ca1), un constat « Échec lu comme un vide » : **corrigé**. Sur un échec des transmissions, le bilan de calibrage redit T-62 au lieu de « Aucune journée décrite à ce jour. », et le constat de jours sans trace se tait (on ne sait pas s'il existe des transmissions). Le banc « le calibrage ne s’invente plus » reçoit un faux serveur aux lectures réussies : il s'appuyait sur l'échec du `fetch` de jsdom, que le panneau ne lit plus comme un vide. Le repli silencieux du détail de la dernière transmission (liste lue, détail en échec) reste : le dire demanderait un texte neuf.
- T2 (`npm run test:worktree -- --fast`) : trois passes, toutes arrêtées à l'étape Vitest par des dépassements de délai (5 s) et de temps dans des fichiers hors du diff (`ProtocolMiniBuilder.test.tsx`, `masquage.test.ts`, une fois `GenericQuestionnaire.test.tsx`), la machine à une charge de 20 à 22 tenue par d'autres sessions ; la troisième avec deux workers. Ces deux fichiers sont verts seuls (258/258). L'étape E2E n'a pas été atteinte localement : c'est le CI qui la juge.
- Constat à l'écran local : non joué dans cette PR (critère de réception à quatre largeurs, à faire à la réception du groupe, comme pour la PR 2).

## Problèmes ouverts

- Sur un échec de lecture du protocole, « Activer la décision JA » répond encore « Aucun protocole diffusé : diffusez un protocole avant d’activer une décision JA. » sous T-63. Le corriger demande un texte neuf ou un blocage du geste : à arbitrer (liste commune), hors de cette PR.
- PR 6 (Biologie : T-64, T-65, P19, P26, P29) suit ; micro-lot serveur Q18 avant la PR 4 ; puis les PR 1, 3, 7 et 8.

## Prochaine action exacte

Fusion de la PR 5 par l'intégrateur ; ouvrir la PR 6 depuis un worktree neuf sur `origin/main` fraîchement fetché.

## Interdits encore actifs

- Rien de clinique (règles, seuils, scoring, calcul d'adhésion) ; aucun texte hors de D-488.
- Motif d'alliance et séparateur des deux voix hors du lot tant que COM-1 est reporté ; aucun drapeau.
- Identités fictives seulement ; constat à l'écran en local seulement ; production en lecture seule.
