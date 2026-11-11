# Handoff — 2026-11-11 — Refonte Lien / Empreinte, étape 2 : cadrage révisé et plans

## Branche et état du dépôt

- Branche `claude/refonte-lien-etape2`, créée depuis `origin/main`
  (`ac3f0ead`) dans le worktree `wt-refonte-etape2`. Documentation seule.
  À déclarer « prête @<sha> » pour l'intégrateur après CI et revue de bot.
- #1978 et #1979 (lots de l'étape 1) mergées pendant la rédaction ;
  fichiers disjoints de cette PR.
- Checkout principal non touché.

## Objectif

Étape 2 de la refonte : traduire les réponses de l'étape 1 en amendements,
cadrage et catalogue révisés, registre des textes ; puis, à la demande du
responsable, deux plans de réalisation (praticien, patient) menables par
deux sessions parallèles, chacun avec une page de suivi.

## Décisions prises

- Aucune décision signée : AM-1 à AM-8 sont des propositions (AM-7 et AM-8
  conditionnels) ; DOC-0 prendra
  tous les numéros D-xxx d'un coup, après acceptation, pour que les deux
  sessions n'en prennent aucun.
- Un seul lot commun, COM-0 (jetons, polices, marque, primitives partagées),
  préalable aux deux plans ; ses fichiers sont gelés ensuite ; tout besoin
  commun passe par un micro-lot `COM-n`, un à la fois.
- Propriété des fichiers fixée par plan, d'après les imports directs au
  `ac3f0ead`. Deux dossiers mixtes partagés fichier par fichier :
  `components/food-observation/`, `components/physio-traitements/`
  (`FormulaireTraitement` et `ChampDatePeriode` vont au socle).
- Pages de suivi : une par plan, base `db` (collections `prealables`, `lots`,
  `journal`), lecture seule pour la page, écrites par la session via
  `ArtifactData`. Praticien
  https://claude.ai/artifact/7eak2jrm2wMLjAmYC7VZJz ; patient
  https://claude.ai/artifact/V7AVAR7WiyU64pgJxLeG8S. Privées.

## Fichiers modifiés

- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/` : `README.md`,
  `amendements.md`, `cadrage-revise.md`, `catalogue-revise.md`,
  `registre-textes.md`, `socle-commun.md`, `plan-praticien.md`,
  `plan-patient.md`.
- `changelog.d/2026-11-11-refonte-lien-etape2.md`, ce handoff.

## Validations exécutées

- Inventaires en lecture seule (deux sous-agents Explore) : 110 fiches du
  catalogue v2 ; libellés de navigation par couche, avec fichier:ligne.
- Textes « existants » du registre relus au code (`NavBar.tsx:110`,
  `portailProtocol.ts:32`, `checkin/route.ts:99, :108`,
  `cycleDeVie.ts:108`).
- Partage des fichiers entre portails relu par un script d'imports
  (scratchpad, non versé).
- Pages de suivi publiées, base remplie (15 et 16 documents), relue au
  niveau `interact`.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Q-E2-1 à Q-E2-5 et les acceptations (AM-1 à AM-8, textes du registre) attendent
  la réponse écrite du responsable.
- Imports indirects non suivis hors des deux dossiers mixtes.
- T-33 : décision éventuelle sur le titre de la compréhension non trouvée.

## Prochaine action exacte

Après les réponses : DOC-0 (décisions acceptées), puis COM-0 ; ensuite
lancer les deux sessions sur `plan-praticien.md` et `plan-patient.md`, en
mettant à jour les pages de suivi.

## Interdits encore actifs

- Aucun texte patient neuf sans acceptation mot pour mot ; aucun chiffre,
  compteur ni pastille côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification
  clinique, de questionnaire, de route, de garde ni de schéma.
- Production en lecture seule, et seulement sur demande ; aucune identité ni
  identifiant de dossier au dépôt.
