# Handoff — 2026-11-13 — Refonte Lien / Empreinte, PAT-4 (première PR) : questionnaires, agenda du sommeil, observation alimentaire, D-506

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat4-questionnaires`, dans le worktree `.claude/worktrees/pat4-questionnaires-agendas` du clone principal. PR #2056.
  - La branche a été recréée une fois sur la nouvelle tête de `main` (`git switch -C`), avant tout commit. #2053 et #2054 ne touchaient que des documents hors du lot.
  - Après le premier commit, `origin/main` a été mergé deux fois dans la branche, sur demande du responsable (2026-11-13, « Merger origin/main ») : la garde de fraîcheur bloquait l'édition. Dernière tête de `main` intégrée : `abdfded1`.
- La session ne merge pas : elle déclare la PR « prête @<sha> », et l'intégrateur merge.
- Le checkout principal n'a pas été touché. Aucun fichier COM-0 n'a été modifié, ni aucun fichier du plan praticien.

## Objectif

Lot PAT-4 du plan patient (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md`, fiche « PAT-4 — Questionnaires et agendas », U11–U14, U16, U17, U22). Le feu vert du code a été donné par le responsable le 2026-11-13 (« Oui, les deux »). Ce lot applique les arbitrages du prototype PAT-4, itération 2 ([[D-481]] complément DOC-7), les textes acceptés de [[D-488]] DOC-7, et [[D-506]]. Préparation : `pat4-prealables.md`.

## Décisions prises

- **Découpage.** Les plaintes (U12) et l'agenda alimentaire (U17) sont restés à l'itération 1 du prototype. Le responsable a répondu le 2026-11-13 (liste commune `20261113-1008-d`) : **attendre une itération 2 du prototype**. Cette PR couvre le reste.
- **[[D-506]].** `MessageReponseSuicide` porte le défilement (`faireVenirDansLaFenetre`), mais l'écran qui le rend décide du moment, par la prop `defiler`, lue au montage seulement. C'est la réponse **b** du responsable du 2026-11-13 (liste commune `20261113-1035-d`), inscrite en [[D-506]] §4 :
  - au choix d'une réponse positive, et après retrait puis nouveau choix (`messageAAmener` dans `GenericQuestionnaire` et dans l'anamnèse de l'entrée) ;
  - à chaque arrivée au résumé ;
  - jamais au retour sur une page qui porte déjà la réponse, ni à la reprise d'un brouillon.
  - Rien ne se passe si le message est déjà entièrement visible, `scroll-padding` du document compris.
  - `block: 'nearest'` ; animé, sauf en mouvement réduit (préférence du système ou `data-reading-motion`).
  - Le focus ne bouge jamais.
  - Les `focus()` des titres du résumé et des micro-lots passent en `preventScroll` : l'effet du message (enfant) court avant celui du parent, et l'ancien `focus()` le chassait de la fenêtre.
- **Q2d.** « N réponses sur M » dans les deux modes. La barre est fondée sur les réponses renseignées.
- **Q4a.** `writeQuestionnaireDraft` rend `boolean`. Après un échec, `savedAt` passe à `null`. `writeDraft` (plaintes) reste à la seconde PR.
- **Q6a, T-36.** Nouveau composant partagé `components/patient/LienReconnexion.tsx`, qui lit les constantes de `app/portail/[token]/textesEntree.ts`. Il paraît sous le seul 401 :
  - du submit de questionnaire ;
  - de l'enregistrement d'une nuit (prop `reconnexion` de `SaisieNuitForm`) ;
  - de la clôture du sommeil.

  L'entrée garde son `LienReconnexion` local (PAT-2), par souci de changement minimal.
- **Textes ([[D-488]] DOC-7).**
  - T-40.
  - T-41a et T-41b, T-42a (sommeil seulement), T-43a à T-43e, T-48h.
  - T-48a à T-48g, avec U+00A0.
  - Q8a : `toLocaleDateString('fr-FR', { day, month: 'long', year })` en heure locale, à deux endroits :
    - date d'envoi des réponses transmises ;
    - observation alimentaire : période, traces, pauses, plans, dernière transmission. `jourEnLettres` lit un `AAAA-MM-JJ` sans décalage de fuseau.
  - `dateLocale` reste la clé des données enregistrées.
- **Hors lot.** Lot Q5b ([[D-507]]) ; décor (Q10a).

## Fichiers modifiés

- `web/src/components/patient/` :
  - `MessageReponseSuicide.tsx` et son test ;
  - `GenericQuestionnaire.tsx` et son test ;
  - `ConsultationScreen.tsx` et son test ;
  - `LienReconnexion.tsx` (nouveau) ;
  - `agenda-sommeil/AgendaSommeilJournal.tsx`, `SaisieNuitForm.tsx` et leurs tests.
- `web/src/lib/questionnaire-draft.ts`, `web/src/lib/agenda-sommeil/libelles.ts`.
- `web/src/components/food-observation/PatientFoodObservationPanel.tsx` et son test.
- `web/e2e/portail-message-securite.spec.ts` (nouveau), `web/e2e/helpers/db.ts` (`creerAssignationQuestionnaire`), `web/e2e/agenda-sommeil-saisie.spec.ts` (libellés T-41a, T-42a).
- `web/src/app/portail/[token]/page.tsx` (anamnèse de l'entrée : `messageAAmener`).
- `docs/decisions/D-506.md` (§4, précision du 2026-11-13).
- `changelog.d/2026-11-13-refonte-lien-pat4-questionnaires-agendas.md`, ce handoff.

## Validations exécutées

- **T1** (`check:rapide`) : vert. Un premier passage était rouge sur trois délais dépassés : machine chargée (load ~18), suites vertes isolément (195/195). Le second passage était vert.
- **T2** (`npm run test:worktree -- --fast`), code 1 :
  - Vitest : 996 fichiers, 17 202 tests passés ;
  - Playwright : 379 passés, 34 ignorés, **1 échec hors lot**. `portail-rail-lateral.spec.ts:196` (Desktop Chromium, Sophie Nicola) trouve un lien de plus dans le rail, « Transmettre un compte rendu d'analyses ». C'est l'état biologique du patient fictif ; le lot ne touche ni le rail ni ce patient.
  - Les corrections de la revue ont été faites pendant T2, avant son build. Les E2E ont donc joué le code corrigé, cas de l'entrée compris. Les Vitest touchés ont été rejoués à part : 89/89.
  - L'attente stable des mesures a été ajoutée après T2 ; elle est jouée par la CI.
- **Revue indépendante** wn-reviewer (relecture clinique de D-506, textes octet par octet) : NO-GO en l'état, GO sous conditions.
  - P1-1, une date ISO restante (`plan.from`) : corrigée.
  - P1-2, mesures et entrée : ajoutées, voir ci-dessous.
  - P1-3, sens d'« apparition » : question `20261113-1035-d`, tranchée b, implémentée.
  - P2 traités : `scroll-padding` pris en compte ; JSDoc fusionnée ; tests ajoutés (intégration D-506 dans le questionnaire, T-40, date en lettres, dernière transmission).
  - P2 laissés, avec motif :
    - `LienReconnexion` local de l'entrée : changement minimal ;
    - `trace.localDate` est une clé UTC, donc un jour décalé est possible autour de minuit. On ne peut pas le corriger sans changer la clé, ce qui est interdit.
- **Deuxième revue wn-reviewer** (fallback de PR-Agent, élagué, sur `361cadbb`) : NO-GO. P1-A (1035-d) : tranchée b, implémentée. P1-B : les mesures de l'entrée du handoff étaient relevées en cours d'animation, et l'assertion « haut dans la fenêtre » était trop faible. L'E2E attend désormais un relevé stable et le juge par `bienPlace` : message entier dans la part utile de la fenêtre (fenêtre moins `scroll-padding`), ou son haut au haut de cette part s'il la dépasse. Quatrième réglage ajouté : confort 112,5 % en mouvement réduit.
- **Après (b)** : Vitest ciblés 154/154 ; **T1 complet** vert ; **T2** code 1 : Vitest 17 265 passés, Playwright 381 passés, 34 ignorés, **1 échec hors lot** : `mode-consultation-sans-chiffre.spec.ts:181` (iPhone 13, le tiroir praticien « Détail des réponses » ne paraît pas). Le lot ne touche aucun fichier praticien, et le même test passe sur Desktop Chromium.
- **Mesures Q11b** (T2 local après (b), build de production, Michel Dogné ; px CSS ; relevés stables, tous jugés bien placés par `bienPlace`) :
  - **Téléphone 390 px au zoom 200 %** (fenêtre émulée 195 × 422, police racine 16 px, marge basse 80) :
    - message des questionnaires : 975 px. Haut en 0, 422 px visibles, sous la question comme au résumé, animé ou non, en Chromium et en WebKit ;
    - entrée : 570 px. Haut en 0, 422 px visibles, en Chromium et en WebKit.
  - **Confort 112,5 %** (390 × 844, police racine 18 px) : 363 px, le message tient entier, animé ou non. Haut à 392 px en Chromium (marge basse 90), à 402 px en WebKit (marge basse 80).
  - Le focus est inchangé dans tous les cas.
  - **Dépassement confirmé** au zoom 200 %. Le responsable a répondu c le 2026-11-13 (liste commune `20261113-1050-d`) : revoir le texte ou l'ordre, par une décision clinique hors de PAT-4. D-506 s'applique tel quel en attendant. Téléphone réel : non mesuré.

## Problèmes ouverts

- Plaintes (U12) et agenda alimentaire (U17) : attendent une itération 2 du prototype (`20261113-1008-d`).
- `20261113-1050-d` (clinique) : lot de décision à ouvrir hors de PAT-4 (D-xxx, texte ou ordre du message de [[D-277]] §1).
- Mesure sur téléphone réel (D-506 §2) : geste du responsable ou d'un testeur.
- `mode-consultation-sans-chiffre.spec.ts:181` (iPhone 13) : rouge local hors du lot, à instruire si la CI le reproduit. `portail-rail-lateral.spec.ts:196`, rouge au T2 précédent, ne s'est reproduit ni en CI ni au second T2.

## Prochaine action exacte

Sur la nouvelle tête de #2056 :
- `node scripts/wn-attendre-ci.mjs 2056` en tâche de fond, → 0 ;
- `node scripts/wn-revue-pr-agent.mjs 2056` → 0, sinon la revue wn-reviewer sur la tête ; un verdict par remarque.

Si GO : déclarer « prête @<sha> », écrire la ligne `prete` au registre D-503, et mettre à jour la page de suivi patient (fiche PAT-4, journal). Ensuite, sur l'itération 2 du prototype : une seconde PR (plaintes, agenda alimentaire).

## Interdits encore actifs

- Aucun texte hors de [[D-488]] ; aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique au-delà de [[D-506]].
- Aucun drapeau, aucune migration, aucun décor ; fichiers COM-0 gelés ; lot Q5b hors de PAT-4.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seulement ; production en lecture seule ; constat à l'écran en local seulement.
- La session ne merge pas.
