# Handoff — 2026-11-27 — Refonte Lien / Empreinte, COM-4 : décor masqué à l'impression à la source

## Branche et état du dépôt

- La branche `claude/refonte-lien-com4-decor-impression-0b54fa` a avancé par `--ff-only` sur
  `origin/main` `1f47a0a0` (PRA-2 décor, #2395). Elle vit dans le worktree
  `.claude/worktrees/refonte-lien-pat3b-signature-hub-aaa4bc`. `npm ci` et
  `npx prisma generate` ont été joués avant tout test.
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur.
- Aucun autre COM-n n'est ouvert.

## Objectif

Corriger à la source le défaut d'impression de `LienDecor`, vu par le banc E2E de PRA-3a
(#2385) : le `print:hidden` du socle perdait contre une classe d'affichage de l'appelant à
variante arbitraire (`[@container(min-width:118px)]:block`). Le décor restait imprimé.

## Décisions prises

- **Inventaire présenté au responsable avant tout code.** Il compte 12 poses de `LienDecor`.
  Une seule passe une classe d'affichage à variante : l'en-tête de fiche de PRA-3a.
- **Ordre réel des règles, mesuré** sur le CSS compilé (Tailwind 3.4, configuration du
  projet) :
  - `print:hidden` vient après toutes les variantes nommées (`md:`, `portrait:`, `dark:`,
    `data-[…]:`, `supports-[…]:`…) ;
  - il perd contre une variante arbitraire (`[@…]:`), émise en dernier, et contre une classe
    d'affichage marquée importante.
- **Pistes présentées** :
  - (a) `classesAdmises` refuse ces classes. Le motif de PRA-3a disparaîtrait aussi à l'écran,
    et les classes importantes resteraient à fermer.
  - (b) le socle force `print:!hidden`. Le rendu à l'écran est inchangé.
- **Réponse écrite du responsable, dans la session, 2026-11-27 : « Piste (b) ».** Le
  complément proposé, une garde sur les classes à la fois importantes et à variante
  arbitraire, n'a pas été retenu.
- **Mise en œuvre** : `SOCLE` passe de `print:hidden` à `print:!hidden` ; l'en-tête de la
  primitive est mis à jour. Il ne cite aucun nom de classe en exemple, car Tailwind lit les
  commentaires et produirait la règle (constaté sur un premier jet). Le `print:hidden` de
  l'enveloppe PRA-3a est gardé ; seuls ses commentaires sont mis au passé.

## Fichiers modifiés

- `web/src/components/ui/LienDecor.tsx` : socle `print:!hidden` ; en-tête.
- `web/e2e/fiche-entete-decor.spec.ts` : nouveau test. Il retire de la page le
  `print:hidden` de l'enveloppe, puis vérifie que le motif reste masqué à l'impression,
  sous Chromium (1440 px) et sous WebKit (iPhone 13).
- Six attentes de classe passent de `print:hidden` à `print:!hidden` :
  - `web/src/components/ui/LienDecor.test.tsx` ;
  - `web/src/components/FichePatientPanel.test.tsx` (avec son commentaire) ;
  - `web/src/app/login/page.test.tsx` ;
  - `web/src/components/patient/MonParcoursAccueil.test.tsx` ;
  - `web/src/components/patient/document-medecin/PourVotreMedecinLecture.test.tsx` ;
  - `web/src/components/patient-companion/DossierDeuxVoixView.test.tsx`.
- `web/src/components/FichePatientPanel.tsx` : commentaire seulement.
- `changelog.d/2026-11-27-refonte-lien-com4-decor-impression.md` et ce handoff.

## Validations exécutées

- T1 (`check:rapide`) : 0 après chaque édition. `npm run check` : 0.
- T2 (`npm run test:worktree -- --fast`) : 0. Vitest : 18 749 tests passés. E2E : 513 passés,
  aucun échec.
- **Preuve rouge puis verte du banc**, sur un build de production local :
  - SOCLE remis temporairement à `print:hidden` : le nouveau test échoue sur Chromium et
    sur WebKit (`toBeHidden`) ;
  - correctif rétabli : tout le spec est vert (10 passés).
- **CSS compilé, `main` contre la branche** : une seule règle diffère, `.print\:\!hidden`,
  et elle est dans `@media print`. Les règles d'écran sont identiques.
- **Écran, en local seulement** (build de production, base éphémère), sur Sophie Nicola,
  Jennifer Martin et Michel Dogné, sous Chromium (bureau) et WebKit (iPhone 13) :
  - le motif de l'en-tête de fiche fait 106 × 44 px, et le bandeau du hub 52 ou 64 px ;
  - les deux valent `display: none` à l'impression ;
  - les captures sont conformes.

## Problèmes ouverts

- Un trou théorique reste, non retenu par le responsable : une classe d'affichage à la fois
  importante et à variante arbitraire battrait encore `print:!hidden`. Aucun appelant n'en
  passe.
- Constat hors périmètre, antérieur au lot (CSS d'écran identique à `main`). Au bureau en
  1280 px, l'en-tête de fiche de Michel Dogné passe sur deux rangées : l'e-mail se coupe
  avant son dernier caractère, et le motif s'efface (tout ou rien). Son rangement revient à
  l'orchestration (PRA-3a).
- Non vus : appareils réels, aperçu d'impression d'un navigateur réel (seulement
  `emulateMedia`).

## Prochaine action exacte

L'intégrateur merge la PR déclarée « prête ». Le retrait du `print:hidden` de l'enveloppe
PRA-3a, devenu redondant, ne se fait que si le responsable le demande, en lot à part.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Un seul COM-n ouvert à la fois ; aucun texte d'interface neuf.
- Aucun drapeau, aucune modification clinique, de route, de garde, d'authentification ni de
  schéma.
- Production en lecture seule ; contrôles à l'écran en local seulement ; aucune identité
  réelle au dépôt.
