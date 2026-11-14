# Handoff — H59, lot `h59-d515-textes-hors-options` : le texte « hors options » de `SAF-QUEST-02` et D-524 (2026-11-14)

## 1. Branche et état Git

- Branche `h59-d515-textes-hors-options`, worktree `.claude/worktrees/h59-d515-saf-quest-02`, créée sur `origin/main` après le merge de #2133 (`304e5709`).
- Ligne de carnet : `h59-d515-textes-hors-options`, file A, « pris ». Le lot `h59-d515-code` reste `bloque` jusqu'à la déclaration du responsable. Le lot `h59-d515-deverrouillage` est inscrit `pret`.
- Chemin clinique (`web/src/lib/clinical/`) : la release-db part au merge, sans migration.

## 2. Objectif

Appliquer les réponses B du responsable (2026-11-14, « réponse B aux questions ») aux deux questions de la surface #2133 :
- `20261114-2146-a`, le texte « hors options » propre à `SAF-QUEST-02`, avec sa variante dans la lettre ;
- `20261114-2145-a`, le lot du déverrouillage, prérequis de l'allumage (doc seulement ici).

Les deux sont consignées dans [[D-524]], qui amende [[D-515]] §3 et §6.

## 3. Décisions prises

- **D-524** (réservée par `wn-reserver-decision.mjs`, inscrite sur les deux lignes de la liste commune).
- **Texte neuf** `LIMITATION_QUESTIONNAIRE_CABINET_HORS_OPTIONS` : « … aucune option de la question telle qu'elle a été copiée à l'envoi : faute de pouvoir la relire dans cette copie … ». La réserve de Codex est suivie : l'incertitude se dit au regard de la copie.
- **Lettre** : une réponse `CAB_` hors options est marquée (¶) et porte le paragraphe `PHRASE_HORS_OPTIONS_CABINET`. Le catalogue garde (‡). Une lettre mixte porte les deux paragraphes. (¶) est le signe libre qui suit † (hors cotation), ‡ (hors options) et § (cabinet) ; aucun rendu ne lit les marques.
- **SHA** : `SAF-QUEST-02` passe de `6c0d224f…` à `67b9ef5436a97018c8db41f45c269b32db278e86db7cf45808f180cc30e88f1f`. `SAF-QUEST-01` reste `eb350485…`, à l'identique.
- **Prérequis d'allumage** écrit dans `docs/FEATURE_FLAGS.md` et dans D-524 §3. C'est la garde écrite que demandait la réserve de Codex sur 2145-a ; elle ne s'automatise pas.

## 4. Fichiers modifiés

- `web/src/lib/clinical/safetyQuestionnaireCabinetTextes.ts` : le texte neuf et le commentaire d'en-tête.
- `web/src/lib/clinical/safetyQuestionnaireCabinetV1.ts` : l'import, la liste du SHA, le commentaire « À LIRE » et la réexportation.
- `web/src/lib/clinical-engine/safetyFindings.ts` : le texte neuf sur le constat `CAB_` hors options.
- `web/src/lib/clinical/courrierAdressage.ts` : `PHRASE_HORS_OPTIONS_CABINET`, la marque (¶), et `horsOptions` scindé en catalogue et cabinet.
- `web/src/lib/clinical-engine/safetyQuestionnaireCabinet.guard.test.ts` : le test hors options adapté, quatre tests neufs (le texte avec le catalogue intact, la lettre `CAB_`, la lettre mixte, la lettre dans les options), et deux empreintes figées sur `origin/main` @304e5709, celles des lettres du catalogue hors options, seule et mixte (P3-1 de `wn-reviewer`).
- `docs/decisions/D-524.md`, `docs/FEATURE_FLAGS.md`, `docs/claude/campagnes/SURFACE_RELECTURE_SAF_QUEST_02_2026-11-14.md` (amendée : en-tête, 3.1, 3.2, 4, 5.4, 5.5, 5.8, 7).
- Fragments : `changelog.d/2026-11-14-h59-d524-textes-hors-options.md` et `docs/claude/plan-journal/H59/2026-11-14-08-d524-textes-hors-options.md`.

## 5. Validations exécutées

- Suites ciblées (banc `SAF-QUEST-02`, `courrierAdressage`, banc `SAF-QUEST-01`) : 83/83.
- Suites voisines (`lib/securite`, `lib/fil`, `lib/clinical`, `lib/clinical-engine`, `lib/praticien`, `api/patient`, `api/praticien/adressage`) : 2 676 tests verts, 1 sauté.
- Empreintes des trois lettres sans `CAB_` : inchangées, et vertes.
- SHA recalculés par `tsx` : `SAF-QUEST-02` vaut `67b9ef54…`, `SAF-QUEST-01` vaut `eb350485…`.
- `npm run check` : 0.
- `wn-reviewer` P0 : GO, sans P0, P1 ni P2. Ses trois P3 sont corrigés :
  - P3-1 : les empreintes des lettres du catalogue hors options, recalculées identiques sur une extraction d'`origin/main` ;
  - P3-2 : une note sur les apostrophes de la surface ;
  - P3-3 : « disait », au point 5.4.
- T3, Codex P0, CI et PR-Agent : voir le corps de la PR.

## 6. Problèmes ouverts

- **La signature** attend la déclaration écrite du responsable, sur `67b9ef54…`. Puis vient la PR de signature :
  - SHA en littéral ;
  - inscription dans `shaPerimetreLitteral.guard.test.ts` ;
  - inversion de l'E2E `portail-cabinet-designation-suicide.spec.ts` ;
  - commentaire de `alerteSecuritePraticien.ts` vers [[D-522]].
- **Le lot `h59-d515-deverrouillage`** ([[D-524]] §2) : il refuse le déverrouillage quand la copie ne concorde plus avec `copieDesignationSuicide(définition courante)`, ou quand la désignation courante est absente. Sa validation couvre le constat manqué et le constat de trop. Il est un prérequis de l'allumage.
- Le recomptage des `CAB_` à copie NULL, puis l'allumage par le responsable.
- Avant la prochaine PR de migration de la file A : poster sur #2080 la ligne `WN_CONSTAT_RELEASE_DB run=43577445794` (message `20261114-1657-integrateur-a`).

## 7. Prochaine action exacte

1. T3 vert, `wn-reviewer` GO, commit, push, PR (`--body-file`).
2. Codex P0 : `node scripts/wn-codex-avis.mjs --mode revue`, sur le diff poussé et ses invariants, avec le rendu déposé sur la PR.
3. `wn-attendre-ci` en fond, puis `wn-revue-pr-agent` → 0. Un verdict à chaque commentaire, relire la boîte A, puis « prête @<sha> » à l'intégrateur (chemin clinique, release-db sans migration au merge).
4. Au merge : suivre la release-db, constater le déploiement, puis demander la déclaration écrite du responsable sur `67b9ef54…`.

## 8. Interdits encore actifs

- Signature : jamais sans la déclaration écrite du responsable. Une réponse à une question n'est pas une signature.
- Allumage de `WN_ENABLE_DECLARATION_SUICIDE_CAB` : NON. C'est un geste du responsable, après la signature, le recomptage et le lot du déverrouillage.
- Table `SAF-QUEST-01`, `safetyQuestionnaireTextes.ts` et leur SHA : identiques à l'octet. Textes signés de D-275 et D-277 : mot pour mot.
- Ne pas toucher au trigger de `adressages_signal_alerte`.
- Ne pas reposer D-303, D-493, D-515, D-522, D-524, 0027-a à 0030-a, 2148-a, 2023-a à 2025-a, 1807-a, 1112-a, 1217-a, 1335-a, 2145-a ni 2146-a. Ne pas trancher `20261109-1354-c`.
- Pas de `prisma format`. Pas de SQL manuel en production. Production en lecture seule, par conteneur, en agrégats.
