# Handoff — 2026-11-14 — Refonte Lien / Empreinte, DOC-11 : arbitrages du prototype PAT-6 inscrits (D-481, D-488)

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc11-pat6`, créée depuis `origin/main@faafc455` dans le worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT). Une branche `claude/refonte-lien-pat6-transmissions`, sans commit, attend le code.
- Documentation seule : aucun fichier sous `web/`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Inscrire les réponses du responsable aux sept questions du prototype PAT-6 (https://claude.ai/artifact/NsqRAGHvr96QcrjoxBZX3N, itération 1) et les emplacements neufs de textes existants qu'elles demandent, avant tout code.

## Décisions prises

- Réponse écrite du responsable, le 2026-11-14 : `Q1b — Q2a — Q3a — Q4a — Q5a — Q6a — Q7a`, l'option recommandée partout ; acceptation mot pour mot du réemploi de T-36 aux emplacements de Q2a et Q3a. Liste commune : `20261114-1035-d` à `-1041-d`, répondues.
- D-481, complément DOC-11 : les sept choix et les précisions du responsable (format de date seul, saisie gardée, renvoi explicite, E2E de non-perte et de changement de compte, 401 seul pour Q4, erreur sans duplication, aucun faux succès pour Q6).
- D-488, amendement DOC-11 : le message de session expirée de la route, affiché sous l'envoi de U33 et U34 sur un 401 de dépôt (retenu par Q2a) ; T-36 dessous, et sous le 401 d'un enregistrement de U35 (page seule), U39 et U40, dans un nouvel onglet.
- Le message de la route sur U33 et U34 est inscrit au titre du choix Q2a (« Afficher le message servi ») ; l'acceptation mot pour mot du responsable nomme T-36.
- Recommandation du responsable, non décidée : un accusé explicite sur U35 et U39, à examiner dans un micro-lot documentaire distinct.

## Fichiers modifiés

- `docs/decisions/D-481.md`, `docs/decisions/D-488.md`.
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` (§2.9, récapitulatif), `plan-patient.md` (PAT-6).
- `changelog.d/2026-11-14-refonte-lien-doc11-pat6.md`, ce handoff.

## Validations exécutées

- Rendu du prototype contrôlé à l'écran le 2026-11-14 dans le navigateur intégré, sur une copie locale des sept cartes (styles et chrome du prototype) : bureau 1 280 px et téléphone 390 px, sans débordement ni texte tronqué. Le clavier et le confort de lecture ne se prouvent pas sur ce prototype en pixels fixes : ils sont des critères de réception du code (PAT-6, puis PAT-7).
- `check_no_secrets.sh` : 0 ; T1 rapide (`npm run check:rapide`) : 16 étapes vertes, 3 sautées ; T1 complet (`npm run check`) : 0.

## Problèmes ouverts

- **Constat de PR-Agent sur #2104, vérifié au code** : les cinq routes d'écriture (`documents`, `comptes-rendus`, `physio-traitements`, `trust/choix`, `trust/signalement`) prennent le dossier dans la seule session. Un envoi depuis une page restée ouverte pour un patient A, après la reconnexion d'un patient B dans le même navigateur, s'écrirait chez B. D-481 et D-488 en font un préalable de Q2a et Q3a ; la forme de la garde est soumise au responsable (`20261114-1105-d`). Le même risque existe déjà aujourd'hui, sans 401, pour toute page restée ouverte quand un autre patient se connecte dans le même navigateur (démontré par le code, non observé).
- Le feu vert du code n'est pas donné : il suit la validation visuelle du prototype par le responsable et le constat de conformité.
- Hors lot : séparateur des deux voix et ornements des vides après COM-1 ; 1050-d, 1302-d, lot Q5b, valeur 5 des plaintes, ligne de prises au zoom 200 %.

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci.mjs` en tâche de fond), PR-Agent prouvé sur la tête, un verdict par remarque, « prête @<sha> » au registre.
2. Au feu vert, code PAT-6 sur `claude/refonte-lien-pat6-transmissions`, rebasée sur `origin/main` après le merge de DOC-11.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun décor avant COM-1.
- Aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration, aucun drapeau ; fichiers COM-0 gelés.
- Production en lecture seule ; constat à l'écran en local seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
