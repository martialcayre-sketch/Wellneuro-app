# Handoff — 2026-11-02 — Audit 3, lot Q3 quinquies : le dossier désactivé a son refus ; « Débloquer » grisé sur un suivi clôturé (D-427)

## Branche et état du dépôt

- Branche `fix/audit3-q3-quinquies-dossier-ferme`, partie de `origin/main`
  f5cbf461 (#1825, Q3 quater, mergée), `origin/main` fusionnée deux fois
  (97951315 puis d4d72d67, documentaires) — conflit de `docs/DECISIONS.md`
  résolu, D-427 en tête ; worktree `audit3-q3-quater`, session concurrente, cycle en
  `git`/`gh` direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.
- Essai `D-373` : PR déclarée « prête @<sha> », **non mergée** par cette
  session ; l'intégrateur merge. Questions de la liste commune :
  `20261102-1300-g` et `20261102-1301-g` (statut `repondue`, D-427).

## Objectif

Les deux restes de Q3 quater tranchés par le responsable le 2026-11-02 :
1. dossier désactivé : `refusDossierFerme` (`dossier_desactive`, texte
   existant) sur les trois routes d'assignation — `POST` et `PATCH
   /api/praticien/assignations`, `POST …/assignations/relance` ; les autres
   routes praticien restent en l'état ;
2. dossier, suivi clôturé (`FichePatientPanel`) : « Débloquer » grisé, et
   `MESSAGE_DOSSIER_CLOS` sous la ligne d'emblée, dans les blocs
   « corrections » et « échues ». Aucun texte neuf.

## Décisions prises

- D-427 (réservée par `wn-reserver-decision.mjs`), précise D-422 §2 :
  - §1 : les trois routes rendent `refusDossierFerme` ; la clôture prime
    (`phaseDossier`) ; la création ne répond plus 404 « Patient
    introuvable » pour un dossier désactivé (un dossier absent ou d'un autre
    praticien reste introuvable) ; l'ordre des refus et les gardes
    d'écriture de D-422 §2 ne changent pas ;
  - §2 : `suiviClos` lu sur la fiche du dossier ; bouton `disabled`, motif
    écrit sous chaque ligne et relié au bouton (`aria-describedby`) ; fiche
    non lue → bouton offert, la route refuse ; un dossier désactivé non clos
    garde le bouton, son refus s'écrit au clic.
- Type de `refusDossierFerme` resserré (`raison` = l'une des deux
  constantes) pour les réponses typées des routes ; appelants existants
  inchangés.

## Fichiers modifiés

- `web/src/app/api/praticien/assignations/route.ts` (+ test) — POST et
  `refusDeblocage`. **Fichier en CRLF sur `main`** : indexé par
  `git hash-object -w --no-filters` puis `git update-index --cacheinfo`.
- `web/src/app/api/praticien/assignations/relance/route.ts` (+ test).
- `web/src/lib/patient/cycleDeVie.ts` — type de retour seul.
- `web/src/components/FichePatientPanel.tsx` (+ test) — deux blocs.
- Docs : `docs/DECISIONS.md` (D-427),
  `changelog.d/2026-11-02-audit3-q3quinquies-dossier-ferme.md`, ce handoff.

## Validations exécutées

- Mutations (source restaurée après chacune), douze, toutes rougissent :
  POST revenu à « introuvable » sur `!actif` ; refus figé à « clos » dans
  POST, dans `refusDeblocage`, dans la relance ; bouton non grisé (bloc
  corrections, bloc échues) ; motif absent (chaque bloc) ; `suiviClos`
  toujours faux, toujours vrai ; `aria-describedby` retiré ; clôture qui ne
  prime plus dans `refusDossierFerme`. Après revue, deux de plus, rouges :
  dossier désactivé non clos grisé ; fiche non lue grisée.
- Revue `wn-reviewer` (diff puis commit, sans checkout ; un premier essai
  tombé sur une coupure réseau) : go, aucun bloquant.
  - corrigé : bancs « désactivé non clos, bouton actif » et « fiche
    illisible, bouton offert » ;
  - écarté : texte du 404 « email non présent/actif » devenu inexact — hors
    arbitrage, aucun texte neuf permis, inoffensif ;
  - écarté : `aria-describedby` sur un bouton `disabled` annoncé seulement en
    lecture — le motif est visible à côté ;
  - routé (problèmes ouverts) : `packs/assign` répond encore
    `patient_not_found` pour un dossier désactivé.
- T1 complet : code 0, joué seul après la fusion de `main` et les bancs de
  revue. Deux passages antérieurs rouges hors diff : une coupure réseau
  (banc du crochet de fraîcheur, 922 s) puis la charge machine (délai Vitest
  de l'agenda alimentaire, workers non démarrés, revue en parallèle).
- T2 `--fast` : rouge une fois sur un E2E WebKit étranger au diff
  (`mode-consultation-sans-chiffre.spec.ts:147`, tiroir non ouvert — même
  intermittence que celle du handoff H65 du 2026-11-01), puis code 0 au
  rejeu entier (Vitest : 15 650 passés, 40 sautés ; E2E : 303 passés,
  7 sautés).
- Fusions de `main` (D-424 #1828, D-425) : documentaires seulement ; conflit
  de `docs/DECISIONS.md` résolu à chaque fois, D-427 en tête.

## Problèmes ouverts

- Aucun reste d'arbitrage sur ce lot. Q2 de l'audit 3 revient avec
  l'audit 2.
- Dette relevée par la revue, non arbitrée, hors périmètre (« les autres
  routes restent en l'état ») : `POST /api/praticien/packs/assign`
  (`web/src/app/api/praticien/packs/assign/route.ts`) répond encore
  `patient_not_found` pour un dossier désactivé — même geste « assigner »,
  deux refus selon le chemin. À porter à la liste commune si le responsable
  veut l'aligner.

## Prochaine action exacte

Attendre le CI (`node scripts/wn-attendre-ci.mjs <N>`), la revue CodeRabbit
(sinon PR-Agent, D-393) sur la tête, un verdict par commentaire, puis
déclarer « prête @<sha> » avec `question 20261102-1300-g` et
`question 20261102-1301-g`. L'intégrateur merge et horodate le merge dans
les deux lignes.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373).
- Pas de migration ni de `schema.prisma`.
- Ne pas rouvrir l'audit 3 ni reposer Q3 quater ou Q3 quinquies.
