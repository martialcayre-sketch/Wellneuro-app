# Handoff — t72, D-491 : revue de tête, fixture E2E et texte de suspension (suite du handoff de 16:57)

## Branche et état Git

- Branche `feat/t72-arrets-contradictions-conflits-admissibilite`, PR #1993.
- Têtes : 8a1e3ae1 (première revue), e8eb0c45 (fixture E2E), 23bf24d5 (texte), puis ce handoff.

## Objectif

Inchangé : dette t72 (§8), D-491. Ce fragment complète celui de 16:57 après la revue de tête.

## Décisions prises

- Passe Codex P0 du responsable : ACCEPTER @8a1e3ae1, consignée sur la PR. Pour la nouvelle tête : pas de
  nouvelle passe complète, contre-vérification ciblée du diff 8a1e3ae1..tête (fixture, assertion, texte).
- PR-Agent (diff compressé, code 1) : deux constats écartés avec motif (fragment présent ; drapeau `'1'`).
- CodeRabbit sur 8a1e3ae1, un P2 : « … restent proposées » promettait trop (dejaRepondu, écartement).
  Arbitrage 20261111-1825-a : « Elle ne retire donc aucune exploration. », deux motifs ; D-491 §3.3, §6, §11.
- CI de 8a1e3ae1 rouge sur la seule preuve visuelle de l'onglet Trajectoire : base E2E sans corpus ⇒
  STOP-STR suspendue. `globalSetup` pose les claims des trois tables admissibles
  (`poserClaimsTablesCliniquesAdmissibles`, factorisé avec la biologie en `poserCouplesDeFixture`) ; le test
  visuel vérifie l'absence de suspension (lisible sur le Mac).

## Fichiers modifiés (depuis 8a1e3ae1)

- `web/e2e/helpers/db.ts`, `web/e2e/globalSetup.ts`, `web/e2e/visual.spec.ts`
- `web/src/components/patient-cockpit/OrientationPanel.tsx` (+ test), commentaire de `orientationService.ts`
- `docs/decisions/D-491.md`

## Validations exécutées

- T3 complet vert sur 8a1e3ae1 ; T2 vert sur e8eb0c45 puis sur 23bf24d5 (Vitest 16 765, E2E 357, 0 échec).
- `check:rapide` vert sur chaque tête.
- Le job e2e du CI s'était bloqué 47 min sur l'installation de Playwright : run annulé, job relancé (pas
  un rouge WebKit).

## Problèmes ouverts

- CI sur la tête finale ; revue CodeRabbit (1 par heure) ou de substitution sur la tête finale.
- Contre-vérification Codex ciblée (bloc remis au responsable).
- `wn-revue-copilot.mjs --quota` échoue (code 2) alors que l'appel GitHub passe à la main : hors lot.

## Prochaine action exacte

1. CI à 0 (`wn-attendre-ci`), revue CodeRabbit sur la tête, verdict à chaque constat ; réponse au
   commentaire en ligne 4541014520 (corrigé).
2. Verdict Codex ciblé, puis « prête @<sha> » en commentaire.
3. Après merge : release-db, constat conteneur (D-491 §9), t72 → fait, questions 1552-a à 1555-a et 1825-a
   → close. Puis t71 (convergence à trancher, D-491 §7 ; module `admissibiliteClaims.ts`).

## Interdits encore actifs

- Pas de merge par la session ; une seule release-db en attente (#1976 ouverte, migration H59).
- Pas de migration ni de `schema.prisma` ; aucune re-signature.
- Aucune identité réelle ; prod en lecture par `scalingo run -d` seulement.
- Pas de pull/merge/rebase automatique ; vérifier la branche avant chaque commit.
- Ne jamais relancer un rouge WebKit du CI ; ne pas toucher à t65, t74, t75.
