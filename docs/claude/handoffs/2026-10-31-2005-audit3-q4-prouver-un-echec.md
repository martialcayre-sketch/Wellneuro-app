# Handoff — 2026-10-31 — Audit 3, lot Q4 : prouver un échec (D-398)

## Branche et état du dépôt

- Branche `fix/audit3-q4-echecs-traces`, partie de `origin/main` 4d4858fe
  (contient #1793 et #1794) ; worktree `j3-12e-ingestion`, session
  concurrente, cycle en `git`/`gh` direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.

## Objectif

Deuxième lot de l'audit 3 (e-mails patient contre traces), écart E4 :
1. Sur six chemins d'e-mail patient, une exception à la préparation du
   transport ou du gabarit ne laissait aucune trace. Elle doit écrire
   « Erreur » au journal `correspondances_patient`, comme un refus SMTP.
2. L'e-mail de signalement au praticien doit être tracé au dossier.

## Décisions prises

- Aucune décision nouvelle : D-398 §1 (puce Q4) couvre le lot.
- Textes validés mot pour mot par le responsable le 2026-10-31 :
  - titre du panneau : « E-mails du dossier » ;
  - description : « Historique des e-mails envoyés par Wellneuro : au
    patient, et à vous au sujet de ce dossier. Le contenu des messages et
    les adresses ne sont pas recopiés dans ce journal. » ;
  - état vide : « Aucun e-mail journalisé pour l'instant. » ;
  - erreur : « Les e-mails du dossier n'ont pas pu être lus. Ce n'est pas
    un dossier sans envoi. » ;
  - objet de la trace : « Signalement déposé — courriel au praticien ».
- Le panneau n'affiche aucun nom de type, seulement l'objet. Il n'y avait
  donc pas de nom de type à valider. Le type `signalement_praticien` reste
  en base.
- Choix de mise en œuvre, au plus près de l'alerte de sécurité :
  - la trace du signalement porte la sorte (`referenceType`) et
    l'identifiant du signalement (`referenceId`), sans clé de source ;
  - sans SMTP ou sans adresse, elle est écrite « Non envoyé » ;
  - le log `console.error` est masqué par `sanitizeAuditError` (revue).
- Conséquences des corrections :
  - rappel : un gabarit qui lève rend 200 `statut: 'Erreur'` au lieu d'un
    500, et la trace porte maintenant le motif ;
  - bilan : un transport qui lève écrit l'audit et le journal, puis répond
    502.

## Fichiers modifiés

- Routes :
  - `web/src/app/api/praticien/assignations/route.ts` ;
  - `praticien/packs/assign/route.ts` ;
  - `praticien/file-envoi/envoyer/route.ts` ;
  - `patient/submit/route.ts` ;
  - `praticien/assignations/relance/route.ts` ;
  - `praticien/booklet/route.ts` ;
  - `portail/trust/signalement/route.ts`.
- Bibliothèques : `web/src/lib/trust/notification.ts` ;
  `web/src/lib/correspondance/patient.ts` (type `signalementPraticien`).
- UI : `web/src/components/correspondance/CorrespondanceMedecinPanel.tsx`.
- Tests :
  - les six `route.test.ts` des chemins ;
  - `portail/trust/signalement/route.test.ts` ;
  - `CorrespondanceMedecinPanel.test.tsx` ;
  - nouveau `web/src/lib/trust/notification.envoi.test.ts`.
- Clôture : `changelog.d/2026-10-31-audit3-q4-prouver-un-echec.md`, ce
  handoff.

## Validations exécutées

- Bancs ciblés verts : 164 tests, puis 322 après les retouches de revue.
- Mutation : les sept sources rendues à `HEAD`, avec les bancs neufs.
  Résultat : 13 cas en échec, tous neufs, et 100 verts. Sources restaurées
  ensuite.
- T1 rapide vert ; T1 complet (`npm run check`) vert.
- T2 (`npm run test:worktree -- --fast`, sortie redirigée) vert, code 0 :
  Vitest 15 456 passés, 30 sautés ; E2E 303 passés. Joué avant les
  retouches de revue, qui portent sur un log masqué, deux retours chariot et
  un test ; les bancs touchés ont été rejoués après (322 verts), puis T1
  complet.
- Revue `wn-reviewer` (diff non committé, sans checkout) : **GO**.
  - Corrigés :
    - deux lignes d'import passées en CRLF par accident
      (`booklet/route.ts`, `packs/assign/route.ts`) ;
    - log du signalement masqué ;
    - compte du changelog recalé.
  - Écartés, avec motif :
    - gabarit qui lève, testé sur le rappel seul : sur les autres chemins,
      le déplacement est le même et le cas « transport » est couvert ;
    - signalement retenu par D-328 sans ligne : voulu, rien n'est tenté.

## Problèmes ouverts

- Routé au lot Q3 (cadence des relances) : `envoisPrecedents` compte toutes
  les lignes, `Erreur` comprise. Après un échec, qu'il vienne du gabarit ou
  de SMTP, le praticien reçoit un 429 alors que rien n'est parti. Ce n'est
  pas nouveau pour SMTP.
- Non traité, hors du périmètre demandé : `buildBookletHTML`
  (`booklet/route.ts`, avant les gardes) reste hors du bloc. Une exception
  à cet endroit rend 500 sans trace.

## Prochaine action exacte

PR → CI (`wn-attendre-ci.mjs`) → `@coderabbitai review` sur la tête (ou
PR-Agent, D-393) → tri des commentaires → étape 7 bis et
`wn-sonde-release-db.mjs <N>` = 0 → merge. Ensuite : page de l'audit en v6
(E4 corrigé, lot Q4 livré le 2026-10-31) et mise à jour de la mémoire
`audit-emails-patient-2026-10-30` ; puis `/clear`. Le lot Q3 suit, dans sa
propre session.

## Interdits encore actifs

- Aucune écriture en production.
- Aucun identifiant de dossier, nom ou e-mail dans le dépôt, sur la page ou
  dans les commandes.
- Pas de migration ; ne pas toucher au lot Q3.
- Constat D-353 §5 réservé au 1er au 7 novembre.
