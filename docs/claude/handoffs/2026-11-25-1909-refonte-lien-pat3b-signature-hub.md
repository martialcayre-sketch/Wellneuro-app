# Handoff — 2026-11-25 — Refonte Lien / Empreinte, PAT-3b : signature graphique du hub « Mon parcours »

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat3b-signature-hub-aaa4bc`, worktree
  `.claude/worktrees/refonte-lien-pat3b-signature-hub-aaa4bc`, créé sur `origin/main`
  `97e0d72d` ; avancé par `--ff-only` seulement (aucun commit propre avant celui du lot),
  jusqu'au merge de COM-2. `npm ci` et `npx prisma generate` joués avant tout test.
- Une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.
- Lots préalables du même jour, tous deux mergés avant cette PR : DOC-21 (#2363,
  complément de [[D-481]] §1 bis) et COM-2 (#2364, emplacement `hub-patient` de
  `LienDecor`).

## Objectif

Lot PAT-3b de la refonte Lien, ouvert par le responsable le 2026-11-25 (« Lancer les
deux ») : en tête du hub « Mon parcours » (U10), un en-tête compact avec un ornement
léger, par `LienDecor`, jamais une grande illustration qui repousse l'action principale
([[D-481]] §1 bis). Inclut le constat de l'en-tête de U10 laissé ouvert par PAT-7.
Cahier : `plan-patient.md`, « PAT-3b ».

## Décisions prises

- **Prototype PAT-3 révisé avant tout code** ([[D-481]] §4) :
  https://claude.ai/artifact/GgXXFgPGumAtdxZUB2cky7, rangée « PAT-3b », version 17.
  Trois variantes au téléphone : A, boucles d'alliance atténuées à droite du titre ;
  B, arcs d'alliance ; C, bandeau `quiet-sweep` en tête de carte. La retenue est aussi
  montrée au bureau.
- **Réponses écrites du responsable, 2026-11-25** :
  - « C, 76/88 px, DOC+COM » ;
  - puis, sur la hauteur : « 52/64 comme dessiné ».

  Les « 76/88 px » visaient la largeur de A et B, sans objet pour un bandeau.
- **Ordre en trois PR**, choisi par le responsable :
  - DOC-21 inscrit l'élément dans D-481 ;
  - COM-2 ouvre l'emplacement dans la primitive, fichier commun (`components/ui/`) ;
  - PAT-3b le pose.
- **Pose** : `<LienDecor emplacement="hub-patient" className="-mx-8 -mt-8 mb-2 rounded-t-lg" />`,
  premier enfant de la carte « Mon parcours » (`PatientCard` en `p-8`), avant le `h1` :
  - bord à bord, coins arrondis comme la carte ;
  - hauteur fixe portée par la primitive ;
  - aucun texte, aucun chiffre.
- **Constat PR-Agent sur COM-2** (« Bandeau non bord à bord »), confirmé à l'écran par le
  premier passage du constat local (292 px au téléphone) : COM-2 a retiré `w-full`.
  La pose de PAT-3b n'a pas changé.
- **Relecture `ui-ux-pro-max`**, en lecture seule : aucun écart.
  - `icon-context` : décor `aria-hidden` ;
  - débordement masqué : le recadrage ne coupe que le décor ;
  - décalage de mise en page : hauteur fixe ;
  - `content-priority` et `primary-action` : première action visible, un seul bouton plein ;
  - aucun pointeur.

## Fichiers modifiés

- `web/src/components/patient/MonParcoursAccueil.tsx` : pose du bandeau.
- `web/src/components/patient/MonParcoursAccueil.test.tsx` : pose en tête de carte, hors
  de l'accessibilité, contenu lisible inchangé.
- `web/e2e/portail-hub-signature.spec.ts` (neuf) : réception du lot, Chromium et WebKit.
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-partiel.md` : §6, constat de
  l'en-tête de U10 ; renvois levés dans `pat7-forme-transverse.md` et
  `pat7-constat-ecrans-non-vus.md`.
- `changelog.d/2026-11-25-refonte-lien-pat3b-signature-hub.md`, ce handoff.

## Validations exécutées

- Vitest `MonParcoursAccueil` et `LienDecor` : verts.
- T1 (`check:rapide`) : 0.
- Constat local, deux passages (spec local non versé, `next dev`, base locale, Sophie
  Nicola) ; détail au §6 du constat partiel.
  - Au téléphone, la première action se lit sans défiler, au-dessus de la barre basse.
  - Le bandeau va bord à bord : 356 px pour une carte de 358 px, 670 px pour 672 px.
  - Il est absent de l'arbre ARIA et masqué à l'impression.
- T1 complet et T2 `--fast` : résultats dans la déclaration « prête ».

## Problèmes ouverts

- Non vus : téléphone réel, lecteur d'écran réel, reprise longue (« Pour reprendre »),
  Jennifer Martin et Michel Dogné.
- Second passage du constat, Chromium 390 × 844 : ni le bouton « Menu » ni la barre
  basse n'étaient rendus à la capture (500 ms après le titre). Au premier passage, les
  deux l'étaient. Cause non instruite, sans lien avec le bandeau.

## Prochaine action exacte

Après le merge, PAT-7 n'attend plus PAT-3b pour l'en-tête de U10 (`plan-patient.md`,
table des lots). La session d'orchestration met à jour la page de suivi patient.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Aucun texte d'interface sans acceptation mot pour mot ; aucun chiffre côté patient
  ([[D-333]]).
- Aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Contrôles à l'écran en local, sur fixtures seulement. Aucune identité ni aucun
  identifiant de dossier au dépôt.
