# Handoff — H59, lot `h59-nf7-retrait-drapeau` : retrait du drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB` (NF-7, D-528, 2026-11-16)

## 1. Branche et état Git

- Branche `h59-nf7-retrait-drapeau`, worktree `.claude/worktrees/h59-nf7-retrait-drapeau-cadrage`, tirée d'`origin/main`, avancée par `--ff-only` jusqu'à d7baf395 (#2163).
- Carnet : ligne `h59-nf7-retrait-drapeau` (file A), `bloque` → `pret` (cadrage tranché) → `pris` par la file A le 2026-11-16.
- Sans migration, sans release-db : aucun fichier de `web/src/lib/clinical/` ni de `web/prisma/` n'est touché. PR ordinaire, sur un chemin clinique (`lib/clinical-engine`).

## 2. Objectif

Exécuter la réponse `20261111-0029-a` (« le drapeau se retire ensuite »), après l'allumage du 2026-11-15 et le CHECK « valide ⇒ déclaré » (#2156). Le cadrage a été rendu sans code, en trois questions : `20261116-0825-a` (clinique, avis Codex à l'aveugle joint), `0826-a` et `0827-a`. Réponses du responsable, textes collés adoptés explicitement : **A** (retrait total), **retrait du geste « Déclarer » entier**, **aucun filet**.

## 3. Décisions prises

- **[[D-528]]** (réservée par `wn-reserver-decision`) :
  - retrait de `declarationSuicideCabinetActive()`, de ses quinze appels directs et de l'appel indirect ;
  - tout ce que le drapeau allumé faisait devient permanent ;
  - amende [[D-522]] §3-§4 et [[D-515]] §6 : une extinction passe par un lot de code déployé.
- **Geste « Déclarer »** : sont retirés l'action, le tiroir, le motif, `declarationRequiseAvantEnvoi` et `MOTIF_DECLARATION_REQUISE`, les champs `declarationRequise` et `declarationSuicideRequise`, et la course 8 du banc d'envoi. `cabinetEnvoyable` = actif et publié.
- **Aucun filet** : une violation du CHECK reste un 500 « Erreur inattendue. », que la route ne journalise pas. Le texte est corrigé dans ce sens (P2-1 de `wn-reviewer`) ; aucun code n'est ajouté.
- Retirés aussi : l'option `courrielMalgreDrapeau` de `reponsesSecuriteDeclarees` et la variable dans `playwright.config.ts`.

## 4. Fichiers modifiés

**Code**
- `web/src/lib/securite/declarationSuicideCabinet.ts`
- `web/src/app/api/praticien/instruments/route.ts`
- `web/src/lib/instruments.ts`
- `web/src/app/api/praticien/file-envoi/envoyer/route.ts`
- `web/src/app/api/patient/questionnaire/route.ts`
- `web/src/lib/clinical-engine/safetyFindings.ts`
- `web/src/lib/clinical-engine/designationsCabinetPrisma.ts`
- `web/src/lib/securite/alerteSecuritePraticien.ts`
- `web/src/lib/fil/signauxSecurite.ts`
- `web/src/app/api/praticien/bibliotheque/route.ts`
- `web/src/lib/bibliotheque.ts`
- `web/src/components/BibliothequePanel.tsx`
- `web/playwright.config.ts`
- commentaires seuls : `adressage/courrier/route.ts`, `deverrouillageCabinet.ts`, `patient/submit/route.ts`, `file-envoi/route.ts`, les deux E2E, `.github/workflows/ci.yml`

**Tests**
- les tests des routes et de l'écran ci-dessus ;
- les bancs de garde `declarationSuicideCabinet`, `reponseSuicide`, `safetyQuestionnaireCabinet` et `libellesCitables` ;
- `signauxSecurite.parite.test.ts`, `designationsCabinet.pg.test.ts` et `instruments.test.ts` ;
- `fil/route.test.ts`, dont le faux Prisma reconnaît le `OR` catalogue ∪ cabinet ;
- `web/scripts/banc-envoi-cabinet-deux-sessions.test.ts`.

**Documentation**
- `docs/decisions/D-528.md`
- `docs/FEATURE_FLAGS.md`
- `changelog.d/2026-11-16-h59-nf7-retrait-drapeau.md`
- `docs/claude/plan-journal/H59/2026-11-16-01-nf7-retrait-drapeau.md`
- ce handoff

## 5. Validations exécutées

- `npx tsc --noEmit` : 0. `npm run check` (T1 complet) : 0, 3142 tests. `check:rapide` : 0 après les corrections de la revue.
- **T3 complet** (`npm run test:worktree`) : vert en 9 min 48 s, E2E Chromium + WebKit compris.
- **Bancs sur base réelle**, joués en local sur la base du worktree (`wn-dev-db --migrate`) :
  - banc d'envoi à deux sessions : 10 courses vertes (1-6, 9-12) ;
  - `designationsCabinet.pg.test.ts` : vert.
- **`wn-reviewer` : GO**, sans P0 ni P1.
  - Il a vérifié l'équivalence avec la branche « allumé », appel par appel.
  - Le sha256 du fichier signé est inchangé.
  - P2-1, P3-2, P3-3 et P3-4 sont corrigés.
  - P3-1 (l'équivalence repose sur le CHECK, constaté) et P3-5 (un onglet ouvert avant le déploiement reçoit un 400 avec motif) sont acceptés.
- **Recompte en production le 2026-11-16 (one-off-5432)**, lecture seule en agrégats : 0 instrument du cabinet, 0 assignation `CAB_`, CHECK présent et validé.
- Codex P0, CI et PR-Agent : voir la PR.

## 6. Problèmes ouverts

- La variable `WN_ENABLE_DECLARATION_SUICIDE_CAB` reste posée sur Scalingo, inerte dès le déploiement. La retirer est un geste d'exploitation.
- Une violation du CHECK n'est pas journalisée par la route (P2-1). Un `logger.error` minimal (code d'événement + `code` Prisma) serait un lot à part, si le responsable le veut.
- Résidus non traités : le déverrouillage d'un `CAB_` « non » ou NULL, la comparaison à la milliseconde de la garde de #2130, la porte 24 (`20261109-1354-c`).

## 7. Prochaine action exacte

1. Commit, push, puis PR (`--body-file`). Déposer l'avis Codex P0 (`node scripts/wn-codex-avis.mjs --mode revue`).
2. Attendre CI (`wn-attendre-ci`) et PR-Agent (`wn-revue-pr-agent`) à 0. Lire les commentaires en ligne et donner un verdict à chacun.
3. Déclarer « prête @<sha> » à l'intégrateur.
4. Après le merge : questions `0825-a`, `0826-a` et `0827-a` à `close`, carnet à `fait`.

## 8. Interdits encore actifs

- Ne retoucher aucun fichier de `web/src/lib/clinical/`, en particulier `safetyQuestionnaireCabinetV1.ts` (SHA `67b9ef54…`), son commentaire sur le drapeau compris.
- `SAF-QUEST-01`, D-275 et D-277 : identiques à l'octet.
- Pas de SQL manuel en production : lecture par conteneur seulement, en agrégats. Pas de `prisma format`.
- Ne pas reposer D-303, D-493, D-515, D-522, D-524, ni les trois réponses du 2026-11-16.
