# Handoff — 2026-11-03 — Portail patient : lot L1 « rails et menus », filet de « Autres espaces » sans changement visible

## Branche et état Git
- Branche `test/l1-filet-menu-patient`, partie d'`origin/main@8ae6c496` (#1827, lot L0), worktree `.claude/worktrees/l1-filet-menu-patient`.
- Une PR, squash ; merge par la session (autorisation du responsable du 2026-11-03 pour toute la série L0-L5).

## Objectif
Lot L1 de l'audit `docs/claude/propositions/2026-11-01-portail-rails-et-menus/` (chapitre 11) : poser un filet de tests sous la ligne « Autres espaces » du hub avant le regroupement de D-423 (L2), sans rien changer à l'écran.

## Décisions prises
- Liste typée unique dans `web/src/components/patient/autres-espaces/entreesAutresEspaces.ts` (Q14 : module patient séparé, hors `lib/portail`, sans lien avec `SidebarRail`, `NavBar`, `MobileBottomNav`). Treize entrées : clé, libellé, segment, groupe, condition (`aucune`, `bilanConsultable`, `sonde`). L'ordre du tableau est l'ordre ACTUEL du hub, pas celui de D-423 §2.
- Groupes de D-423 §2 portés par le champ `groupe`, noms dans `GROUPES_AUTRES_ESPACES`, non rendus. « Ce que j'ai reçu » est écrit avec l'apostrophe droite du texte accepté ; le reste de l'UI emploie souvent l'apostrophe courbe (« d’analyses ») : à trancher en L2 avant de rendre l'étiquette.
- Libellés : la liste importe les constantes existantes (`TITRE_ESPACE`, `TITRE_BIBLIOTHEQUE`, `TITRE_LETTRE`, `TITRE_COURRIER_COMPLEMENT`, `TITRE_DOCUMENT_MEDECIN`, `LIEN_DEPOT`, `LIEN_MES_ECHANGES`) ; les six autres sont des littéraux, épinglés au banc.
- État des sondes : prop de rappel optionnelle `onSonde(ouvert)` sur les dix `Lien*` (lue au montage, appelée une fois, `false` sur panne, jamais après démontage) ; collecteur `useEtatsSondes()` raccordé au hub. Le rendu ne s'en sert pas encore ; `entreesServies()` est la fonction que L2 utilisera. Aucune règle nouvelle : l'exclusion fiches / bibliothèque reste aux routes.
- Le hub garde son JSX, ses commentaires (dont `questionnaires/page.tsx:496-505`, à verser à D-423 en L2), ses classes et son ordre ; seules changent l'import, une ligne de hook et la prop `onSonde` des dix `Lien*`.
- Pas de drapeau, pas de route agrégée, pas de migration ; `[token]/page.tsx` et `/api/portail/session` non touchés. Les huit drapeaux de nav ne sont pas armés dans les E2E.

## Fichiers modifiés
- Nouveau : `web/src/components/patient/autres-espaces/entreesAutresEspaces.ts` et son banc `.test.ts`.
- Dix `Lien*` (`patient-companion/` et `physio-traitements/LienFicheRenseignements.tsx`) : prop `onSonde`.
- `web/src/app/portail/[token]/questionnaires/page.tsx` : raccord des rappels.
- Bancs neufs : `questionnaires/autresEspaces.test.tsx` (hub), `patient-companion/liensAutresEspaces.failclosed.test.tsx` (table des dix), `LienPourVotreMedecin.test.tsx`, `LienDossierDeuxVoix.test.tsx`, `physio-traitements/LienFicheRenseignements.test.tsx`.
- Doc : audit (chapitre 11, « Constat à l'écran de L1 »), PLAN §8 ligne « Autres espaces » (renvoi au constat), `changelog.d/2026-11-03-l1-filet-menu-patient.md`.

## Validations exécutées
- T1 (`npm run check`) vert après les éditions de code puis après la doc.
- Suite Vitest entière : 936 fichiers, 15 749 bancs verts.
- Trois mutations jouées puis annulées, toutes rouges : classe d'un lien, ordre échanges / dossier, sonde laxiste (`ouvert` ignoré).
- T2 (`npm run test:worktree -- --fast --keep-db`) vert en 7 min 10 s : Vitest 15 812, E2E 303 passés, 7 ignorés (Chromium + WebKit).
- Constat à l'écran (Q23), avant (`origin/main@8ae6c496`) et après sur la même base éphémère : rendu identique dans les huit mesures. Chiffres au chapitre 11 de l'audit ; en bref :
  - majeur ouvert : 8 liens ; 239,2 px à 1 024 px ; 490,4 px à 390 px ;
  - mineur : 5 liens ; 176,4 px et 302,0 px ;
  - majeur clos : 7 liens ; 239,2 px et 427,6 px ;
  - maximum, cinq sondes de données simulées dans le navigateur : 12 liens ; 364,8 px et 741,6 px.
  Un lien mesure 50,8 px, non 48 : le plafond calculé de 708 px est dépassé à 390 px. Treize emplacements, douze servis au plus ; quinze n'est atteint dans aucun état.

## Problèmes ouverts
- Matrice EP-20 : aucune sonde ne lit la clôture ; un mineur clos garde les liens d'un mineur sans l'écran des mineurs (épinglé au banc). À garder en tête pour L2 (Q9, Q10).
- Constat incident hors périmètre : le dossier clos de test montre encore des questionnaires à commencer au fil ; le hub ne vide les assignations que pour un non-majeur (`questionnaires/page.tsx:275-281`). À trier dans un lot à part.
- « treize servis le 2026-11-01 » (PLAN §8) non reproduit ; l'origine du « quinze » reste une hypothèse.

## Prochaine action exacte
Arrêt avant L2 : le responsable constate l'écran (Q23) sur les chiffres ci-dessus. L2 rend ensuite `entreesServies()` en quatre groupes depuis la liste, verse D-423 au registre, adapte les E2E nommés au chapitre 11.

## Interdits encore actifs
- Ne toucher ni `[token]/page.tsx` ni `/api/portail/session` jusqu'à L3 (Q21, EP-07).
- Aucun chiffre sur une surface patient (D-333) ; aucune règle nouvelle de sonde ; aucun jeton `--rail-*` côté patient.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
