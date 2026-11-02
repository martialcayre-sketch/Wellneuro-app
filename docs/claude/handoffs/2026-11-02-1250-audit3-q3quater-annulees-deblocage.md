# Handoff — 2026-11-02 — Audit 3, lot Q3 quater : annulées hors du Fil et du bloc « échu », déblocage gardé (D-422)

## Branche et état du dépôt

- Branche `fix/audit3-q3-quater-annulees`, partie de `origin/main` b5862ee3
  (#1812, Q3 ter, déjà mergée) ; worktree `audit3-q3-quater`, session
  concurrente, cycle en `git`/`gh` direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.
- Essai `D-373` : PR déclarée « prête @<sha> », **non mergée** par cette
  session ; l'intégrateur merge. Questions de la liste commune :
  `20261102-0830-g` et `20261102-0831-g` (statut `repondue`, D-422).

## Objectif

Les restes de Q3 ter tranchés par le responsable le 2026-11-02 :
1. une assignation `Annulée` sort des cartes « En retard » du Fil et du bloc
   « échu » du dossier ;
2. `PATCH /api/praticien/assignations` refuse, avant toute écriture (409,
   avec motif), une annulée et une assignation d'un suivi clôturé — même
   refus et même message que la relance. Enjeu accepté : sur un suivi
   clôturé, une demande de correction ne se débloque plus sans rouvrir le
   suivi.

## Décisions prises

- D-422 (réservée par `wn-reserver-decision.mjs`), précise D-414 §1 :
  - §1 : `cartesAssignationsEnRetard` écarte `Annulée` ; la lecture
    `echeanceDepassee=1` ajoute `NOT statut = 'Annulée'` sans remplacer le
    filtre `statut` ; l'écran l'écarte aussi en défense ;
  - §2 : refus dans l'ordre de la relance (dossier, puis assignation) ;
    `updateMany` conditionné sur les deux gardes, sous le verrou du dossier
    (`verrouillerPatient`, même transaction), relecture sur zéro ligne ;
    le dossier affiche désormais le motif d'un refus sous la ligne.
- Aucun texte neuf : `MESSAGE_DOSSIER_CLOS`, le refus de l'annulée de la
  relance (désormais partagé, `MESSAGE_ASSIGNATION_ANNULEE` dans
  `lib/praticien/relanceAssignation.ts`), et les deux libellés du Fil
  (« Déblocage impossible. », « … le serveur n'a pas répondu. »). Rien n'a
  donc été soumis au responsable.

## Fichiers modifiés

- `web/src/lib/fil/cartes.ts` (+ test) — annulée écartée ; branche
  `Annulée` du statut retirée (devenue morte).
- `web/src/app/api/praticien/patients/route.ts` (+ test) — `NOT` sous
  `echeanceDepassee`.
- `web/src/app/api/praticien/assignations/route.ts` (+ test) — `include` de
  l'état du dossier, `refusDeblocage`, `updateMany` conditionnel sous
  verrou. **Fichier en CRLF sur `main`** et `.gitattributes` normalise en LF
  à l'indexation : il s'indexe par `git hash-object -w --no-filters` puis
  `git update-index --cacheinfo`, sinon le diff le réécrit en entier.
- `web/src/lib/praticien/relanceAssignation.ts`,
  `web/src/app/api/praticien/assignations/relance/route.ts` — texte du refus
  de l'annulée partagé, inchangé.
- `web/src/components/FichePatientPanel.tsx` (+ test) — motif du refus
  affiché (deux blocs), défense client sur l'annulée.
- Docs : `docs/DECISIONS.md` (D-422),
  `changelog.d/2026-11-02-audit3-q3quater-annulees-deblocage.md`, ce handoff.

## Validations exécutées

- Mutations (source restaurée après chacune), dix-sept jouées en quatre
  séries (quinze défauts distincts), toutes rougissent : second essai
  retiré ; verrou du dossier retiré ; annulée gardée au Fil ; `NOT` retiré ; défense client
  retirée ; annulée non refusée ; suivi clos non refusé ; ordre inversé ;
  `include` retiré ; écriture sans garde de statut ; sans garde du
  dossier ; `count` ignoré ; refus muet (bloc échues, bloc corrections) ;
  repli réseau muet.
- T1 complet avant revue : code 0. Après corrections de revue : T1 complet
  code 0 ; T2 `--fast` code 0 (Vitest : 15 634 passés, 40 sautés ; E2E :
  303 passés, 7 sautés).
- Revue `wn-reviewer` (diff non commité, sans checkout) : go, aucun
  bloquant.
  - corrigé : concurrence lecture/écriture du `PATCH` (`updateMany`) ;
  - corrigé : bancs désactivé, ordre des refus, bloc des corrections, repli
    réseau ;
  - corrigé : défense client sur l'annulée ;
  - écarté : message « Rouvrez le suivi » pour un dossier désactivé —
    l'arbitrage impose le message de la relance, qui a le même défaut ;
    routé vers la dette t11 (`refusDossierFerme`, `cycleDeVie.ts`) pour les
    deux routes ensemble ;
  - écarté : bouton « Débloquer » encore affiché sur un suivi clos — conforme
    à l'enjeu accepté, le clic dit le motif ; le masquer serait un écran non
    arbitré ;
  - écarté : état de refus non remis à zéro au changement de patient — clé
    par `idAssignation`, propre à un dossier.

- Revues sur la PR #1825 (tête bd2cd7c4) :
  - PR-Agent (CodeRabbit a sauté, moins de 10 étoiles) : « fichier entier
    réécrit » — **corrigé** : fins de ligne CRLF rendues à `route.ts` ;
  - Copilot : filtre relationnel sans le verrou de la clôture — **corrigé** :
    `verrouillerPatient` dans une transaction avant l'écriture, banc d'ordre.
- Revue PR-Agent sur 23007b1c (CodeRabbit en quota épuisé, D-393 §2) :
  - « Repli 404 trompeur » — **corrigé** : second essai borné, puis l'erreur
    technique existante ; deux bancs ;
  - « Décompte de preuves incohérent » — **corrigé** dans D-422 §3 et ici.

## Problèmes ouverts

Les deux restes ont été tranchés le 2026-11-02 par le responsable (liste
commune `20261102-1300-g`, `20261102-1301-g`, statut `repondue`), **hors de
ce lot** — un lot « Q3 quinquies », sans migration, D-xxx à réserver,
session neuve, après le merge de #1825 :
- dossier désactivé : `refusDossierFerme` (« Ce dossier est désactivé…
  Réactivez le dossier pour reprendre. », `dossier_desactive`) sur les
  **trois routes d'assignation** — création (`POST`), déblocage (`PATCH`),
  rappel (`relance`) ; les ~40 autres routes praticien restent en l'état ;
- dossier, suivi clôturé : « Débloquer » **grisé**, et `MESSAGE_DOSSIER_CLOS`
  écrit sous la ligne d'emblée, sans clic (deux blocs : corrections et
  échues). Aucun texte neuf.

## Prochaine action exacte

Attendre le CI (`node scripts/wn-attendre-ci.mjs <N>`), la revue CodeRabbit
(sinon PR-Agent, D-393) sur la tête, un verdict par commentaire, puis
déclarer « prête @<sha> » avec `question 20261102-0830-g` et
`question 20261102-0831-g`. L'intégrateur merge et horodate le merge dans
les deux lignes.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373).
- Pas de migration ni de `schema.prisma`.
- Ne pas rouvrir l'audit 3 ni reposer Q3 quater ; Q2 de l'audit 3 revient
  avec l'audit 2.
