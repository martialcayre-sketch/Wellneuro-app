# Handoff — 2026-10-10 — D-275 §2 : producteur SAF-QUEST-01 et lettre étendue (LOT-3 sur 3)

## Branche et état Git

- Copie principale, branche `feat/securite-producteur-questionnaire` partie
  d'`origin/main` 0c82f89a (#1374 mergée, migration appliquée et constatée).
  Tout est indexé ; commit et PR suivent ce handoff. Aucune migration.

## Objectif

Toute réponse autre que « non » aux quatre questions sur le suicide (BDI B7,
MADRS Q010, SIGH-SAD-SA SIGH_Q019, IDTAS-AE IA9) produit un constat de rang
`adressage`. Ce constat suspend priorité et protocole jusqu'à une lettre
d'adressage qui le couvre.

## Décisions prises

- Table `SAF-QUEST-01` **signée le 2026-10-10** sur déclaration du responsable,
  après la surface `docs/claude/campagnes/SURFACE_RELECTURE_SAF_QUEST_01_2026-10-10.md`
  (D-195). SHA `eb350485…`.
- BP-01 (D-251) : le fichier signé ne porte que des codes. Les options sont lues
  au catalogue, les textes vivent dans `safetyQuestionnaireTextes.ts`. Le contenu
  haché est identique au bit près, et le SHA est inchangé.
- La règle n'est jointe à la revue **que sur une réponse positive**. Sinon,
  toutes les cartes diffusées seraient dérivées et tous les écrans patients
  éteints au déploiement.
- A2 maintenu (responsable) : une réponse illisible entre dans l'empreinte.
- Constat identifié par passation, question et valeur.
- Lettre : version `safety-signals-questionnaire-v1`, SHA des deux tables. Une
  lettre d'anamnèse seule reste inchangée.
- Sans porteuse, la route rend un refus explicite `sans_consultation_porteuse`.

## Fichiers modifiés

- Neufs : `clinical/safetyQuestionnaireV1.ts`, `clinical/safetyQuestionnaireTextes.ts`,
  `clinical-engine/safetyQuestionnaire.guard.test.ts`, la surface, le fragment changelog.
- Producteur et partition : `clinical-engine/safetyFindings.ts`.
- Feuille et couvertures : `safetyFindingSource.ts`, `adressagesSignalAlertePrisma.ts`.
- Entrées de la chaîne : `chaineC1.ts`, `runtimeFromPrisma.ts`, le cockpit,
  `verifierChaineC1.ts`, `rejeuCarteDecision.ts`.
- Fil : `signauxSecurite.ts`, `cartes.ts`.
- Lettre : `courrierAdressage.ts`, route `adressage/courrier`,
  `ancrageCorrespondance.ts`, `documents/types.ts`, `DocumentComposer.tsx`.
- Écran : `ClinicalRuntimeSection.tsx`.
- Documentation : `schema.prisma` (commentaire `///` seul), D-275 (puce LOT-3),
  `FEATURE_FLAGS.md`, `MATRICE_CONSOMMATION.md`.

## Validations exécutées

- T1 complet vert.
- T3 vert sur l'état final : 704 fichiers Vitest (12 121 cas), SIIN 26 fichiers
  (1 664 cas), 243 E2E.
- Deux mutations rougissent le banc neuf : levée réservée à l'anamnèse, et règle
  jointe à toutes les revues.
- `wn-reviewer` : GO, aucun P0 ni P1. P2-1 (commentaire et banc illisible),
  P2-2 (A6 ajouté à la surface) et P2-3 (refus sans porteuse) sont corrigés.
- Production (conteneur, agrégats) : une seule passation sur les quatre
  questionnaires, valide, réponse « non ». Aucun dossier bloqué ni dérivé.

## Problèmes ouverts

- P2-3 : le geste reste proposé sans porteuse. Le refus est désormais juste,
  mais le bouton reste visible.
- P2-4 : `depuis` du Fil vaut la date de la porteuse, pas celle de la passation.
- Tests suggérés non écrits : parité de route cockpit/Fil sur une passation
  positive, empreinte de référence figée.

## Prochaine action exacte

Commit, PR, `wn-attendre-ci`, Codex par le responsable, merge, déploiement
constaté. Puis constat par conteneur : nombre de dossiers avec un constat
`safety:questionnaire:` (attendu 0).

## Interdits encore actifs

- Pas de re-signature ni de retouche des textes ou options sans nouvelle surface
  et nouvelle déclaration.
- Pas d'auto-merge ; un merge à la fois, déploiement constaté.
- Aucune donnée ni aucun identifiant de dossier réel dans le dépôt.
