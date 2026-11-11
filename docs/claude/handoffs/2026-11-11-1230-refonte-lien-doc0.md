# Handoff — 2026-11-11 — Refonte Lien / Empreinte, DOC-0 : décisions D-481 à D-488 et A5-R3

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc0`, créée depuis `origin/main`
  (`a1179a51`, merge de #1984) dans le worktree `wt-refonte-doc0`.
  Documentation seule. À déclarer « prête @<sha> » pour l'intégrateur après
  CI et revue de bot.
- Numéros D-481 à D-488 réservés par `wn-reserver-decision.mjs --nombre 8`
  (références `refs/tags/reserve/D-481` à `D-488`).
- Checkout principal non touché.

## Objectif

Lot DOC-0 du socle de la refonte : inscrire au registre ce que le
responsable a validé le 2026-11-11 (« Je valide ce bloc ») : Q-E2-1 à
Q-E2-5 en option (a), AM-1 à AM-7 tels que rédigés, AM-8 sans objet, tous
les textes du registre mot pour mot sauf T-34, refusé avec maintien du lien
et de la destination actuels.

## Décisions prises

- Une décision par amendement accepté (D-482 à D-487), une pour le cadre
  (D-481 : identité, deux plans, sans drapeau neuf, prototypes, feuille
  « Plus »), une pour les textes et Q-E2-5 (D-488).
- AM-6 s'inscrit comme A5-R3 au registre des frontières, comme A5-R1 et
  A5-R2, sans numéro propre ; D-481 §1 l'adopte.
- Textes des amendements recopiés mot pour mot ; seuls les renvois internes
  du dossier (AM-n, `README.md` §4) sont remplacés par les numéros.
- T-33 : aucune décision ne fixait le titre remplacé (D-168, D-169, D-251
  visent « Ce que j'ai compris de vous », un autre texte).
- Amendements portés aussi dans D-442 (bouton « Menu » qui reparaît), en
  plus de D-324, D-447 et D-460.

## Fichiers modifiés

- `docs/decisions/D-481.md` à `D-488.md` (neufs) ;
  `docs/decisions/D-324.md`, `D-442.md`, `D-447.md`, `D-460.md` (paragraphe
  d'amendement en fin de fichier).
- `docs/claude/REGISTRE_FRONTIERES.md` (A5-R3).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/` : `README.md`,
  `amendements.md`, `registre-textes.md` (bandeaux d'acceptation),
  `catalogue-revise.md` (U38), `plan-patient.md` (T-34 refusé).
- `changelog.d/2026-11-11-refonte-lien-doc0.md`, ce handoff.

## Validations exécutées

- Renvois `[[D-xxx]]` des fichiers touchés : tous présents dans
  `docs/decisions/`.
- `node scripts/wn-decisions.mjs D-481` à `D-488` : lisibles.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Aucun du lot. Les pages de suivi sont mises à jour (préalables tranchés,
  DOC-0 en cours).

## Prochaine action exacte

Après le merge : COM-0 (fondation Lien), dans un worktree neuf, selon
`socle-commun.md` ; puis les deux sessions PRA et PAT.

## Interdits encore actifs

- Aucun texte hors de D-488 ; aucun chiffre, compteur ni pastille côté
  patient ([[D-333]]).
- Aucun drapeau posé ou retiré sans demande explicite ; aucune modification
  clinique, de questionnaire, de route, de garde ni de schéma.
- Production en lecture seule, et seulement sur demande ; aucune identité ni
  identifiant de dossier au dépôt.
