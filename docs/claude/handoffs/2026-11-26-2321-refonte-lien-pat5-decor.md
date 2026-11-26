# Handoff — 2026-11-26 — Refonte Lien / Empreinte, PAT-5 décor : séparateur des deux voix et ornements des vides réels

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat5-decor-8633ab`, worktree `.claude/worktrees/refonte-lien-com1-liendecor-b82e12`, créé sur `origin/main` `32380ddf`, toujours à jour au moment du code (aucun commit propre avant celui du lot). `npm ci` et `npx prisma generate` joués avant tout test ; base locale du worktree par `scripts/wn-dev-db.sh --migrate --seed` (fixtures seules).
- Une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur (D-373, D-454, D-546).

## Objectif

Micro-lot PAT-5 décor de la refonte Lien, côté patient, ouvert par le responsable le 2026-11-26 (« lance les suites »). PAT-5 avait livré sans décor : le séparateur de U25 et les ornements des vides réels attendaient COM-1 (Q2a et Q3a de DOC-9, [[D-481]]). Cahier : `plan-patient.md`, « PAT-5 ».

## Décisions prises

- **Ni DOC-n ni COM-n** : [[D-481]] §1 bis nomme les emplacements « Dossier à deux voix » et « États vides (X03) » avec leurs éléments, et DOC-9 (Q3a) fixe la place du séparateur. `LienDecor` accepte déjà `deux-voix` et `etat-vide`. Au cadrage, aucun DOC-n ni COM-n n'était ouvert : seule #2384 (PAT-2 décor) l'était, sans fichier commun. Le registre des messages ne portait rien pour ce lot.
- **Recouvrement avec PAT-2 décor** (#2384, branche `claude/refonte-lien-pat2-decor-c5dc26`) : aucun fichier commun. PAT-2 touche les écrans d'entrée, `e2e/helpers/db.ts` et `FondEntreePatient` ; ce lot n'y touche pas.
- **Prototype avant tout code** ([[D-481]] §4) : https://claude.ai/artifact/9JQiCCrj9mTwLnxjMBVo3X (artefact Design System privé, version 2).
  - Captures des écrans réels en local, sur les fixtures Sophie Nicola et Jennifer Martin, au téléphone (390 px) et au bureau (1280 px).
  - Une sonde jamais versée injectait chaque variante.
  - Constat de la sonde : à 96 px, les traits de 2 px du germe tombent à 0,4 px et il ne se voit plus. D'où la taille de 160 px.
- **Réponse écrite du responsable, 2026-11-26** : « Q1a — Q2a — Q3a » (question `20261126-2308-d` de la liste commune, répondue). Ce que recouvre chaque choix :
  - Q1a : séparateur étroit, 320 px au plus, centré ;
  - Q2a : germe `nutrition-sprout` partout ;
  - Q3a : sept vides ornés.
- **Liste exacte des états vides réels ornés** (Q3a), le germe se posant au-dessus de la phrase, inchangée :
  - U24 : aucune synthèse publiée (`ComprehensionView`) ;
  - U25 : aucun objectif (`DossierDeuxVoixView`, carte du haut) ;
  - U26 : aucun bilan transmis (`MonBilan`) ;
  - U28 : aucune fiche remise (`FichesRemises`) ;
  - U30 : aucun document pour le médecin (`PourVotreMedecinLecture`) ;
  - U31 : aucun courrier (`CourrierMedecinLecture`) ;
  - U32 : aucun courrier préalable (`CourrierComplementLecture`).
- **Non ornés** :
  - les deux vides du bas de U25 : le séparateur décore déjà leur zone, et D-481 §1 bis veut un décor par zone ;
  - U27 : `Bibliotheque.tsx` est hors lot (DOC-10) ;
  - U15 : son vide porte déjà `GrowthIllustration`, antérieure à `LienDecor`, non touchée ;
  - les erreurs, les chargements, les refus et les blocs fermés.
- **Pose** :
  - séparateur : `<LienDecor emplacement="deux-voix" className="mx-auto w-full max-w-[320px]" />` entre les deux cartes du bas, sous la condition `ceQuiCompte !== null && comprehension !== null` ;
  - germe : `<LienDecor emplacement="etat-vide" element="nutrition-sprout" className="w-40" />`, avec 12 px avant la phrase.
  - Aucune classe d'affichage n'est passée à la primitive : le défaut d'impression relevé par PRA-3a décor ne s'applique pas ici.
- **Relecture `ui-ux-pro-max`**, en lecture seule : aucun écart.
  - `icon-context-accessibility` : décor `aria-hidden` à côté d'un texte visible.
  - Décalage de mise en page : la place est réservée par `aspect-ratio`.
  - Vides : la phrase reste lisible au-dessus de la barre basse au téléphone.

## Fichiers modifiés

- `web/src/components/patient-companion/DossierDeuxVoixView.tsx` : séparateur ; germe du vide de l'objectif.
- `web/src/components/patient-companion/ComprehensionView.tsx`, `web/src/components/patient/MonBilan.tsx`, `patient/fiches-assiette/FichesRemises.tsx`, `patient/document-medecin/PourVotreMedecinLecture.tsx`, `patient/lettre-adressage/CourrierMedecinLecture.tsx`, `patient/courrier-complement/CourrierComplementLecture.tsx` : germe de l'état vide.
- Bancs Vitest des six écrans qui en avaient un (pose sur le vide, absence sur erreur ; séparateur présent, absent si une section n'est pas servie). `PourVotreMedecinLecture.test.tsx` est neuf.
- `web/e2e/portail-lectures-decor.spec.ts` (neuf) : réception, Chromium et WebKit.
- `changelog.d/2026-11-26-refonte-lien-pat5-decor.md`, ce handoff.

## Validations exécutées

- Vitest des sept écrans et de `LienDecor` : 196 tests passés, 0 échec.
- T1 (`check:rapide`) : 0.
- E2E `portail-lectures-decor.spec.ts` en local (`next dev`, base du worktree, Jennifer Martin) : 6 passés (Chromium bureau, WebKit iPhone 13).
- Constat local du code réel, Chromium 390 px, drapeaux des lectures allumés en local seulement :
  - U25 porte deux décors ;
  - U24, U26, U28, U30, U31 et U32 en portent un chacun ;
  - à l'impression de U25, aucun décor n'est visible.
- T1 complet (`npm run check`) : 0.
- T2 (`test:worktree --fast`, build de production) : 0.
  - Vitest : 1 097 fichiers et 18 729 tests passés.
  - Playwright : 493 passés et 39 sautés, Chromium et WebKit, 0 échec ; le spec de réception est compris.

## Problèmes ouverts

- Non vus : téléphone réel, lecteur d'écran réel, U28 et U30 à U32 en E2E. Leurs drapeaux ne sont pas allumés par le serveur de test ; leur pose est épinglée en Vitest.
- U15 : `GrowthIllustration` décore le vide de « Mon équilibre » hors de `LienDecor`, antérieure à D-481 §1 quater. Hors de ce lot, signalée à la session d'orchestration.

## Prochaine action exacte

CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond), PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer`, D-448), un verdict par commentaire en ligne. Puis « prête @<sha> » sur la PR, ligne au registre des messages, `pr` dans la question `20261126-2308-d`, et numéro + sha à la session d'orchestration.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Aucun texte d'interface hors de D-488 ; aucun chiffre côté patient (D-333) ; aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- `Bibliotheque.tsx` hors lot (DOC-10).
- Contrôles à l'écran en local, sur fixtures seulement. Aucune identité ni aucun identifiant de dossier réel au dépôt.
- Jamais de merge par la session ; D-518 : une branche avec un commit propre en retard sur `main` demande l'arbitrage du responsable avant toute fusion.
