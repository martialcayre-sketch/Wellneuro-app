# Handoff — 2026-11-14 — Refonte Lien / Empreinte, PAT-6 première partie : Q1, Q4 à Q7 codées (U33–U40 hors Q2a et Q3a)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat6-transmissions`, dans le worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT), avancée par `--ff-only` sur `origin/main@424025e9` avant tout commit.
- Code patient seul ; aucun fichier `app/api/**`, `prisma/**`, drapeau ni texte de consentement, de droits ou de sécurité. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Coder les choix du prototype PAT-6 qui ne dépendent pas de la garde de session ([[D-481]], complément DOC-11) : Q1b, Q4a, Q5a, Q6a, Q7a. Feu vert du responsable le 2026-11-14, après le constat de conformité et la réponse à Q8 (`20261114-1105-d`, a).

## Décisions prises

- Q1b : `lib/trust/datePublication.ts`, une seule fonction pour `DocumentTrust` et les deux mentions de U37 ; la date calendaire AAAA-MM-JJ se lit en UTC ; une valeur d'une autre forme ou impossible s'affiche telle quelle.
- Q7a : mentions de U35 en lettres, toujours au jour de Paris (`acteLe` est un horodatage).
- Q4a : prop `onSessionExpiree` de `DeclarationsPatient`, passée par la seule page U35 (`DeclarationsDeLaFiche`, `router.replace` vers l'entrée). 401 seul ; réseau et 503 gardent la phrase et « Réessayer ». Sur la page, un enregistrement refusé en 401 n'est pas relu : la relecture renverrait à l'entrée et emporterait la saisie.
- Q5a : chaque envoi porte une ancre (question, ligne, arrêt, ajout) ; le message paraît au-dessus des boutons concernés, une fois ; si l'ancre n'est plus à l'écran après relecture, en tête. U39 : dans l'accordéon du choix.
- Q6a : région `status` (`sr-only`) ; U35 annonce la ligne neuve ou la réponse retenue avec sa mention, U39 le libellé et le statut du choix, seulement après l'accord du serveur et la relecture. Un retrait n'a pas d'état affiché à annoncer : rien n'est annoncé (l'accusé explicite reste la recommandation non décidée du responsable).
- Q5a et Q6a valent aussi pour la fiche de l'entrée (U07), qui partage le composant : D-481 n'en exclut U07 que pour Q3 et Q4. À revoir si le responsable le veut autrement.

## Fichiers modifiés

- `web/src/lib/trust/datePublication.ts` (+ test), `web/src/components/patient/trust/DocumentTrust.tsx`, `web/src/app/portail/[token]/informations/page.tsx`.
- `web/src/components/physio-traitements/DeclarationsPatient.tsx` (+ `DeclarationsPatient.pat6.test.tsx`), `FormulaireTraitement.tsx` (prop `erreur`, optionnelle, inutilisée côté praticien), `DeclarationsDeLaFiche.tsx` (neuf), `web/src/app/portail/[token]/renseignements/page.tsx`.
- `web/src/components/patient/trust/MesChoix.tsx` (+ `MesChoix.gestes.test.tsx`).
- `web/e2e/portail-parcours.spec.ts` (date de version en lettres).
- `changelog.d/2026-11-14-refonte-lien-pat6-transmissions.md`, ce handoff.

## Validations exécutées

- Vitest ciblé (trust, physio-traitements, lib/trust) : 27 fichiers, 292 tests verts.
- T1 rapide : 16 étapes vertes, 3 sautées.
- T2 (`npm run test:worktree -- --fast`) : vert en 12 min 16 s (E2E Chromium et WebKit sur build de production). T1 complet (`npm run check`) : 0. `check_no_secrets.sh` : 0.
- U35 n'est pas jouable en E2E : `WN_PHYSIO_TRAITEMENTS` est absent de l'environnement E2E (page en `notFound`). Q4 à Q7 y sont prouvées par tests unitaires, y compris la mention visible à l'œil ; aucun constat à l'écran local n'a été fait.

## Problèmes ouverts

- Q2a et Q3a : attendent le lot `garde-portail-dossier-session` (carnet de la file D), préalable posé par D-481 et D-488 (DOC-11).
- Accusé explicite sur U35 et U39 : recommandation du responsable, micro-lot documentaire à examiner.
- Hors lot : séparateur des deux voix et ornements après COM-1 ; 1050-d, 1302-d, lot Q5b, valeur 5 des plaintes, ligne de prises au zoom 200 %.

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci.mjs` en tâche de fond), PR-Agent prouvé sur la tête, un verdict par remarque, « prête @<sha> » au registre.
2. Après la garde serveur : seconde partie de PAT-6 (Q2a, Q3a, E2E de non-perte et de changement de compte), même branche de nom neuve sur `origin/main`.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun décor avant COM-1.
- Aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration, aucun drapeau ; fichiers COM-0 gelés.
- Production en lecture seule ; constat à l'écran en local seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
