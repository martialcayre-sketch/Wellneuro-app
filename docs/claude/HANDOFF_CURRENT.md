# Handoff — 2026-08-02

## Git

- Branche `claude/resume-ye9sbj`, repartie de `origin/main` après merge, arbre propre.
- `main` = `071c7b1`. Trois PR livrées cette session : **#517** (clôture
  certification 62/64 + arbitrages), **#518** (préparation pipeline lot 8),
  **#519** (migration de marquage `usage=orientation`).
- Aucune PR ouverte. Aucun suivi CI en cours.

## Objectif atteint

Clore la montée en certification, transcrire les arbitrages praticien, et
rendre le corpus d'orientation exploitable par le futur compilateur de règles
(lot 9). **C'est fait et vérifié en production.**

## Décisions prises, et pourquoi

- **Q_PED_03 (Conners 3) reste `suspendu`** — arbitrage praticien sur trois
  options instruites. Aucun usage en production ne justifie de reconstruire le
  scoring dimensionnel. À rouvrir sur usage, et alors avec les 4 dimensions et
  les 2 échelles de validité — **jamais la somme brute** servie aujourd'hui.
- **Décision f close en AMENDANT A-009** : seule la **perfusion** reste exclue
  du moteur d'orientation ; sevrages médicamenteux, psychotropes et Alzheimer
  sont réintégrés. La voie lente est inchangée — chaque claim passe par la
  validation praticien (D-003).
- **La quarantaine sanitaire n'est pas un domaine.** L'amendement réintègre des
  *thèmes* ; il ne lève aucune quarantaine. WN-SRC-0318, 0322, 0389, 0370
  restent exclus tant que leur relecture n'est pas faite. Cette distinction est
  gravée dans le filtre et dans deux bancs.
- **Marquage rétroactif par migration, pas par ré-ingestion.** Le contrôle
  d'immuabilité de `store.ts` ne compare pas `metadata` : ré-ingérer un claim
  existant est un **no-op silencieux**. Sans la migration, `usage` serait resté
  nul pour toujours et le lot 9 n'aurait vu aucun claim.
- **Le lot 7 était déjà livré** (#361, 2026-07-25) — contrat, moteur, route à
  double verrou, dormant fail-closed. Rien à re-développer.

## Fichiers livrés

- `tools/corpus/claims/draft.mjs` — flag `--usage`, filtre appliqué avant tout
  appel LLM.
- `tools/corpus/claims/lib/filtre-orientation.mjs` + deux bancs
  (`filtre-orientation.test.mjs`, `perimetre-orientation.test.mjs`).
- `tools/corpus/claims/README.md` — runbook du run d'ingestion.
- `web/prisma/migrations/20260801200000_rag_claim_usage_orientation/` +
  `prisma/checks/rag_claim_usage_orientation_v1.sql` + étape `ci.yml`.
- `web/src/lib/rag/claims/validation.test.ts` — 3 tests du passe-plat `metadata`.
- `scripts/run-certify-bancs.sh` — balaie `certify/lib` **et** `claims/lib`.
- `.wn/state.json`, `changelog.d/`, `docs/claude/SESSION_LOG.md`, README de
  campagne (décision f close).

## Validations exécutées

- CI `verify` **vert** sur chacune des trois PR (E2E incluses).
- Bancs Node : **70 tests, 0 échec**. T1 vert.
- Migration **éprouvée sur PostgreSQL 16 éphémère** avec fixtures : périmètre
  marqué, quarantaine et perfusion épargnées, `updated_at` intact, rejeu à
  0 ligne, et les deux gardes lèvent bien leur exception quand on les met en
  défaut.
- **Vérification production après merge** (lecture `execute_sql`) :
  migration appliquée (1 étape, aucun rollback) ; **1 716 / 1 716** claims du
  périmètre marqués ; **0** claim hors liste marqué ; **0** claim de quarantaine
  ou de perfusion marqué ; **0** claim `VALIDE` estampé sur 5 242 — aucune
  signature praticien touchée.
- Revue adversariale (migration) : GO sous réserve, **trois réserves bloquantes
  levées** — `updated_at` préservé, post-condition sur l'état final, banc
  rattachant la liste figée au registre.

## Problèmes ouverts

- **Trois défauts majeurs à trancher avant le lot 9** : trois des quatre
  assertions cliniques du contrat SQL sont des tautologies (leurs témoins sont
  exclus par plusieurs critères à la fois) ; le filtre du pipeline et la
  migration définissent le périmètre **différemment** (un `--usage orientation`
  sur une source hors périmètre entrerait sans que rien ne le détecte) ; le
  marquage ignore `statut`, donc des claims `EN_ATTENTE` portent la marque.
- **Hors campagne, à connaître** : rien au runtime ne filtre `lifecycleStatus`.
  Les 248 claims validés de sources en quarantaine — dont WN-SRC-0318,
  vigilance Élevée — restent remontables par le RAG. Le marquage ne crée pas ce
  trou, il le rend visible.
- **En attente praticien** : Q_SOM_09 (fin de recueil avant tout scoring),
  transcription des 4 MP4 sommeil, levée éventuelle de quarantaine WN-SRC-0318.
- **Deux promotions proposées, sans accord à ce jour** : entrée
  `docs/DECISIONS.md` pour l'amendement A-009 ; correction du stop-hook
  `~/.claude/stop-hook-git-check.sh`, qui réclame après chaque merge la
  réécriture du commit de squash GitHub — faux positif invitant à un geste
  dangereux sur `main`.
- **Question sans réponse** : la source des « gates G0–G4 » du contexte compact
  reste introuvable (`.wn/orchestrator.json` n'en porte aucun).
- `.wn/state.json` date du 2026-08-01T19:10 : il ignore le merge de #519 et la
  vérification production.

## Prochaine action exacte

**Lot 9** — écrire `tools/corpus/orientation/compile.mjs` (inexistant) : il
compile la table `ORIENTATION_RULES_V1` depuis les claims `VALIDE` portant
`metadata.usage = 'orientation'`, par PR revue, puis la signature praticien
bascule `ORIENTATION_METADATA.validationExterne`. Trancher les trois défauts
majeurs **au cadrage**, pas après. Les données sont prêtes : 709 claims validés
marqués, sur 85 sources.

## Interdits encore actifs

- **Ne pas promouvoir Q_GEO_04** à `scoring_verifie` : plafond adversarial du
  2026-08-01 (bandes HAS 2011 jamais sourcées, escalade SIIN ouverte).
- **Ne pas lever de quarantaine** par un raisonnement de domaine — c'est une
  décision praticien distincte, avec relecture.
- **Ne pas rejouer le pipeline depuis une session distante** : clés API,
  `RAG_INTERNAL_SECRET` et PDF n'existent que sur le Mac.
- **Ne pas écrire en base hors migration relue** ; toute migration passe par la
  revue adversariale **et** la vérification production après merge.
- **Ne pas merger sans avoir lu `verify`** — les seuls checks Vercel ne prouvent
  rien.
