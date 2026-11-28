# Handoff — 2026-11-28 — Refonte Lien / Empreinte, PRA-3b décor : séparateur des deux voix de l'objectif négocié

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra3b-decor-deux-voix-3b37b4`, dans le worktree `.claude/worktrees/refonte-lien-pat7-forme-transverse-a1671e`.
  - Créée sur `origin/main` `4abe2383`, avec COM-4 (#2400) déjà inclus.
  - Avancée par `--ff-only` seulement jusqu'à `90b66450`, sans commit propre avant celui du lot.
  - `npm ci` et `npx prisma generate` ont été joués avant tout test.
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur (D-373, D-454, D-546).

## Objectif

Lot PRA-3b décor de la refonte Lien, ouvert par la session d'orchestration. Il pose le séparateur `divider-two-voices` dans le panneau de l'objectif négocié de la fiche-trajectoire praticien, par `LienDecor` seulement (emplacement `deux-voix`, déjà ouvert). Cahier : `plan-praticien.md`, § PRA-3, « 3b, contenus ».

## Décisions prises

- **Ni DOC-n ni COM-n** : [[D-481]] §1 bis couvre l'emplacement, et `LienDecor` accepte déjà `deux-voix`. Le précédent patient est PAT-5 (U25, Q1a).
- **Prototype avant tout code** ([[D-481]] §4) : https://claude.ai/artifact/SWD6f1yFxBZJLtbi1xRobJ (artefact Design System privé, version 2).
  - Il compare un témoin et trois variantes : A, entre les deux voix, 320 px au plus ; B, entre les deux voix, pleine largeur ; C, au-dessus des deux voix.
  - Mesures prises au bureau, au téléphone et à 195 px, plus un aperçu d'impression.
  - Les captures viennent de la fiche réelle, rendue en local sur la fixture Sophie Nicola, avec une sonde jamais versée.
- **Réponse écrite du responsable, dans la session du lot, le 2026-11-28** : « Q1a — Q2a — Q3a » (question `20261127-2220-d` de la liste commune).
  - Q1a : variante A.
  - Q2a : version courante seulement, et seulement quand la reformulation existe.
  - Q3a : gardé à 195 px.
- **Pose** : dans `LigneObjectif`, une prop `separateurDeuxVoix` que seule la version courante passe. Le séparateur s'écrit `<LienDecor emplacement="deux-voix" className="mx-auto mt-2 w-full max-w-[320px]" />`, entre les deux blocs.
- **Relecture `ui-ux-pro-max`**, en lecture seule : aucun écart.
  - `icon-context-accessibility` : décor `aria-hidden`.
  - Pas de décalage de mise en page : la place est réservée par le rapport d'aspect.
  - Aucun défilement horizontal, rien d'interactif.

## Fichiers modifiés

- `web/src/components/patient-cockpit/ObjectifNegociePanel.tsx` : pose du séparateur.
- `web/src/components/patient-cockpit/ObjectifNegociePanel.test.tsx` : banc PRA-3b.
  - Un seul décor, dans la version courante, entre les deux intitulés, `aria-hidden`, `print:!hidden`, 320 px au plus.
  - L'historique garde ses deux voix sans décor.
  - Aucun décor sans reformulation.
- `web/e2e/fiche-objectif-deux-voix-decor.spec.ts` (neuf) : réception du lot, Chromium et WebKit.
- `changelog.d/2026-11-28-refonte-lien-pra3b-decor.md`, ce handoff.

## Validations exécutées

- Vitest `ObjectifNegociePanel` : 96 réussis.
- T1 (`check:rapide`) : 0 ; T1 complet (`npm run check`) : 0.
- T2 `--fast` à `90b66450` plus le diff : vert en 11 min 2 s. Vitest 1 099 fichiers, 18 751 tests (62 sautés) ; E2E 517 réussis, 49 sautés, aucun rouge (Chromium et WebKit, build de production). `portail-rail-lateral.spec.ts:208` n'a pas rougi.
- E2E en local (`next dev`, base du worktree, fixtures), `fiche-objectif-deux-voix-decor.spec.ts` et `fiche-entete-decor.spec.ts` : 13 réussis, 7 sautés (cas réservés à l'autre projet), Chromium et iPhone 13.
- Constat à l'écran en local, au bureau et au téléphone : rendu conforme à la variante A du prototype.
- Aucune baseline visuelle touchée : `visual.spec.ts` ne capture pas la sous-vue de l'objectif négocié.

## Problèmes ouverts

- **Hors lot, à router par l'orchestration** : à 195 px, le panneau de l'objectif coupe déjà ses propres textes, avant toute pose (carte d'environ 69 px utiles ; « l'impressi… », « enregistré… »). C'est un défaut de mise en page qui existait avant ce lot, sans lien avec le décor. Aucun autre décor relevé en chemin.
- Non vus : lecteur d'écran réel, écran réel de téléphone.
- Point de méthode : au démarrage à froid de `next dev`, une capture peut partir avant que l'image de fond soit peinte. Le spec de réception ne dépend pas de la peinture : il mesure la boîte.

## Prochaine action exacte

1. CI à 0 : `node scripts/wn-attendre-ci.mjs <N>`, en tâche de fond.
2. PR-Agent prouvé sur la tête : `node scripts/wn-revue-pr-agent.mjs <N>` → 0 ; sinon `wn-reviewer` (D-448).
3. Un verdict par commentaire en ligne.
4. « prête @<sha> » sur la PR, puis numéro et sha à la session d'orchestration.
5. Question `20261127-2220-d` : renseigner `pr`.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Aucun texte d'interface neuf sans acceptation mot pour mot ; aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Contrôles à l'écran en local, sur fixtures seulement. Aucune identité ni aucun identifiant de dossier réel au dépôt.
- Jamais de merge par la session. D-518 : une branche avec un commit propre en retard sur `main` demande l'arbitrage du responsable avant toute fusion.
