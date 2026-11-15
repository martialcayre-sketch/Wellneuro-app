# Handoff — 2026-11-15 — Garde du dossier de la page étendue aux routes d'écriture restantes du portail (lot `garde-portail-routes-restantes`, D-481 et D-488, DOC-14)

## Branche et état du dépôt

- Branche `docs/garde-portail-routes-restantes`, dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D).
  - Créée depuis `origin/main@9e7f9620`.
  - Avancée trois fois par `--ff-only` jusqu'à `e898b4f9`, sans commit propre.
- Un commit, posé juste avant le push.
- Le lot est `pris` au carnet (ordre 53).
- Chemin d'authentification au sens de D-373 : la file suit la PR jusqu'au constat.
- Aucune migration, aucun drapeau, aucun schéma.

## Objectif

Appliquer l'option a de la question `20261114-1951-d`. Il s'agit d'étendre aux autres routes d'écriture du portail la garde de #2125 (en-tête `x-wn-dossier-page`, 409, T-51), avec une liste confirmée route par route.

## Décisions prises

- La note de cadrage est passée avant le code : `docs/claude/propositions/2026-11-15-garde-portail-routes-restantes/cadrage.md`.
- Deux arbitrages ont été rendus en séance, chaque fois sur l'option recommandée, et consignés dans la liste commune :
  - `20261115-1110-d` : les emplacements de T-51 sont acceptés tels quels ;
  - `20261115-1111-d` : U30 est inclus avec T-51.
- Ces choix sont inscrits dans [[D-481]] (complément DOC-14), dans [[D-488]] (amendement DOC-14) et dans le registre des textes (§2.11).
- Onze routes sont gardées :
  - consentement, fiche, valider, date-naissance ;
  - protocole/checkin, ce-qui-compte, pack-reevaluation, ja/observations ;
  - lectures, trust/lecture ;
  - document-medecin/telechargement, absente de la question.
- Routes écartées, parce que leur identifiant cible est contrôlé contre la session ou qu'elles n'écrivent aucune donnée de dossier :
  - `patient/consentement`, qui était dans la question, et `submit` ;
  - les trois agendas, `comprehension`, `dossier` ;
  - `session`, `deconnexion`, `lien/demande`.
- Écrans :
  - Sur les douze écrans à geste, T-51 prend la place du message d'erreur existant.
  - Sur U34 (accusé), U38 et U41, la page reconnaît le refus (`estRefusAutreDossier`) et remplace le texte fixe.
  - Sur U07 et U08, l'indicateur de brouillon n'est pas posé sur ce refus (constat P2 de `wn-reviewer` : « aucun autre texte »).
  - Les trois écritures sans geste restent muettes.
- Crochet client `lib/portail/useSegmentPage.ts` : il lit le segment pour les composants sans prop. `portail-identite-locale.guard` interdit le mot `token` dans le panneau JA ; le segment ne sert jamais de clé de stockage local.

## Fichiers modifiés

- **Routes** : les onze `route.ts` cités, plus leurs bancs. Un banc est neuf : `consentement/route.test.ts`.
- **Composants** :
  - `app/portail/[token]/page.tsx` ;
  - `DateNaissanceEcran`, `CeQuiCompteForm`, `ProtocolCheckinForm`, `PatientCompanionHome`, `PropositionPackReevaluation`, `PatientFoodObservationPanel` ;
  - `AvantDeCommencer`, `ConditionsUtilisation`, `TransmissionCompteRendu`, `PourVotreMedecinLecture`, `ConsignerLecturePortail`.
- **Bancs de composant neufs** (`*.dossierPage.test.tsx`) : U04, U23, U38, U41 et la lecture datée ; un cas d'accusé est ajouté à U34.
- **Mock complété** : `DepotDocuments.test.tsx` reçoit `useParams`.
- **E2E** :
  - cas U23 dans `portail-garde-dossier-page.spec.ts`, et `compterEntreesCeQuiCompte` dans `helpers/db.ts` ;
  - en-tête sur le POST direct de `portail-parcours.spec.ts`.
- **Documentation** : D-481, D-488, `registre-textes.md`, la note de cadrage, `changelog.d/2026-11-15-garde-portail-routes-restantes.md`, ce handoff.
- **Fins de ligne** : `fiche/route.ts` passe de CRLF à LF dans l'index, ce que `.gitattributes` impose. `git diff -w` ne montre que 4 lignes.

## Validations exécutées

- Bancs des onze routes :
  - 409 pour un autre segment et pour un en-tête absent, sans écriture ;
  - 401 avant la garde ;
  - 403 avant la garde sur sept routes ;
  - sur `valider`, aucune notification de signal de sécurité sur un 409.
  - Total : 1091 tests verts (routes et pages du portail).
- T1 complet vert (`npm run check`, rc=0), après la correction du mock de `DepotDocuments`.
- T3 complet vert en 16 min 21 s :
  - Vitest SIIN 57, contrats SQL, bancs à deux sessions ;
  - E2E : 400 passés sur Chromium et iPhone 13, dont les quatre cas du spec de garde sur chacun des deux.
  - Une première passe T3 a été interrompue volontairement pour intégrer les P2 de la revue, puis rejouée en entier.
- `wn-reviewer` : GO avec réserves, ni P0 ni P1. Les P2 traités :
  - indicateur de brouillon sur U07 et U08 ;
  - en-tête de corrélation sur le 409 de `lectures` ;
  - bancs 403 et notification ;
  - §3 du cadrage ;
  - JSDoc déplacé.
  - Un P2 sera signalé à PR-Agent dans le corps de la PR : les fins de ligne de `fiche`.
- `/security-review` : aucune vulnérabilité de confiance ≥ 8.

## Problèmes ouverts

- Transition au déploiement : une page ouverte avant le déploiement envoie sans en-tête. Elle reçoit T-51 jusqu'à ce qu'elle soit rechargée (même régime que #2125).
- Question de `wn-reviewer`, non tranchée : faut-il un garde qui interdise `useSegmentPage` dans une clé de stockage local ? Ce serait un lot distinct.
- Signalement de la file A `20261115-1005-d-a-rail-e2e` (course dans `portail-rail-lateral.spec.ts:196`) : toujours en attente côté file A. Non touché ici.

## Prochaine action exacte

1. PR en `--body-file`, puis `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, puis un verdict sur chaque remarque, commentaires en ligne compris.
3. Sondes : release-db, chevauchement, contrôle de fusion. Ensuite, « prête @<sha> » sur la PR et au registre (`a: integrateur`) ; carnet et questions `20261115-1110-d` et `-1111-d` à clore au merge.
4. Carnet de la file D ensuite : `cockpit-seconde-page` (81), `licences-tierces-bundle` (83). `routine-cloud-essai-blanc` (82) est bloqué.

## Interdits encore actifs

- T-51 reste mot pour mot. Aucun texte neuf hors de D-488 ; la mention de sécurité ne s'ajoute nulle part hors de U40.
- Aucune migration, aucun drapeau ; la production reste en lecture seule.
- Aucun seed ni E2E sur un dossier réel. Fixtures Sophie Nicola, Jennifer Martin et Michel Dogné seulement.
- Toute écriture ArtifactData est épinglée par `if_version`.
- Un rouge WebKit du CI ne se relance jamais. Jamais de merge ni de rebase d'une branche qui porte ses propres commits.
