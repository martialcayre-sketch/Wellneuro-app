# Handoff — 2026-10-14 — D-281 étape 4, PR 2 : la garde de diffusion (F66)

## Branche et état Git

`d281-lot4-pr2-diffusion`, worktree `.claude/worktrees/d281-lot3-portail`,
rebasée sur `origin/main` (44e2a60b) par arbitrage du responsable (commit
puis rebase, autorisé pour tout le lot). Un commit de lot ; PR ouverte avec
ce handoff. Aucune migration.

## Objectif

Seconde PR de l'étape 4 de `D-281` : règle amendée (l'attente de l'avis
bloque la diffusion seule), garde de diffusion, banc de cas fictifs, texte de
l'avis rendu au portail, compteur `nonTraites` du panneau.

## Décisions prises

- Producteur de la règle livrée (`construireFindingsEffetIndesirable`) : plus
  aucun constat ; signé, une limitation pour les signalements ouverts sans
  rattachement. Sortie non signée identique : aucune empreinte de carte ne
  bouge. `version` de la règle inchangée (elle change à la signature).
- Garde dans le POST de diffusion, avant toute écriture : attente =
  signalement rattaché sans avis en tête de chaîne, statut ignoré, toute
  version visée ; refus 409 `effet_indesirable_en_attente` qui nomme les
  signalements par date de dépôt.
- SHA de signature : conduite réécrite, trois textes patient, statuts ouverts.
- **Arbitrage du responsable à la revue** (D-281 §5) : le formulaire d'avant
  (« oui » au programme sans élément) bloque aussi la diffusion. La base
  refuse tout avis sur ces signalements (trigger du lot 2) : migration en PR
  séparée, puis code, **avant la signature**. Cette PR ne les bloque pas
  encore (bloquer sans avis possible enfermerait le dossier).
- Fil du jour et prévol copilote encore comptés par statut : routés au plan
  (arbitrage du responsable).

## Fichiers modifiés

- `web/src/lib/clinical/safetyEffetIndesirableV1.ts`,
  `web/src/lib/clinical-engine/safetyFindings.ts`,
  `effetsIndesirablesPrisma.ts` (`rattachement` lu), `chaineC1.ts`
  (commentaire), `evaluerAbstentionImporteurs.guard.test.ts`,
  `safetyEffetIndesirable.guard.test.ts` (réécrit).
- `web/src/lib/trust/pauseEffetIndesirable.ts` (`TEXTE_PAUSE_AVIS_RENDU`,
  `signalementsEnAttente`, `messageDiffusionEnAttente`),
  `pauseEffetIndesirableServeur.ts` (`signalementsEnAttenteDuDossier`), leurs
  tests, `bancCasFictifsD281.test.ts` (neuf).
- `web/src/app/api/praticien/protocoles/diffusion/route.ts` (+ test),
  `web/src/app/api/praticien/trust/route.ts` (+ test du compteur).
- `web/src/components/patient-companion/PatientCompanionHome.tsx` (+ test).
- `docs/DECISIONS.md` (D-281 §2 b annoté, §5 arbitrage),
  `docs/claude/PLAN_WELLNEURO.md` (F66, §8 : trois lignes neuves),
  `changelog.d/2026-10-14-d281-lot4-garde-diffusion.md`, `SESSION_LOG.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert sur l'état final.
- T2 (`test:worktree -- --fast`) : premier passage rouge sur le garde des
  importeurs d'`evaluerAbstention` (la règle n'en parle plus — liste
  corrigée) ; second passage vert : 12 583 tests unitaires, 271 E2E, 3 sautés.
- Revue `wn-reviewer` : GO ; P1-1 remonté en arbitrage (ci-dessus), P1-2
  (changelog faux sur le compteur) corrigé ; P2 corrigés : dates répétées,
  statuts hors SHA, §2 b périmé ; tests ajoutés (branche fiches, fail-closed
  serveur). P2 restants routés ou acceptés : fenêtre de concurrence entre
  lecture et écriture (millisecondes, l'attente bloque la suivante), plafond
  de 100 de la file TRUST.

## Problèmes ouverts

- Formulaire d'avant : migration + code avant la signature (§8).
- Désignation illisible au dépôt : capturée sans programme, ne bloque rien
  (§8, à trancher).
- Fil du jour / prévol copilote comptés par statut (§8).
- Restes de l'étape 3 inchangés : programme « indisponible » et actions non
  fermes désignables ; surfaces qui ignorent la pause ; aucun test
  d'intégration du trigger contre PostgreSQL réel.

## Prochaine action exacte

CI par `node scripts/wn-attendre-ci.mjs <N>` → trois sorties de revue
CodeRabbit lues, verdict par commentaire → merge (`--match-head-commit`) →
déploiement constaté. Puis, sur demande explicite du responsable, la
migration du formulaire d'avant (PR seule, release-db).

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant l'étape 5 et ses préalables, dont
  le formulaire d'avant.
- Textes du §4 mot pour mot (banc qui relit `DECISIONS.md`).
- Aucune surface neuve pour un dossier mineur ou sans date (rien en pause
  pour le formulaire d'avant).
- Aucune migration sans demande explicite.
