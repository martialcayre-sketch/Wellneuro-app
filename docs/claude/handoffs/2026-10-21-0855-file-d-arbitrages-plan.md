# Handoff — File D : arbitrages du 2026-10-21 versés au plan

## Branche et état du dépôt

- Branche `docs/file-d-arbitrages-2026-10-21`, worktree `file-d1-suite`, partie
  de `origin/main` à a89ab28c (#1619). PR #1620. Sans migration, sans
  drapeau ; seul fichier de `web/` touché : un commentaire de
  `vocabulaire.ts`.

## Objectif

Verser au dépôt les arbitrages de la séance file D du 2026-10-21 : plan,
registre RGPD, commentaire du régime des chemins sortants, ligne de base du
rayon Patients ; inscrire les lots de code tranchés, sans les coder.

## Décisions prises

- Aucune `D-xxx` neuve : chaque ligne renvoie à un arbitrage du responsable du
  2026-10-21 ou à une décision existante (D-113 §8, D-283 §2, D-299).
- Lignes D.4 du plan complétées par « fait le … » ou « tranché le … », sans
  effacement ; gel de D/49 ajouté au §6 ; lots D/42, D/22, D/23, D/41, D/5
  ajoutés au §8 ; correctif de F76 passé en file A.
- Le constat « destinataire non déclaré » d'OpenAI reste au registre RGPD,
  en historique daté, soldé par D-299.
- Ligne de base du rayon Patients : seule la ligne `nir` retirée, les six
  autres à l'identique ; reprise du 2026-10-21 écrite dans l'en-tête.

## Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` ; `docs/DOSSIER_RGPD.md` ;
  `web/src/lib/documents/vocabulaire.ts` (commentaire) ;
  `docs/claude/campagnes/2026-09-16-rayon-patients/CONSTAT_LIGNE_DE_BASE.sql`.
- `changelog.d/2026-10-21-file-d-arbitrages-plan.md`, SESSION_LOG, ce handoff.

## Validations exécutées

- `npm run check:rapide` et `npm run check` verts.
- Lectures de production en conteneur détaché, transaction en lecture
  seule, agrégats : ligne de base rejouée (dossiers 34, consultations 41,
  fiches 28, anamnèses 28, avec adresse 0, avec médecin 0) ; recherche du
  dossier d'essai de k04 (aucune adresse en `@wellneuro.fr`).

## Problèmes ouverts

- k04 : le dossier d'essai du responsable n'est pas en `@wellneuro.fr` ; il
  reste à le désigner.
- Lots inscrits non codés : F76 et D/42 (file A, chacun avec sa D-xxx), D/22
  et D/23 (file B), D/41 et D/5 (outillage ; D/5 après la déconnexion du
  connecteur Supabase).

## Prochaine action exacte

CodeRabbit sur la tête, merge ; lignes de la page de suivi de la file D
passées à « fait » avec #1620.

## Interdits encore actifs

- Un merge à la fois ; aucun nom ni e-mail de dossier réel dans le dépôt ;
  rien de clinique sans D-xxx ; gestes du responsable non faits à sa place
  (P5 v0.3, WN_G4_LIEN_MAGIQUE, DSN Sentry, connecteur Supabase).
