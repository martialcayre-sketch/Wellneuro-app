# Handoff — 2026-11-12 — Refonte Lien / Empreinte, DOC-4 : arbitrages Q5–Q7 du prototype PAT-2

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc4-pat2`, d'abord raccordée à la tête de DOC-3 (`eac400a7`, PR #2012). Rebasée sur `origin/main@c19d3593` après la fusion de DOC-3 (`git rebase --onto origin/main eac400a7`, sans conflit). Documentation seule.
- La session ne merge pas. Checkout principal non touché.

## Objectif

Inscrire les réponses écrites du responsable aux trois questions laissées ouvertes par DOC-3 sur le prototype PAT-2 (entrée dans le parcours, U01–U09), et proposer au registre les quatre formulations qu'elles appellent.

## Décisions prises

Le responsable a répondu par écrit le 2026-11-12 : « Q5a — Q6b — Q7a ».
- Q5 (a) : lien « Me reconnecter » vers la page de connexion, dans le même onglet, sous « Session expirée. Reconnectez-vous. ».
- Q6 (b) : correctif de comportement à l'entrée seule ; formulations « dans cet onglet ». Les questionnaires (`localStorage`) gardent « sur cet appareil ».
- Q7 (a) : message de sécurité gardé sous la liste des signaux ([[D-277]] §1), sans déplacement ni défilement ; visibilité à vérifier au lot.
- Les quatre formulations sont identifiées séparément (T-36 à T-39), proposées, **non acceptées**, comme le demande le prompt d'inscription. Elles n'entrent pas dans [[D-488]].

## Fichiers modifiés

- `docs/decisions/D-481.md` : complément DOC-4, après celui de DOC-3.
- Dossier de l'étape 2 (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/`) :
  - `registre-textes.md` : §2.6 (T-36 à T-39) et récapitulatif ;
  - `pat2-arbitrages.md` : section Q5–Q7 ;
  - `plan-patient.md` : paragraphe Q5–Q7 de la fiche PAT-2, avec sa réception complémentaire ;
  - `README.md` : ligne d'index de `pat2-arbitrages.md`.
- `changelog.d/2026-11-12-refonte-lien-doc4-pat2-q5-q7.md`, ce handoff.

## Validations exécutées

- Textes existants relus dans le code :
  - `components/patient/SaveStatusIndicator.tsx:19`, `:27` et `:36` ;
  - « Session expirée. Reconnectez-vous. » dans `app/api/portail/consentement/route.ts:19`, `fiche/route.ts:21` et `valider/route.ts:70` ;
  - brouillon de l'entrée en `sessionStorage` dans `app/portail/[token]/page.tsx:106-137`.
- [[D-277]] §1 relu : à l'anamnèse, le message paraît sous la liste des signaux tant que la case est cochée.
- Les lignes modifiées par DOC-3 ne sont pas réécrites, sauf l'index du README, devenu faux. Tous les ajouts suivent les siens.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- T-36 à T-39 ont été acceptés après ce lot ; un DOC-n les inscrit dans [[D-488]] avant PAT-2. T-35 reste proposé, non accepté.
- DOC-3 (#2012) est fusionné ; DOC-4 est rebasé sur `main`.

## Prochaine action exacte

Fusion de DOC-4 par l'intégrateur. Le responsable a accepté mot pour mot T-36 à T-39 le 2026-11-12, après l'écriture de ce lot (page de suivi patient) ; un DOC-n suivant les inscrit dans [[D-488]]. T-35 reste proposé.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; aucun chiffre côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification clinique, de route, de garde, de stockage ni de schéma.
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier au dépôt.
