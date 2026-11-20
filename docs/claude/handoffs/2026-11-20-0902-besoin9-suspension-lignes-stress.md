# Handoff — 2026-11-20 — Besoin 9 : cinq lignes du stress suspendues pour relecture (D-543)

## Branche et état Git

- Worktree `.claude/worktrees/h59-nf7-retrait-drapeau-cadrage` (session concurrente, cycle git/gh direct), branche `besoin9-suspension-code`, avancée par `--ff-only` jusqu'à `origin/main` `ecd94548`.
- Lot du carnet `besoin9-suspension-code` (file A, ordre 100, pris), après le cadrage `besoin9-suspension-lignes-stress`. Lot gardé : il passe par `release-db` (chemin clinique et table des indications biologiques), sans migration.
- Commit tardif ([[D-518]]), juste avant le push.

## Objectif

Appliquer [[D-541]] §6.1 : suspendre pour relecture ligne à ligne les lignes du besoin 9 qui lisent une bande, sans extinction, sans toucher aucun seuil, aucune bande ni aucun poids. Chaque ligne sera ensuite rétablie, corrigée ou retirée par une décision propre.

## Décisions prises

- **[[D-543]]**, sur cinq arbitrages du responsable avec l'avis de Codex à l'aveugle :
  - `20261119-1300-a` à `20261119-1303-a` : réponses A ;
  - `20261119-1635-a` : réponse C.
- Au codage, la suspension de `R-STR-01` laissait `STOP-STR` éteindre la ligne BMS-10 devant une PSS-10 défavorable. [[D-541]] §5.3 croyait `STOP-STR` sans effet ; [[D-508]] l'avait réarmée. D'où `20261119-1635-a` : `STOP-STR` est suspendue elle aussi. L'interdit initial « STOP-STR hors lot » est levé par cette réponse.
- Signatures :
  - trois tables le 2026-11-19 (« je signe la table mots pour mots ») ;
  - la table d'arrêt le 2026-11-20 (« option c acceptée »).
- Les deux textes du §4, étendus aux règles d'arrêt, ont été validés mot pour mot par le responsable le 2026-11-20 (« je valide mot pour mot »).
- Consigne `synthese-v39`. Main avait pris `synthese-v38` entre-temps ([[D-545]]) ; le changement a été rejoué par-dessus.

## Fichiers modifiés

- Tables :
  - `orientationRulesV1.ts`, `stopRulesV1.ts`, `contradictionsV1.ts`, `indicationsBiologieV1.ts` : statut `suspendue` et re-signature ;
  - `publie.ts` : `reglesIndicationsSuspendues`.
- Service et affichage :
  - `lignesSuspendues.ts` (neuf) ;
  - `orientationService.ts` et `api/praticien/orientation/route.ts` : champ `lignesSuspendues` ;
  - `blocReglesNonServies.ts` et `OrientationPanel.tsx` : une ligne, sans identifiant ;
  - `anthropic.ts` : v39.
- Bancs :
  - `suspensionLignesStress.guard.test.ts` (neuf) ;
  - les bancs de signature, de mécanisme (lignes repassées `publiee`), d'empreinte de consigne et de frontière de la biologie ;
  - `orientationService.test.ts` (câblage) ;
  - `docs/FEATURE_FLAGS.md` ;
  - `docs/claude/MATRICE_CONSOMMATION.md`, régénérée.
- E2E (fixtures fictives) : `helpers/db.ts`, `orientation-file-envoi.spec.ts`, `biologie-proposition-courrier.spec.ts` et `fiche-detail-reponses.spec.ts`, re-ciblés sur un PSQI défavorable (`R-SOM-01` vers le Cungi, `BIO-SOM-01`).
- Documents : `docs/decisions/D-543.md`, `changelog.d/2026-11-20-besoin9-suspension-lignes-stress.md`, `docs/claude/plan-journal/H15/2026-11-20-05-besoin-9-lignes-suspendues.md`.

## Validations exécutées

- T1 `npm run check:rapide` : vert, 16 étapes.
- Bancs ciblés : verts.
  - `stopRulesV1.test.ts` : 33 tests.
  - `suspensionLignesStress.guard.test.ts` : 8 tests.
  - `orientationService.test.ts` : 65 tests.
  - Suites `clinical`, `synthese`, `biology-library`, `bio-parcours`, `patient-cockpit`, prompts : 4 299 tests.
- T3 `npm run test:worktree` : deux passes rouges, chacune sur un banc de documents, corrigé.
  - `version-prompt-documents` : D-543 datée du jour, sans citer la version précédente.
  - Matrice de consommation : régénérée.
  - La troisième passe est **verte**, E2E compris (Chromium et WebKit, build de production), en 10 min 41 s.
- Contre-revue Codex P0 (`wn-codex-avis.mjs --mode revue`, après `--mode controle`, barrière tenue) : conforme, aucun constat. Ses deux limites de couverture ont reçu leur verdict :
  - **Écartée, avec motif** : l'import client de `blocReglesNonServies`. `OrientationPanel` importait déjà `@/lib/bibliotheque`, seul import de valeur de ce module ; il n'y a ni Prisma ni crypto.
  - **Corrigée** : le banc « le service sert ». `orientationService.test.ts` prouve désormais le câblage du service.
- Production, conteneur du 2026-11-19 : aucun dossier ne remplit les conditions de `STOP-STR`.

## Problèmes ouverts

- PR non encore ouverte. Restent :
  - `wn-reviewer` sur la tête ;
  - PR-Agent → `0` ;
  - `wn-attendre-ci` ;
  - la sonde `release-db` avant le merge.
- Une migration d'une autre session est arrivée sur `main` (`20261119170000_rag_retire_recherche_doublon_wn_src_0546_v1`). La sonde dira si son constat est posé.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`).
2. `wn-attendre-ci` en fond.
3. `wn-reviewer` sur la tête, puis PR-Agent.
4. Sonde `release-db`, puis merge.
5. `release-db` suivie jusqu'au constat par conteneur.
6. Clore au carnet les questions `20261119-1300-a` à `1303-a` et `1635-a`, ainsi que le message `20261119-0020-b`.

## Interdits encore actifs

- Aucun seuil, aucune bande, aucun poids modifié ou inventé ; aucune autre ligne touchée ; P32 non amendée.
- Rien de J3-12f : ni `BESOIN_SOURCES`, ni version du score, ni parts 60/20/20, ni mention du MFI ([[D-542]]), ni note de Horne.
- Ne pas prendre `h59-of2-planche-a` ; ne pas déclarer la porte 24 levée.
- Aucun nom ni e-mail de dossier dans le dépôt ; aucune donnée réelle dans un seed ou un E2E.
- Un merge à la fois sous `release-db`.
