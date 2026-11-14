# Handoff — 2026-11-14 — Garde serveur du dossier de la page sur les cinq routes d'écriture du portail (D-481 et D-488, DOC-12)

## Branche et état du dépôt

- Branche `feat/garde-portail-dossier-session`, créée depuis `origin/main@c5755cd9` puis avancée par `--ff-only` jusqu'à `711cd281`, dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D).
- Lot `garde-portail-dossier-session` (ordre 52 au carnet), pris par un update conditionnel. Chemin de session : la PR relève de l'authentification au sens de D-373, et la file la suit jusqu'au constat.
- Aucune migration, aucun drapeau, aucun schéma.

## Objectif

Appliquer Q8 a, Q9 a, Q10 a et Q11 a de DOC-12 : refuser en 409, sans écrire, l'envoi d'une page ouverte pour un autre dossier que celui de la session. C'est le préalable du code de Q2a et Q3a (PAT-6).

## Décisions prises

- Le segment voyage dans l'en-tête `x-wn-dossier-page`, porté par le module pur `lib/portail/dossierPage.ts`.
  - La comparaison se fait sur la forme canonique : décodé une fois, puis encodé.
  - Un segment absent est refusé (fail closed) : une page servie avant le déploiement doit être rechargée, ce que T-51 dit.
- La garde `refusAutreDossier` (`lib/trust/portailAuth.ts`) s'appelle juste après `authentifierPatientPortail`.
  - Elle passe avant toute lecture du corps (documents, comptes-rendus, physio-traitements), avant le verrou (`choix`), et avant l'orientation, l'écriture et la notification (`signalement`).
  - Le corps JSON de `choix` et de `signalement` restait lu avant l'authentification, comme avant le lot. Rien de ce qui précède la garde n'écrit.
- Placement de T-51 :
  - sous le bouton d'envoi sur U33, U34 et U40 ;
  - à l'endroit du geste sur U35, U07 (`DeclarationsPatient`, segment lu par `useParams`) et U39.
  - Sur U40, la mention de sécurité existante suit T-51 ; elle est désormais tenue dans une constante, à texte identique.
  - Après le refus, aucune relecture (elle rendrait les données de l'autre compte) et la saisie reste.
- Q9 a : layout serveur neuf `app/portail/[token]/layout.tsx`.
  - Il ne vérifie que la signature et l'expiration de la session, sans lecture en base.
  - Une page ouverte sous un autre segment renvoie vers `/portail/<idPatient>`.
  - Ce renvoi n'a lieu qu'au rendu serveur du segment.
- Les E2E à segment constant (`jeton-de-parcours`) passent sur l'`idPatient` : reconnexion, dossier à deux voix, « ce qui compte ».

## Fichiers modifiés

- Routes : `web/src/app/api/portail/{documents,comptes-rendus,physio-traitements,trust/choix,trust/signalement}/route.ts`, et leurs bancs, plus `route.designation.test.ts`.
- `web/src/lib/portail/dossierPage.ts` (et son banc), `web/src/lib/trust/portailAuth.ts`, `web/src/app/portail/[token]/layout.tsx` (et son banc).
- Composants : `DepotDocuments`, `TransmissionCompteRendu`, `MesChoix`, `SignalerProbleme`, `DeclarationsPatient`, chacun avec un banc `*.dossierPage.test.tsx`.
- E2E :
  - nouveau `portail-garde-dossier-page.spec.ts` ;
  - `helpers/db.ts` (`compterEcrituresTrust`) ;
  - `portail-signalement-designation.spec.ts` (en-tête sur les deux POST directs) ;
  - les trois specs à segment constant.
- `changelog.d/2026-11-14-garde-portail-dossier-session.md`, ce handoff.

## Validations exécutées

- Bancs écrits avant le code :
  - 10 cas de garde rouges, puis verts (128/128 sur les routes) ;
  - layout rouge, puis vert ;
  - 5 bancs de composant verts.
- T1 rapide : 16 étapes vertes.
- T1 complet : type-check, lint et bancs verts. Un seul rouge, `scripts/wn-codex-avis.test.mjs`, qui a trouvé dans le TMPDIR des dossiers `wn-codex-p0-test-*` laissés par une exécution concurrente ; le fichier rejoué seul est vert (30/30).
- `check_no_secrets.sh` : 0.
- T3 (`npm run test:worktree`), séquence complète verte en 15 min 48 s :
  - Vitest : 17 799 tests ;
  - E2E : 398 tests sur Chromium et iPhone 13, dont les trois cas du nouveau spec sur chacun des deux.
  - Une première passe avait 8 échecs : des dépassements de 5 s et une borne de performance, dans quatre fichiers hors du diff, joués pendant une revue concurrente. Ces fichiers, rejoués seuls, sont verts (296/296), puis T3 a été rejoué en entier.
- `wn-reviewer` : GO avec réserves, sans P0 ni P1. Ses P2 ont été traités :
  - changelog et handoff ajoutés ;
  - bancs ajoutés sur MesChoix, DeclarationsPatient et TransmissionCompteRendu ;
  - transition au déploiement dite dans la PR.
- `/security-review` : aucune vulnérabilité candidate.

## Problèmes ouverts

- Transition au déploiement : une page ouverte avant le déploiement voit ses envois refusés avec T-51 jusqu'à ce qu'elle soit rechargée. L'ancien bundle de U40 affiche T-51 comme une erreur ordinaire, sans la mention ; les numéros restent au pied du portail.
- Double décodage théorique d'un `%` littéral dans un `idPatient` : sans objet avec la forme actuelle des identifiants.
- Liste commune `20261114-1951-d` (ouverte) : faut-il étendre la garde aux autres routes d'écriture du portail qui prennent le dossier dans la seule session ? Ce sont valider, date-naissance, protocole/checkin, ce-qui-compte, pack-reevaluation, fiche, consentement, ja/observations, lectures et trust/lecture. `patient/submit` est écarté : il refuse en 403 une assignation qui n'est pas celle de la session.
- Question du responsable, en cours : une autorisation permanente d'écrire SQL et Prisma sans approbation. La version bornée est proposée, la réponse est attendue ; ce sera un lot distinct.

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci.mjs` en tâche de fond), puis `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. Chemin d'authentification : la file merge elle-même après la revue, puis constate le déploiement (version servie). Ligne du carnet à `fait`.
3. Ensuite, au carnet de la file D : `licence-mention-droits` (ordre 80), puis `cockpit-seconde-page` (ordre 81).

## Interdits encore actifs

- Aucun texte patient hors de D-488 ; T-51 et la mention de sécurité restent mot pour mot.
- Aucune migration, aucun drapeau ; production en lecture seule.
- Aucun seed ni E2E sur un dossier réel ; fixtures Sophie Nicola, Jennifer Martin et Michel Dogné seulement.
- Toute écriture ArtifactData épinglée par `if_version`.
