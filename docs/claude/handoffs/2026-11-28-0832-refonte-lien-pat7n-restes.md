# Handoff — 2026-11-28 — Refonte Lien / Empreinte, PAT-7n : restes de PAT-7 au portail patient

## Branche et état du dépôt

- La branche `claude/refonte-lien-pat7n-restes-2fb98d` a avancé par `--ff-only` sur
  `origin/main` `4e7e876f` (#2408). Elle vit dans le worktree
  `.claude/worktrees/refonte-lien-pra6o-titres-554087`. `npm ci` et `npx prisma generate`
  ont été joués avant tout test.
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur.
- Le lot ne touche pas `components/ui/` : COM-4 (#2400) y était le seul COM-n ouvert.

## Objectif

Fermer ce qui restait de PAT-7 au portail patient : la marge des grandes cartes à 195 px
(zoom 200 % au téléphone, D-506), le vide de « Mon équilibre » (U15), et un moyen de voir
la fiche remise (U29) sur une fixture.

## Décisions prises

- **Réponse écrite du responsable, dans la session, 2026-11-28 : « Q1 B, Q2 B, Q3 A »**
  (questions `20261127-2225-d` à `-2227-d` de la liste commune, passées à « tranchée »,
  réponse citée mot pour mot).
  - Q1 B : marge `p-8 max-[319px]:p-5`.
  - Q2 B : le vide de U15 passe par `LienDecor` (`etat-vide`, `nutrition-sprout`),
    `mb-3 w-40`.
  - Q3 A : un helper E2E pour une fiche remise sur une fixture, un constat local drapeau
    allumé en local seulement, aucun E2E de réception versé.
- **Écart vu au constat, puis tranché** : sur U29, le mot sans espace de la fixture de banc
  faisait déborder la page de 371 px au téléphone et de 554 px à 195 px. Réponse écrite du
  responsable, 2026-11-28 : « Oui, dans PAT-7n ». Les précautions et les paragraphes de
  `FicheRemiseLecture` portent `[overflow-wrap:anywhere]`, la convention du portail.
- `GrowthIllustration` reste dans le dépôt : la vitrine de développement l'emploie encore.
- Aucun texte d'interface neuf, aucun chiffre côté patient, aucun drapeau, rien de clinique.

## Fichiers modifiés

- `web/src/components/patient/ui/PatientCard.tsx` : `lg` vaut `p-8 max-[319px]:p-5`.
- `web/src/components/patient/MonEquilibreAccueil.tsx` et `MonEquilibreDetail.tsx` : les
  cartes écrites en ligne prennent la même marge ; l'accueil pose `LienDecor` dans le vide.
- `web/src/components/patient/MonEquilibreAccueil.test.tsx` : le vide porte le décor,
  masqué aux lecteurs d'écran, juste avant la phrase.
- `web/src/components/patient/fiches-assiette/FicheRemiseLecture.tsx` : coupure des mots
  longs ; `FichesRemises.test.tsx` : la classe est présente.
- `web/e2e/helpers/db.ts` : `provisionFicheRemiseE2E` (fixtures `PAT_SEED_01` à `03`
  seulement) et `cleanupFicheRemiseE2E`. L'état se pose en base, comme
  `provisionnerRatification` ; la version validée devient la référence de toute la base,
  donc jamais en parallèle avec `bibliotheque-fiches-conseils`.
- `changelog.d/2026-11-28-refonte-lien-pat7n-restes.md` et ce handoff.

## Validations exécutées

- T1 (`check:rapide`) : 0 après chaque édition. `npm run check` : 0.
- Vitest ciblé : 31 passés (`FichesRemises`, `MonEquilibreAccueil`).
- T2 (`npm run test:worktree -- --fast`), sur `dc626fe3` : **1**. Vitest : 18 753 passés.
  E2E : 516 passés, 1 échec hors périmètre : `portail-transmission-compte-rendu.spec.ts:92`
  sous Chromium bureau, axe `document-title` à l'étape d'accusé (le même test passe sous
  iPhone 13 ; le diff ne touche pas cette page).
  - Rejeu du seul spec, Chromium bureau, `--repeat-each=5`, build de production de la
    branche, variables d'URL et de port de T2 : **5 passés, code 0**. Échec classé « non
    reproduit » : observé une fois, démontré nulle part.
  - Avance ensuite sur `origin/main` `4e7e876f` (#2408, outillage de l'intégrateur
    seulement) : T2 non rejoué.
- **Écran, en local seulement** (build de production, drapeau de lecture des fiches allumé
  pour ce seul constat), sur Sophie Nicola, Jennifer Martin et Michel Dogné, sous Chromium
  (1280 et 195 px) et WebKit (iPhone 13, 390 et 195 px) : 12 passés.
  - U10 : bandeau du hub présent et masqué aux lecteurs d'écran ; première action visible
    sans défiler, y compris à 195 px ; axe sans violation.
  - Cartes à 195 px : marge 20 px, colonne de texte 121 px (97 avant).
  - U15 : germe 160 × 73 px, masqué ; pas de débordement de page ; axe sans violation.
  - U28, U29 : sans chiffre, axe sans violation ; débordement de U29 constaté (corrigé
    ensuite, voir Décisions).
  - U40 : anneau de focus du champ de date, 2 px, `#205b63`.
  - Le spec de constat n'est pas versé ; la fixture de remise a été défaite après le passage.

## Problèmes ouverts

- Un échec E2E intermittent possible, non reproduit en cinq rejeux : `document-title` sous
  Chromium bureau dans `portail-transmission-compte-rendu.spec.ts`, juste après une
  navigation interne (le titre arriverait après le passage d'axe : hypothèse). Hors
  périmètre.

- Le débordement de U29 corrigé n'a pas été revu à l'écran après le correctif ; le banc
  Vitest vérifie la classe, jsdom ne mesure rien.
- À 195 px, le germe de U15 (160 px) mord sur la marge de sa carte de 161 px, sans
  déborder de la page.
- Les titres de section et le titre d'une fiche ne portent pas la coupure : aucun écart vu.
- Base de dev locale : une assignation verrouillée `ASS_LOCAL_PAT7N_U15` posée pour le
  constat de U15 y reste (suppression refusée par le garde-fou). Sans effet sur T2, qui
  monte sa propre base.

## Prochaine action exacte

Attendre le CI (`node scripts/wn-attendre-ci.mjs <N>`), la revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), donner un verdict à chaque commentaire,
puis déclarer « prête @<sha> » à l'intégrateur.

## Interdits encore actifs

- Jamais de merge par la session ; jamais d'auto-merge.
- Aucun texte d'interface hors D-488 ; aucun décor hors `LienDecor` ; pas de `components/ui/`
  tant qu'un autre COM-n est ouvert.
- Aucun drapeau, aucune migration, rien de clinique ; production en lecture seule.
- Jamais de nom ni d'e-mail de patient réel dans le dépôt ; seeds et E2E ne visent jamais
  un dossier réel (D-075, D-125).
- Jamais deux T2 à la fois sur le Mac ; l'outillage de mesure local n'est pas versé.
