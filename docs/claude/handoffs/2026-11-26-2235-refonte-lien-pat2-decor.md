# Handoff — 2026-11-26 — Refonte Lien / Empreinte, PAT-2 décor : fond léger de l'entrée du parcours

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat2-decor-c5dc26`, worktree
  `.claude/worktrees/refonte-lien-pat2-decor-c5dc26`, créé sur `origin/main`
  `7c1a9c59`. Avancé par `--ff-only` seulement (`0c0935ca`, #2379 ; `6eef465a`, #2381 ;
  `32380ddf`, #2378, qui ne touche que `tools/corpus`, après T2).
  Aucun commit propre avant celui du lot.
- `npm ci` et `npx prisma generate` joués avant tout test.
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur.

## Objectif

Lot « PAT-2 décor », ouvert par le responsable le 2026-11-26 (« Décor PAT-2 et PRA-3a »).
PAT-2 avait été livré sans décor, en attendant COM-1. Le lot pose le fond léger
périphérique sur les neuf écrans d'entrée U01 à U09, par `LienDecor`
([[D-481]] §1 bis). La carte reste opaque. Le fond n'est jamais derrière un champ et il
est absent à l'impression. Pas d'anneaux d'alliance (Q4 (a)). Aucun texte neuf.
Cahier : `plan-patient.md` §PAT-2 ; arbitrages : `pat2-arbitrages.md`.

## Décisions prises

- **Ni DOC-n ni COM-n.** La ligne « Entrée du parcours patient (U01–U09) » de D-481
  §1 bis et l'emplacement `entree-patient` de `LienDecor` (COM-1, #2339) existaient déjà.
  La primitive et D-481 restent inchangées. Le lot ne croise donc pas la session
  PRA-3a décor.
- **Prototype avant le code** ([[D-481]] §4) :
  https://claude.ai/artifact/GVgAtQWKghTrRFW6S88gFE (artefact Design System).
  - Itération 1 : captures du vrai code, en local, fixtures seules, iPhone 13 (WebKit)
    et bureau (Chromium), sur U01 à U09, mineur compris.
  - Itération 2 : Q1 (b) et le cadrage.
- **Q1, posée par la session** : au téléphone, sur les écrans longs à frise d'étapes
  (U06 à U09), le fond se cale en `cover` et s'agrandit avec la hauteur. Le trait du
  coin haut droit passait alors derrière le repère « Situation » de la frise, qui est
  posée sans carte.
  - Réponse écrite du responsable, 2026-11-26 : « Validé, (b) ».
  - Ligne de la liste commune : `20261126-2221-pat2`, passée à `repondue`.
  - Conséquence : la frise est rendue au-dessus de la zone du fond, sur le canevas uni.
- **Pose** : un cadre neuf, `FondEntreePatient` (`components/patient/ui/`). Il reprend
  les marges du `main` par des marges négatives, pour aller bord à bord entre l'en-tête
  et le pied. Sa zone `relative isolate` porte `LienDecor` et le contenu. La prop
  `entete` reçoit la frise et la rend au-dessus de cette zone. Les espacements restent
  les mêmes : 32 px au-dessus de la frise, 16 px entre la frise et la carte.
  - La page d'entrée enveloppe chaque étape dans le même cadre, `loading` compris, de
    sorte que le fond ne paraît ni ne disparaît d'une étape à l'autre.
  - U01 et U02 enveloppent leur colonne.
- **Hors cadrage annoncé** : un helper de fixture, `poserDateNaissanceFixture`, ajouté à
  `e2e/helpers/db.ts` pour rejouer U04 et U05 par l'interface. En `afterAll`, le spec
  remet la date du seed, une valeur fixe : il ne relit pas la date d'avant, qu'un run
  interrompu laisserait fausse. La date de mineur saisie est calculée au jour du run
  (12 ans révolus), jamais figée. Ce sont les deux constats PR-Agent sur #2384, corrigés.
- **Relecture `ui-ux-pro-max`**, en lecture seule :
  - fond `aria-hidden` ;
  - aucun texte sur le décor hors du canevas uni ;
  - recadrage limité au décor ;
  - seul point à prouver, le défilement horizontal (règle *Horizontal Scroll*,
    sévérité haute), dû aux marges négatives : ajouté au constat E2E, vert.

## Fichiers modifiés

- `web/src/components/patient/ui/FondEntreePatient.tsx` (neuf) et son test Vitest
  `FondEntreePatient.test.tsx` (neuf).
- `web/src/app/portail/connexion/page.tsx` (U01) et
  `web/src/app/portail/lien/indisponible/page.tsx` (U02) : la colonne passe dans le cadre,
  réindentée.
- `web/src/app/portail/[token]/page.tsx` (U03 à U09) : chaque étape passe dans le cadre,
  et la frise passe en `entete`.
- `web/e2e/portail-entree-decor.spec.ts` (neuf) et `web/e2e/helpers/db.ts`
  (`poserDateNaissanceFixture`).
- `web/e2e/visual.spec.ts-snapshots/portail-connexion-*-linux.png` : régénérées par le
  workflow `visual-baselines`, puis relues.
- `changelog.d/2026-11-26-refonte-lien-pat2-decor.md`, ce handoff.

## Validations exécutées

- Vitest `FondEntreePatient` et `LienDecor` (garde comprise) : 47/47.
- T1 (`check:rapide`) : 0.
- Réception locale (`next dev`, base locale du worktree, fixtures) :
  - `portail-entree-decor.spec.ts`, 9 tests passés, 3 sautés par construction (le groupe
    « téléphone Chromium » sous le projet WebKit) ;
  - la date de naissance de la fixture est constatée restituée en base locale.
- Constat de captures, 12 états × 2 largeurs :
  - fond présent et `aria-hidden` ;
  - aucun champ sans ancêtre opaque ;
  - aucune navigation sur U05.
- T2 `--fast`, CI et revue PR-Agent : résultats dans la déclaration « prête ».

## Problèmes ouverts

- Non vus : téléphone réel, lecteur d'écran réel, zoom 200 % et confort 112,5 %.
- Non vus non plus : l'étape `avant` en variante « conditions » (`AccueilConditions`),
  et la tranche 15-17 ans du circuit mineur. Seule la variante des moins de 15 ans a été
  rejouée.
- Le fond se cale en `cover` (règle COM-1) : sur un écran très long, le dessin s'agrandit
  et ses angles peuvent sortir de la zone visible. C'est sans risque pour la lecture ; ce
  n'est pas un défaut au sens de D-481.

## Prochaine action exacte

Après le merge, la session d'orchestration met à jour la page de suivi patient : fiche
PAT-2, décor posé. Le prototype reste la référence des captures.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Aucun texte d'interface sans acceptation mot pour mot ; aucun chiffre côté patient
  ([[D-333]]).
- Aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Contrôles à l'écran en local, sur fixtures seulement. Aucune identité ni aucun
  identifiant de dossier réel au dépôt.
