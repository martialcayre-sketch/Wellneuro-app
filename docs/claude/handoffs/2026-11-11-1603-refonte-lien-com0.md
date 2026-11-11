# Handoff — 2026-11-11 — Refonte Lien / Empreinte, COM-0 : fondation (jetons, polices, marque, primitives)

## Branche et état du dépôt

- Branche `claude/refonte-lien-com0`, créée depuis `origin/main` (`dc0cbed1`, merge de #1986), dans le worktree `wt-refonte-com0`.
- Un commit de lot. À déclarer « prête @<sha> » pour l'intégrateur après la CI et la revue de bot ; la session ne merge pas.
- Checkout principal non touché.

## Objectif

Lot COM-0 du socle (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/socle-commun.md`). Il raccorde aux jetons du produit la palette, les polices, la marque et les icônes de l'artefact « Wellneuro Lien — Empreinte », version 4. Cadre : A5-R3, [[D-481]]. C'est le lot 1 du cadrage v3 §18. Après lui, ses fichiers sont gelés pour les sessions PRA et PAT. Tout besoin commun passe ensuite par un micro-lot COM-n.

## Décisions prises

- **Rôles communs.** Ils sont posés sur `:root, [data-theme='praticien'], [data-theme='patient']` : canvas, surfaces, encre, primaire pétrole, accent argile, focus, statuts. Ce qui distingue les deux thèmes tient dans deux blocs séparés :
  - les titres : Lora côté patient, Sora côté praticien ;
  - le menu latéral : sauge côté patient, nuit pétrole côté praticien.
- **Ordre des sélecteurs.** `[data-theme='praticien']` précède `[data-theme='patient']` dans le bloc commun. `RailMonEspace.test.tsx` découpe `globals.css` sur `":root,\n[data-theme='patient'] {"` puis `"[data-theme='praticien'] {"` ; l'ordre inverse vide sa tranche.
- **Palettes Spirale gardées** (indigo, forêt, cuivre, solaire, menthe, nuit) : des écrans les citent par leur nom (`text-solar-ink` dans environ 36 fichiers, etc.). Ils migrent dans leurs lots. Le trio `viz-*` est inchangé.
- **Teintes du rail nuit absentes de l'artefact.** `--lien-rail-hover` (#1a3a42, fond des entrées inactives de la barre basse, 11,9:1 sous l'ivoire) et `--lien-rail-line` (#2a4f57, filet décoratif). `--rail-gradient` vaut `none` dans les deux thèmes.
- **`--color-accent-foreground` = encre.** Sur l'argile, ni l'encre (3,6:1) ni l'ivoire (3,3:1) n'atteignent 4,5:1. L'encre est la moins mauvaise. Voir « Problèmes ouverts ».
- **Icônes.** Les fichiers d'icônes du kit ne sont pas copiés : l'artefact les donne comme référence d'aperçu et retient `lucide-react` au trait de 1,75 (`TRAIT_ICONE`, `components/ui/icone.ts`). Les signatures SVG du kit ne sont pas copiées non plus, parce qu'elles incorporent du texte (`empreinte-logo*.svg`). Le composant rend le nom en HTML.
- **`EmpreinteMarque`** est placé dans `components/ui`, en nom français, à l'équivalent du `EmpreinteBrand` de l'artefact.
- **`global-error.tsx`** garde des hexadécimaux, comme le prévoit la garde `design-system.guard.test.ts` : cet écran remplace le layout racine, sans variables CSS. Ce sont désormais les valeurs Lien.
- **`scroll-padding-bottom: 5rem` sous 768 px.** C'est un défaut latent révélé par T2, voir « Validations exécutées ».

## Fichiers modifiés

- `web/src/app/globals.css` :
  - palette `--lien-*` et jumeaux RGB ;
  - durées et `--ease-lien` ;
  - bloc des rôles communs, bloc patient (rail sauge, `--rail-patient-compact`, Lora), bloc praticien (rail nuit pétrole) ;
  - succès `#166534` ;
  - réserve de défilement mobile.
- `web/tailwind.config.ts` : `accent.ink`, `control-border`, `voice.*`, `lien.*` (teintes sans rôle), `font-marque`, `w-nav-rail-compact`, `duration-*`, `ease-lien`.
- `web/src/app/layout.tsx` : Lora ajoutée ; Bricolage Grotesque et Albert Sans retirées (aucun écran ne les citait) ; favicon Empreinte.
- `web/src/app/not-found.tsx` : marque (symbole, nom masqué), carte `shadow-card`, titre en encre, filet `control-border`.
- `web/src/app/global-error.tsx` : valeurs Lien ; bouton de 48 px.
- `web/src/components/ui/PanneauSuperpose.tsx` : surtitre `text-accent-ink`, croix au trait `TRAIT_ICONE`.
- Nouveaux : `web/src/components/ui/EmpreinteMarque.tsx` et son test ; `web/src/components/ui/icone.ts` ; `web/public/wellneuro-lien/` :
  - `brand/` : quatre marques, plus le favicon en SVG et en ICO ;
  - `ornaments/`, `patterns/`, `backgrounds/` ;
  - `PROVENANCE.md`, `LUCIDE-LICENSE.txt`.
- Hors liste COM-0, après revue : `components/patient-companion/DossierDeuxVoixView.tsx`, `components/patient-cockpit/ObjectifNegociePanel.tsx` et `components/SynthesePanel.tsx`, une classe chacun (voir « Problèmes ouverts »).
- `changelog.d/2026-11-11-refonte-lien-com0-fondation.md`, ce handoff.
- Fichiers COM-0 relus sans modification : `Badge.tsx`, `ScoreGauge.tsx`, `FormulaireTraitement.tsx`, `ChampDatePeriode.tsx`. Ils ne contiennent que des jetons sémantiques, sans palette codée en dur. `ScoreGauge` garde `showValue` intact.

## Validations exécutées

- **Contrastes recalculés** (WCAG, script local) :
  - encre : 10,5:1 sur le canvas, 11,6:1 sur la surface, 9,7:1 sur la sauge ;
  - texte secondaire : 5,3:1, 5,8:1 et 4,9:1 sur les mêmes fonds ;
  - pétrole : 7,5:1 en texte et sous son libellé ; bord de contrôle 3,35:1 et 3,06:1 ; encre argile 6,4:1 ;
  - succès : 6,35:1 sur le canvas ;
  - rail nuit : texte 13,8:1 et 11,1:1, texte atténué 8,9:1 et 7,2:1, champagne 7,2:1 et 5,8:1 ;
  - danger 6,3:1, avertissement 6,9:1, info 6,6:1 sur la surface.
- **T1** (`cd web && npm run check`) vert.
  - Le premier passage était rouge sur `RailMonEspace.test.tsx`, par l'ordre des sélecteurs, corrigé dans le CSS.
  - Vitest : 1718 tests passés, 21 ignorés, puis 509 passés.
  - Anti-secrets OK.
- **T2** (`npm run test:worktree -- --fast`), premier passage : 356 passés, 1 échec (`e2e/lecture-datee-reflow.spec.ts`, iPhone 13).
  - *Observé sur un parcours réel* : après `scrollIntoViewIfNeeded`, « Retour au présent » s'arrête au bord bas du viewport (`haut` 619 px sur 664), sous `MobileBottomNav` (fixe, 4 rem). L'appui tombe sur « Synthèses ».
  - *Démontré dans le code* : aucune réserve de défilement n'existait pour cette barre. Le changement de polices a déplacé le bouton jusque-là.
  - Correctif : `scroll-padding-bottom` sous 768 px. Second passage vert : 357 passés, 23 ignorés, 0 échec.
  - Après les correctifs de contraste de la revue, T1 et T2 ont été rejoués, tous deux verts (T2 : 357 passés, 0 échec).
- **Constat à l'écran local** : preuves visuelles de `e2e/visual.spec.ts` (base de test éphémère, patients fictifs), relues après T2.
- **Relecture `ui-ux-pro-max`** (`.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv`) :
  - l.3 « Fixed nav should not obscure content » : c'est le correctif ci-dessus ;
  - l.37 « Minimum 4.5:1 ratio for normal text » : respectée par tous les rôles textuels, sauf le libellé sur argile (voir « Problèmes ouverts ») ;
  - l.51 et l.76 (chargement des polices) : `next/font` sert `font-display: swap` et une police de repli ajustée.

## Problèmes ouverts

- **Texte sur l'argile : soldé dans ce lot**, sur la revue de CodeRabbit et de PR-Agent : le recul de contraste ne devait pas attendre les lots suivants. Ces fichiers n'appartiennent pas à COM-0, mais aucune session PRA ou PAT n'avait commencé, donc il n'y a pas de conflit.
  - Les boutons sélectionnés de `DossierDeuxVoixView.tsx` (l.858) et de `ObjectifNegociePanel.tsx` (l.1960) passent en `bg-primary text-primary-foreground` (7,5:1), qui est le rôle « sélection » de l'artefact.
  - Le lien de `SynthesePanel.tsx` (l.558) passe en `text-accent-ink` (6,4:1).
  - Les icônes `text-accent` restent à 3,2:1, ce qui suffit pour un élément graphique.
- **Écrans qui citent encore les palettes Spirale par leur nom** (`indigo-600`, `solar-ink`, `mint-ink`, `copper-ink`, `forest-600`, `night-*`) : ils gardent leur ancienne teinte jusqu'à leur lot.
- **`SidebarRail`** active encore son entrée par `rail-primary` (aplat pétrole). L'artefact veut `rail-surface` et une barre `rail-accent` : c'est le travail du lot PRA-1.

## Prochaine action exacte

Commit, push, PR, CI (`node scripts/wn-attendre-ci.mjs <N>`), revue (CodeRabbit, sinon PR-Agent), puis « prête @<sha> ». Après le merge, passer COM-0 à « merge » dans les deux pages de suivi. Les sessions PRA et PAT peuvent ensuite démarrer, sur la demande du responsable.

## Interdits encore actifs

- Fichiers COM-0 gelés après le merge ; tout besoin commun passe par un COM-n, un seul ouvert à la fois.
- Aucun texte hors de [[D-488]] ; aucun chiffre, compteur ni pastille côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite. Aucune modification clinique, de questionnaire, de route, de garde ni de schéma.
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier au dépôt.
