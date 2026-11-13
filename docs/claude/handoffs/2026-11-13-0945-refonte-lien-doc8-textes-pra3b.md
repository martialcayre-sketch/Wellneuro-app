# Handoff — 2026-11-13 — Refonte Lien / Empreinte, DOC-8 : textes du prototype PRA-3b, T-60 à T-66 inscrits dans D-488

## Branche et état du dépôt

- Branche `worktree-refonte-lien-doc8-textes-pra3b`, créée depuis `origin/main@c8542cab` (merge de DOC-7, #2047). Documentation seule.
- Worktree `.claude/worktrees/refonte-lien-doc8-textes-pra3b` du clone principal. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Aucun autre DOC-n ouvert au départ : DOC-7 (#2047) mergée avant l'ouverture, PR ouvertes relues (#2042, #2006, sans rapport).

## Objectif

Inscrire les textes du prototype PRA-3b que le responsable a acceptés mot pour mot le 2026-11-12 (« J'accepte tout »), avant que les PR de PRA-3b ne les posent.

## Décisions prises

- [[D-488]] : amendement DOC-8, sept lignes au §1 (famille praticien) avec Où, Sens, Existant, Lot :
  - T-60 à T-65 : échecs de lecture (questionnaires reçus, points d'étape, transmissions, protocole diffusé, arbitrages biologiques, proposition de bilan) ;
  - T-66 « Voir les nuits une par une ».
- Renumérotation : le prototype disait T-50 à T-56 ; T-49 et T-50 étant pris par DOC-7, inscription sous T-60 à T-66, sans changement de mot.
- Dans le même amendement : onglet Alimentation, deux mentions de version retirées (JA5-03, JA5-05) et quatre apostrophes rétablies ; emplacements neufs de T-17, du texte de relecture existant sous P28 et du message serveur de double arbitrage sous P19.
- Titre de [[D-488]] : « praticien T-01 à T-19, T-60 à T-66 ».
- [[D-481]] : complément DOC-8, Q4a, Q6b, Q9a, Q17a. Les quatorze autres questions (Q1-Q3, Q5, Q7, Q8, Q10-Q16, Q18) restent ouvertes. Le prototype n'est pas validé au titre de §4 : validation par groupe de PR (Q16).

## Fichiers modifiés

- `docs/decisions/D-488.md` : titre et amendement DOC-8.
- `docs/decisions/D-481.md` : complément DOC-8.
- Dossier de l'étape 2 :
  - `registre-textes.md` : numérotation, §1.5 neuf, récapitulatif ;
  - `plan-praticien.md` : §3, fiche PRA-3, puce « 3b, contenus ».
- `changelog.d/2026-11-13-refonte-lien-doc8-textes-pra3b.md`, ce handoff.

## Validations exécutées

- Textes relus sur le prototype PRA-3b et le brouillon de la session.
- Chemins cités relus au commit `50b0e4cf`, puis à `c8542cab` : `FichePatientPanel.tsx:1634, :2080`, `J21DecisionPanel.tsx:156`, `PractitionerFoodObservationPanel.tsx:485, :567, :575, :587, :626, :646, :1072, :1100`, `ArbitrageBiologiquePanel.tsx:155`, `arbitrage/route.ts:245`, `RenseignementsPatientPanel.tsx:42`, `ComprehensionPanel.tsx:271`, `AgendaSommeilPraticienPanel.tsx:194`, `AgendaAlimentairePraticienPanel.tsx:255`, `DecisionsParcoursPanel.tsx:586`, `PhysioTraitementsPanel.tsx:347`. Seul `destinationsPraticien.ts` a changé sous `web/src/` entre les deux têtes.
- Anti-secrets, `check:rapide` et CI : voir la PR.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Q18 (refus d'une empreinte qui n'est plus en vigueur à la validation pour diffusion) : micro-lot serveur proposé avant la PR 4, non arbitré.
- Revue de sécurité de l'export (PR 7) : rendue dans une session séparée, P0 maintenu sur la transmission manuelle ; ne bloque pas DOC-8.
- La liste commune et la page de suivi PRA-3 sont à mettre à jour après le merge.

## Prochaine action exacte

Fusion de DOC-8 par l'intégrateur. Ensuite, chaque PR de PRA-3b attend la validation écrite de son groupe (Q16) et l'arbitrage de ses questions, puis pose les textes que lui attribue la colonne Lot.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; un seul DOC-n ouvert à la fois.
- Aucun code, route, garde, drapeau, schéma ni règle clinique dans un lot DOC-n.
- Aucun décor avant COM-1.
- Aucune identité ni identifiant de dossier au dépôt ; production en lecture seule, et seulement sur demande.
