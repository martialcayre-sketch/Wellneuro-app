# Handoff — 2026-10-15 — D-281 §5 : migration du formulaire d'avant (PR 1 sur 2)

## Branche et état Git

- Branche `d281-formulaire-avant-migration`, depuis `origin/main` à
  `93f1243d` (#1457), worktree `d281-lot3-portail`.
- PR de migration seule : migration, contrat SQL, ligne CI, fragment
  changelog, ligne §8 du plan, ce handoff.

## Objectif

Préalable de la signature (étape 5 de D-281) : arbitrage du responsable du
2026-10-14 (D-281 §5) — un signalement du formulaire d'avant (« oui, lié au
programme », sans élément désigné) bloque la diffusion jusqu'à l'avis. La base
refusait tout avis sur un signalement sans rattachement : cette PR l'ouvre.
Migration demandée explicitement par le responsable le 2026-10-15.

## Décisions prises

- Deux fonctions de trigger remplacées (`CREATE OR REPLACE`), sans colonne,
  table ni index ; `schema.prisma` inchangé.
- Verdict accepté sur un signalement rattaché, ou lié à un programme du
  patient sans rattachement ; « impliqué » y désigne un élément de ce
  programme (même branche que « Je ne sais pas »).
- Revue `wn-reviewer` : GO, quatre P2 pris dans la même migration — mise à
  NULL du programme permise seulement s'il a disparu (effacement IDP2) ;
  insertion d'un signalement lié : programme du patient ; motif de contrat
  désambiguïsé ; trois cas ajoutés (mise à NULL directe, patient d'un
  signalement libre modifiable, « impliqué » en racine).

## Fichiers modifiés

- `web/prisma/migrations/20261014230000_saf_ei_verdict_formulaire_avant_v1/migration.sql`
- `web/prisma/checks/trust_aev_formulaire_avant_v1_negatif.sql`
- `.github/workflows/ci.yml` (ligne du contrat)
- `changelog.d/2026-10-15-d281-formulaire-avant-migration.md`
- `docs/claude/PLAN_WELLNEURO.md` (§8, ligne « D-281, formulaire d'avant »)

## Validations exécutées

- T3 complet vert deux fois (avant et après les P2 de la revue) : migrations
  sur base neuve, dérive schéma ↔ migrations « No difference detected »,
  contrats SQL du lot 2 et neuf, E2E.
- Constat de production en lecture par conteneur, agrégats seuls
  (one-off-5769, 2026-10-15) : un signalement, rattaché ; aucun du formulaire
  d'avant ; aucun ne vise le programme d'un autre patient.

## Problèmes ouverts

- Le CI de `main` sur `93f1243d` (#1457) est rouge sur un E2E de l'agenda du
  sommeil joué à 00 h 02 (Paris), étranger à #1457 : #1457 n'est pas déployée
  tant qu'un commit de `main` n'a pas un CI vert.
- Fil du jour et prévol comptés par statut ; désignation illisible à trancher
  (plan §8).

## Prochaine action exacte

1. CI vert, revue CodeRabbit sur la tête, merge.
2. Responsable : choisir le créneau, approuver `release-db` ; sentinelle
   `WN_RELEASE_DB_OK id=<run>` ; constat par conteneur (`migrate status`).
3. Seulement ensuite, PR 2 : route du verdict ouverte au formulaire d'avant,
   attente comptée dans la garde de diffusion, écran d'avis (élément en cause
   ou aucun), rien en pause au portail.

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant l'étape 5 et ses préalables.
- Aucun code consommateur avant la `release-db` constatée.
- Production en lecture seule par conteneur ; aucune identité réelle au dépôt.
