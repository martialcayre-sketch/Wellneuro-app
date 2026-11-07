# Handoff — H98 : graduation de la convergence DC-29 (D-455)

## Branche et état Git

`h98-convergence-dc29`, worktree `.claude/worktrees/h98-convergence`,
rebasée sur `origin/main` 2e788656 (arbitrage du responsable : rebase après
T3). Commits du lot : fd22673a (feat), 33bcead1 (revue `wn-reviewer` et
re-signature), puis le commit de clôture (date de signature de
`docs/FEATURE_FLAGS.md`, ce handoff). **Chemin clinique, sans migration** :
la `release-db` est déclenchée et attend l'approbation du responsable.

## Objectif

Fiche H98 (file A, ligne r5_10) : produire les constats `CONVERGENCE` par
besoin sous `web/src/lib/clinical/`, les afficher au cockpit, les verser dans
les vigilances de la synthèse (consigne `synthese-v31`), re-signer
`ORIENTATION_RULES_V1`, déclarer « prête @sha » sans merger.

## Décisions prises

- D-455 écrite (réservée par `wn-reserver-decision.mjs`). Elle porte les
  arbitrages du 2026-11-07 : importance fixe `useful_not_urgent` ; une zone
  atteinte par plancher ne compte pas ; les conditions visibles sans compter
  vont dans la carte du besoin exploré ; synthèse en lignes seules plus
  l'interdit v31 ; « non résolue » tue sur une convergence au cockpit ; une
  limite propre au besoin 1.
- D-455 §3 amende explicitement D-450 §4 : la restitution passe par
  l'assemblage déterministe, avec conservation intégrale du constat. Le
  modèle ne reçoit pas le constat.
- Textes validés par le responsable. Cette validation ne vaut ni attestation
  du rendu des fixtures ni attestation de la re-signature.
- Re-signature attestée par le responsable : `shaPerimetre` 16517749…,
  `dateValidation` 2026-11-07. L'empreinte couvre
  `{ regles, grilles, fenetres, convergence }`. Contre-épreuve : sans le
  terme `convergence`, on retrouve a8630112…, la signature du 2026-11-04.
- Amendements datés sous D-443, D-450, D-453 et D-103 ; « Portée » de DC-29
  réécrite.

## Fichiers modifiés

- Code :
  - `web/src/lib/clinical/convergenceV1.ts`, `convergenceEngine.ts` (neufs) ;
  - `orientationEngine.ts` (extraction de `evaluerDeclencheursDeRegle`) ;
  - `orientationRulesV1.ts` ;
  - `contradictionFinding.ts`, `contradictionsEngine.ts` ;
  - `contradictionsService.ts`, `orientationService.ts` ;
  - `clinical-engine/preconditionsT0Prisma.ts`, `synthese/generation.ts` ;
  - `lib/anthropic.ts` (v31) et `lib/documents/depuisSynthese.ts` ;
  - `components/patient-cockpit/MissingDataPanel.tsx`.
- Bancs : leurs tests (dont `preconditionsT0Prisma.test.ts` et
  `promptConvergence.guard.test.ts`, neufs), plus
  `scripts/specs-drapeau-ali01.test.mjs` (allowlist motivée).
- Docs : `docs/decisions/D-455.md`, D-443, D-450, D-453, D-103 ;
  `CONSTITUTION_CLINIQUE.md` ; `docs/FEATURE_FLAGS.md` ;
  `changelog.d/2026-11-07-d455-graduation-convergence-h98.md` ;
  `docs/claude/plan-journal/H98/2026-11-07-01-graduation-livree-d455.md` ;
  ce handoff.

## Validations exécutées

- Vitest ciblé (orientation, convergence, contradictions, T0, prompts,
  documents, cockpit, signature) : vert. Les 239 bancs d'orientation passent
  sans retouche.
- Revue `wn-reviewer` :
  - P1-1 (lignes `CONV` parties au médecin) corrigé ;
  - P1-2 (épingle `corpusActif`) corrigé ;
  - re-revue GO.
- T3 avant le rebase : un seul rouge,
  `verrousSignatureDocumentes.guard.test.ts` (date de `FEATURE_FLAGS.md`).
  Corrigé dans le commit de clôture. T1 et T3 rejoués après : voir la PR.

## Problèmes ouverts

- Panne couplée : la convergence se calcule dans le même appel que la
  discordance. Une exception emporte les deux (D-455 §7).
- Feuilles d'âge et d'alimentation : un banc refuse qu'elles comptent.
  Leur rattachement reste une décision à prendre.
- `MODÉRÉE` et `FORTE` sont atteignables par le type, mais aucun flux actuel
  ne les produit (une seule famille AUTO et une seule ANAMNÈSE aujourd'hui).

## Prochaine action exacte

1. CI de la PR en tâche de fond (`node scripts/wn-attendre-ci.mjs <N>`).
2. Revue CodeRabbit sur la tête, sinon PR-Agent, sinon `wn-reviewer` ; un
   verdict par commentaire, commentaires en ligne compris.
3. Commentaire « prête @sha ».
4. Après le merge par l'intégrateur :
   - approbation de la `release-db` par le responsable ;
   - déploiement constaté par conteneur `scalingo run -d` ;
   - niveaux par besoin en agrégats masqués (1 à 4 masqués), comparés à
     D-453 §7.
5. Ligne r5_10 de la page de la file A passée à « fait ».

## Interdits encore actifs

- Pas de merge par cette session (D-454).
- Ni migration ni `schema.prisma`.
- Aucune écriture en production.
- Aucun identifiant de dossier avec métrique.
- Aucun seuil ni rattachement inventé.
- Pas de `/model` ni de `/compact` au retour d'une pause.
- Le déploiement suit la `release-db` approuvée, jamais avant.
