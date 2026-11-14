# Handoff — H59, lot `h59-d515-code`, PR 4 étape 1 : la surface de relecture de `SAF-QUEST-02` (2026-11-14)

## 1. Branche et état Git

- Branche `h59-d515-surface-relecture`, worktree `.claude/worktrees/h59-d515-saf-quest-02`, créée sur `origin/main` @`eb454046` (#2130 mergée).
- Ligne de carnet : `h59-d515-code`, file A. Elle passe à `bloque` avec pour motif les questions `20261114-2145-a` et `20261114-2146-a`, puis la déclaration écrite du responsable.
- PR de documentation seule : aucune ligne de code, aucune table, aucun texte signé touché.

## 2. Objectif

Produire, avant toute demande de signature ([[D-195]]), la surface de relecture de `SAF-QUEST-02`. Elle présente :
- le mécanisme de [[D-515]] §1-§4 et §7, amendé par [[D-522]] ;
- les textes fixes ;
- ce que la signature ne couvre pas ;
- les points routés par les PR 1 à 3, #2126 et #2130.

## 3. Décisions prises

- **SHA à signer** : `6c0d224fcc47dc115ecb2097ffbbd6a0956ff2f3491337ac5895b9b4c0b4a604`, calculé par `tsx` sur `main` @`eb454046`. Le SHA de `SAF-QUEST-01` vaut toujours `eb350485…`, à l'identique.
- **`DC-24`, passation `CAB_` sans assignation** : aucune limitation n'est proposée, car le cas est vide par construction (vérifié dans le code) :
  - seul `api/patient/submit` écrit une passation `CAB_`, et il exige et écrit l'identifiant d'assignation ;
  - les écrivains des deux agendas n'écrivent pas de `CAB_` ;
  - la seule suppression d'assignation, `lib/patient/effacement.ts`, supprime les passations dans la même transaction.
- **Définition vivante face à la copie figée** : le gel du contenu pendant un envoi en cours existe déjà (`envoi_en_cours`, sous `FOR UPDATE` drapeau allumé). Le seul résidu passe par le **déverrouillage** d'une assignation verrouillée après une modification de l'instrument. Il peut faire **manquer** un constat, pas seulement en ajouter un. Il est posé en question `20261114-2145-a`.
- **Texte « hors options »** : il est faux pour une option hors int4 (1112-a, non reposée) et pour une option ajoutée après l'envoi. Il est posé en question `20261114-2146-a`.
- **Avis de Codex** ([[D-505]], `--mode question`, à l'aveugle, conformes, joints aux lignes) : B pour chacune des deux questions, avec une confiance forte, ce qui rejoint la recommandation de la session. Les questions sont cliniques (sécurité) : elles attendent le responsable, sans accord session-Codex.

## 4. Fichiers modifiés

- `docs/claude/campagnes/SURFACE_RELECTURE_SAF_QUEST_02_2026-11-14.md` (neuf).
- `changelog.d/2026-11-14-h59-d515-surface-saf-quest-02.md`.
- `docs/claude/plan-journal/H59/2026-11-14-07-d515-surface-relecture-saf-quest-02.md` (rang 07, le 06 étant le plus haut sur `origin/main`).
- Ce handoff.

## 5. Validations exécutées

- Faits de la surface relus dans le code :
  - `safetyQuestionnaireCabinetV1.ts` et `safetyQuestionnaireCabinetTextes.ts` ;
  - `safetyFindings.ts` (producteur `CAB_`) et `courrierAdressage.ts` (ligne citée, pied, ancrage à trois SHA) ;
  - `designationsCabinetPrisma.ts` (jointure) et `instruments.ts` (`resolveDefinition`) ;
  - `api/praticien/instruments/route.ts` (gel) et `api/praticien/assignations/route.ts` (déverrouillage) ;
  - `api/patient/submit/route.ts` et `effacement.ts`.
- `npm run check:rapide` : 0.
- `node scripts/wn-plan-fiche.mjs H59` : lecture correcte du fragment.
- Codex : deux avis `--mode question`, code 0, état `conforme`.
- Production : aucune lecture neuve. La surface cite la lecture par conteneur du 2026-11-14 (lot de #2130) : 0 instrument du cabinet actif, 0 `CAB_` envoyé.
- `npm run check`, CI, PR-Agent : voir le corps de la PR.

## 6. Problèmes ouverts

- **`20261114-2145-a`**, ouverte. Sous B, un lot (sans migration) refuse le déverrouillage quand la copie ne concorde plus avec `copieDesignationSuicide(définition courante)`. Une désignation courante absente refuse aussi. Ce lot devient un prérequis écrit de l'allumage. Réserve de Codex : il faut aussi un dispositif qui garantisse ce prérequis avant l'`env-set`.
- **`20261114-2146-a`**, ouverte. Sous B, un lot avant la signature :
  - écrit le texte neuf dans `safetyQuestionnaireCabinetTextes.ts` et sa variante dans la lettre, limitée aux réponses `CAB_` ;
  - fait recalculer le SHA ;
  - amende la surface.
  Réserve de Codex : « faute de savoir ce qu'elle dit » doit viser l'incertitude au regard de la copie.
- La signature attend ces réponses, puis la **déclaration écrite du responsable** sur le SHA en vigueur.

## 7. Prochaine action exacte

1. `npm run check`, commit, push, PR (`--body-file`), `wn-attendre-ci` en fond, `wn-revue-pr-agent` → 0 (à défaut, `wn-reviewer`). Donner un verdict à chaque commentaire, relire la boîte A, puis déclarer « prête @<sha> » à l'intégrateur (PR de documentation, sans exception).
2. Carnet : `h59-d515-code` → `bloque` (motif : 2145-a, 2146-a, déclaration). Puis `/clear` et le lot `pret` suivant de la file A.
3. Après les réponses :
   - sous 2146-a B, le lot des textes, puis l'amendement de la surface (nouveau SHA) ;
   - sous 2145-a B ou C, le lot du déverrouillage, avant l'allumage (B) ou avant la signature (C).
   Puis la PR de signature, selon le bloc de reprise :
   - SHA en littéral ;
   - inscription dans `shaPerimetreLitteral.guard.test.ts` ;
   - inversion de l'E2E `portail-cabinet-designation-suicide.spec.ts` ;
   - commentaire de `alerteSecuritePraticien.ts` vers [[D-522]] ;
   - T3, `wn-reviewer` P0, Codex P0, et une release-db sans migration.
4. Avant la prochaine PR de migration de la file A : poster sur #2080 la ligne `WN_CONSTAT_RELEASE_DB run=43577445794`, après lecture de `_prisma_migrations` par conteneur (message `20261114-1657-integrateur-a`).

## 8. Interdits encore actifs

- Signature : jamais sans la déclaration écrite du responsable. Un avis dans la session ne vaut ni signature clinique ni approbation, et l'avis de Codex non plus.
- Allumage de `WN_ENABLE_DECLARATION_SUICIDE_CAB` : NON. C'est un geste du responsable, après la PR 4, le recomptage et, sous 2145-a B, le lot du déverrouillage.
- Table `SAF-QUEST-01`, `safetyQuestionnaireTextes.ts` et leur SHA : identiques à l'octet. Textes signés de D-275 et D-277 : mot pour mot.
- Ne pas toucher au trigger de `adressages_signal_alerte`.
- Ne pas reposer D-303, D-493, D-515, D-522, 0027-a à 0030-a, 2148-a, 2023-a à 2025-a, 1807-a, 1112-a, 1217-a ni 1335-a. Ne pas trancher `20261109-1354-c`.
- Pas de `prisma format`. Pas de SQL manuel en production. Production en lecture seule, par conteneur, en agrégats.
