# Handoff — ai, code de la lecture datée (D-297)

## Branche et état Git

`feat/ai-lecture-datee-code` (worktree `cc8-migration`), partie de `origin/main` à 0c52fbee. Seconde PR du lot ai, après la migration #1547 (89f7e0d4), appliquée et constatée.

## Objectif

Livrer le code de D-297 : la première ouverture d'un document remis est datée du jour (par la base), le patient en est averti sur chaque page qui date, le praticien lit « Lu le … » au dossier.

## Décisions prises

- Arbitrages du responsable du 2026-10-18, consignés en amendement de D-297 : encart praticien « Documents remis » (phase « Patient ») ; protocole daté aussi ; phrase en tête, avant le document.
- La phrase est servie par `AvisLectureDatee` (texte unique dans `lib/portail/lectureDatee.ts`), sous la même condition que la consignation : fiche et courrier quand le texte est servi, protocole au-dessus du bouton de détail, bilan et synthèse en tête de page.
- `POST /api/portail/lectures` envoie `luLe: new Date()` ; le trigger la remplace par le jour de Paris de la base. Doublon `P2002` : rien n'est écrit.
- Route `GET /api/praticien/documents-remis` : session, format, appartenance journalisée, puis lectures sur trois colonnes, sans compte. Une version non lue n'a pas de libellé.

## Fichiers modifiés

- Neufs : `web/src/lib/portail/lectureDatee.ts` (+ test, + garde), `web/src/components/patient/AvisLectureDatee.tsx`, `web/src/app/api/praticien/documents-remis/route.ts` (+ test), `web/src/components/patient-cockpit/DocumentsRemisPanel.tsx` (+ test).
- Modifiés : pages bilan et comprehension du portail, `FicheRemiseLecture.tsx`, `CourrierMedecinLecture.tsx` (+ test), `PatientCompanionHome.tsx` (+ test), `textesMesEchanges.ts`, `MesEchangesJournal.tsx` (+ test), `mesEchanges.ts`, `api/portail/lectures/route.ts` (+ test), `FichePatientPanel.tsx` (+ test, regex resserrée), `portailLecturesPatient.guard.test.ts`.
- Docs : `docs/DECISIONS.md` (amendement D-297), `docs/DOSSIER_RGPD.md`, `docs/claude/PLAN_WELLNEURO.md` (H51), `changelog.d/2026-10-18-ai-lecture-datee-code.md`.

## Validations exécutées

- Bancs ciblés verts (route portail 56, route praticien, panneau, lectureDatee, gardes, Mes échanges, courrier, compagnon).
- T1 rapide vert. T1 complet et T2 (`--fast`) : voir la PR. Matrice de consommation régénérée (`wn-matrice-consommation.mjs --markdown`, après indexation des fichiers neufs).
- Revue `wn-reviewer` (P1) : go, aucun P0 ni P1. Corrigés : bouton « Réessayer la lecture des documents remis », garde des appelants élargie (import, guillemets, `sendBeacon`), ordre de l'avis vérifié sur bilan et synthèse, bancs de rendu de la fiche, réponse de la route limitée à six champs, commentaire sur la base sans trigger. Documentés dans l'amendement : « remis » = geste du praticien ; consignation du bilan et de la synthèse au montage (dette routée à H51).

## Problèmes ouverts

- Dette routée (H51) : le bilan et la synthèse consignent leur lecture au montage de la page, même si le document ne s'affiche pas ; à consigner sur le rendu réussi, comme la fiche.
- Constat du premier jour écrit en production, sur un dossier de test, par identifiant et par conteneur : à faire après le déploiement.
- Écarts routés sans correctif (antérieurs) : garde d'âge absente du POST check-in et du compagnon (D-284) ; fenêtre de la ligne de suivi fermée environ 24 h entre deux points.
- Avant ACT-3 : relire avec le responsable les deux micro-textes de « Mes échanges » et la limite « protocole indisponible ».

## Prochaine action exacte

CI vert et revue CodeRabbit sur la tête → merge `--match-head-commit` → déploiement constaté → lecture par conteneur d'une ligne `portail_lectures_patient` datée sur un dossier de test (par identifiant) → mise à jour de la page de suivi de la file C.

## Interdits encore actifs

- Aucune date écrite depuis une page qui ne sert pas la phrase (§4) ; aucun rattrapage ; aucun compte, alerte, relance ni carte du fil fondés sur la date ; aucune IA ne la lit (§5).
- `WN_PORTAIL_MES_ECHANGES` reste éteint jusqu'à ACT-3.
- Aucune règle clinique ni seuil ; fixtures neutres ; production lue par conteneur seulement.
