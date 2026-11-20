# Handoff — 2026-11-20 — Refonte Lien / Empreinte, PRA-6e : le nom du dossier en h1 de la fiche, cascade remontée d'un niveau

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6e-h1-fiche`, créée depuis `origin/main@ecd94548` dans le worktree `.claude/worktrees/refonte-lien-pra6e`, avancée par `--ff-only` à `b7170ce6` (#2279, docs du corpus) puis à `0713afa8` (#2280, DOC-18), aucun fichier du diff, avant tout commit.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).
- Lot confié par la session d'orchestration de la file D, sur réponse du responsable (« Session PRA-1 ») à « Qui prend PRA-6e et PRA-6j ? ».

## Objectif

Appliquer la réponse du responsable du 2026-11-19 à la question `20261117-1423-d` (« Le nom du dossier en h1 ») sur le constat PRA-6 §3.5 : la fiche (P04 à P30) était le seul écran praticien sans `h1`.

## Décisions prises

- Le nom du dossier passe de `h2` à `h1` (`FichePatientPanel.tsx`), mêmes classes (`text-xl`) : aucun changement visuel, les captures de référence de la fiche (`visual.spec.ts`, Linux seul) n'ont pas à être régénérées.
- La cascade rendue dans la fiche remonte d'un niveau, mécaniquement (`hN` → `hN-1`), dans les 37 composants montés seulement par la fiche (fermeture des imports de `FichePatientPanel`, chaque composant vérifié sans autre usage que la fiche ou un composant de la fiche). La structure relative ne change pas, aucun saut n'apparaît.
- Composants partagés : la fiche administrative reçoit `niveauTitre="h3"` (le rayon Patients garde son défaut `h3`) ; `LectureEtatPassePanel` reçoit `niveauTitre={2}` de la Trajectoire (le copilote passait déjà `2`), commentaire mis à jour.
- Inchangés : les tiroirs et dialogues (`InstrumentTiroir`/`PanneauSuperpose`, dialogues de confirmation, aperçu patient), qui ont leur racine propre (`Dialog.Title` en `h2`) ; `DetailBesoinsPanel`, dont le `h2` n'est pas rendu dans la fiche (`enteteMasquee`).
- Revue `wn-reviewer` (PR-Agent élagué, D-448), NO-GO sur un P1 corrigé : `OptionsAuCockpitBloc` (exporté par `OptionsAuCockpit.tsx`, monté par `ConstatsParcoursPanel` sous un constat confirmé), écarté à tort comme non importé, laissait un saut h3 → h5 dans l'onglet Biologie ; il passe en h4/h5, avec un banc neuf dans `ConstatsParcoursPanel.test.tsx`. Ses P2-1 (commentaires de niveau périmés dans dix composants et la fiche administrative) sont corrigés dans le même commit.
- D-518 : `main` a avancé (PAT-7d, #2283, portail patient, aucun fichier commun) après le premier push ; arbitrage du responsable du 2026-11-20, « Fusionner main » : commit de fusion, sans force-push.
- Aucun texte neuf, aucun style, ni route, ni garde, ni drapeau, ni schéma, ni règle clinique.

## Fichiers modifiés

- `web/src/components/FichePatientPanel.tsx` (h1, zone focale en h2, fiche administrative en h3).
- 38 composants : `patient-cockpit/` (31), `biologie/` (3), `atelier-bibliotheque-options/OptionsAuCockpit`, `besoins/ConstatsBesoinPanel`, `correspondance/CorrespondanceMedecinPanel`, `food-observation/PractitionerFoodObservationPanel` ; `copilote/LectureEtatPassePanel.tsx` (commentaire).
- Tests : 14 bancs Vitest aux niveaux figés, décalés d'un niveau (assertions et intitulés), et un banc neuf (`ConstatsParcoursPanel.test.tsx`, options en h4 sous l'hypothèse en h3) ; `e2e/lectures-hors-contrat.spec.ts` (`level: 1`).
- `changelog.d/2026-11-20-refonte-lien-pra6e-h1-fiche.md`, ce handoff.

## Validations exécutées

- Vitest ciblé (fiche, `patient-cockpit`, `biologie`, `besoins`, `correspondance`, `food-observation`, `copilote`, `dossier`) : 63 fichiers, 1 519 tests, vert.
- T1 (`check:rapide`) : vert, 16 étapes.
- Relecture `ui-ux-pro-max` (`ux`, « Heading Hierarchy ») : conforme, un `h1` puis des niveaux sans saut.
- T2 (`test:worktree -- --fast`) : vert en 10 min 9 s, à `b7170ce6` plus le diff, seul run E2E de la machine (deux autres T2 attendus jusqu'à leur fin). Vitest entier : 18 377 tests (62 sautés) ; E2E : 433 réussis, 37 sautés (Chromium et WebKit), dont `visual.spec.ts` (fiche) et `lectures-hors-contrat.spec.ts`.
- T1 complet (`npm run check`) : vert.
- Avance ensuite à `0713afa8` (#2280, DOC-18, documentation seule) : aucun fichier du diff.
- Après la revue `wn-reviewer` et la fusion de `origin/main` (`cd39f69a`) : Vitest ciblé 60 fichiers, 1 488 tests, vert, plus le banc neuf ; T1 complet vert ; T2 vert en 10 min 49 s, seul run E2E de la machine — Vitest 18 389 tests (62 sautés), E2E 433 réussis, 37 sautés.

## Problèmes ouverts

- Le `h1` de la fiche garde `text-xl`, quand les autres écrans praticien ont un `h1` en `text-3xl` : changer la taille serait du décor (après COM-1) et ferait régénérer les captures de la fiche.
- Le tiroir de synthèse rend deux `h4` sous son titre de dialogue `h2` (`FichePatientPanel.tsx`, `TiroirSyntheseInline`) : saut antérieur, hors de la fiche au sens de ce lot.
- PRA-6j (« Garder en mode consultation », `20261117-1422-d`) : documentation seule, PR distincte #2285 (confirmation consignée dans D-354).
- Routés par la revue (`wn-reviewer`), hors de ce lot, à proposer au responsable : (a) les panneaux de la phase Actions sont au niveau du titre de phase (h2 sous h2, antérieur, sans saut) ; (b) les branches de chargement, « introuvable » et d'échec de la fiche n'ont pas de `h1` (antérieur ; un titre y serait un texte neuf, D-488) ; (c) « Trajectoire alimentaire » (h2, `text-3xl`) est plus grand que le `h1` (`text-xl`), inversion antérieure, décor après COM-1.
- Banc structurel manquant : aucun test ne vérifie, onglet par onglet, l'absence de saut dans la fiche ; c'est ce qui a laissé passer le P1.

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond), PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer`, D-448), un verdict par remarque ; puis « prête @<sha> » sur la PR.
2. PRA-6j en PR de documentation distincte.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1.
- Ni route, ni garde serveur, ni drapeau, ni schéma, ni migration ; rien de clinique ; production en lecture seule.
- Jamais de merge par la session ; toute écriture ArtifactData avec `if_version`.
