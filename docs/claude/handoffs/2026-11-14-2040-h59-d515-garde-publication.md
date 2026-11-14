# Handoff — H59, lot `h59-d515-garde-publication` : les libellés que la lettre citera sont jugés à la publication (2026-11-14)

## 1. Branche et état Git

- Branche `h59-d515-garde-publication`, worktree `.claude/worktrees/h59-d515-saf-quest-02`, avancée par `--ff-only` sur `origin/main` à `2f1cea3c` (#2126, D-522, mergée).
- Ligne de carnet : `h59-d515-garde-publication`, file A, état `pris`. Le lot `h59-d515-code` reste `pris` jusqu'à la PR 4.
- Lot précédent de la même session : `h59-d515-amendement-courriel`, livré par #2126. D-522 amende D-515 §5 et §6 (option C de `20261114-1335-a`).

## 2. Objectif

Appliquer la réponse `20261114-1217-a` (option 1, avec trois précisions). La lettre d'adressage d'un instrument du cabinet cite, depuis la copie figée à l'envoi, trois libellés :
- le nom de l'instrument ;
- l'énoncé de la question désignée ;
- le libellé de la réponse.

Son rendu médecin la refuse sur un terme prescriptif (`terme_prescriptif`). Le refus a donc été avancé à la publication, à la déclaration et à la modification d'un instrument publié déclaré « oui », avec la même garde. La garde de la lettre reste active. Le lot ne touche ni migration ni chemin clinique de code (`web/src/lib/clinical/` intact).

## 3. Décisions prises

- **Une seule garde.** `libellesCitablesRefuses` (`lib/securite/declarationSuicideCabinet.ts`) appelle `contientTermePrescriptif` de `vocabulaire.ts`, la fonction même que lève `assertRenduMedecinNonPrescriptif`. Elle n'a ni liste parallèle ni terme ajouté.
- **Les mêmes libellés.** La garde part de `questionsDesignables`, comme `copieDesignationSuicide`. Elle reprend ses replis : l'énoncé retombe sur l'identifiant de la question, une option sur `String(v)`, et le filtre int4 s'applique. Le nom jugé est `titre`, la colonne que l'envoi copie. Les autres questions ne sont pas jugées. L'option « non », jamais citée, est jugée par arbitrage (« tous les libellés de ses options ») : c'est le seul écart, voulu, et le banc l'écrit.
- **Où la garde s'applique** (drapeau allumé, déclaration « oui ») :
  - `publier` et `declarer` ;
  - l'édition des seules métadonnées d'un instrument déclaré « oui ». Une édition du contenu efface la déclaration et repasse l'instrument en brouillon : la publication suivante rejuge.
- **Le refus** : 400 `invalid_payload`, un motif par champ fautif (`ERREURS_LIBELLE_CITABLE`), en français. Il s'affiche dans le tiroir ouvert (`ErreursTiroir`, `role="alert"`). Avant ce lot, le bandeau de la page, seul à afficher l'erreur, restait sous l'overlay.
- **Écriture gardée sur `updatedAt`** pour l'édition des métadonnées, drapeau allumé : sans elle, une publication ou une déclaration « oui » concurrente, jugée sur l'ancien nom, pouvait recevoir un nom que personne n'avait jugé. Une édition concurrente rend désormais 409, « rouvrez-le avant de l'enregistrer ». Le test d'entrelacement de la passe Codex du lot 3 passe de 200 à 409, et sa thèse tient : l'ancien contenu n'est pas réinstallé. `wn-reviewer` recommande de garder ce changement tel quel.
- **Drapeau éteint** : rien ne change. Ni garde, ni écriture gardée.

## 4. Fichiers modifiés

- `web/src/lib/securite/declarationSuicideCabinet.ts` : `libellesCitablesRefuses`, `ERREURS_LIBELLE_CITABLE`, import de `contientTermePrescriptif`.
- `web/src/app/api/praticien/instruments/route.ts` : `refusLibellesCitables`, la garde dans `publier`, dans `declarer` et dans l'édition, et l'écriture gardée.
- `web/src/components/BibliothequePanel.tsx` : `erreursTiroir`, `ErreursTiroir`, affichés dans « Relire la grille » et « Déclarer ».
- Bancs :
  - `lib/securite/libellesCitables.guard.test.ts` (neuf) ;
  - `instruments/route.test.ts` (bloc `20261114-1217-a`, et deux tests adaptés) ;
  - `BibliothequePanel.test.tsx` (bloc refus).
- Fragments : `changelog.d/2026-11-14-h59-d515-garde-publication.md`, `docs/claude/plan-journal/H59/2026-11-14-06-d515-garde-publication-libelles.md`.

## 5. Validations exécutées

- **Banc d'identité** : pour chaque racine de `RACINES_PRESCRIPTIVES`, quatre variantes (casse, apostrophe, `&`, `<>`) et trois champs. Il vérifie que la publication refuse si et seulement si `genererCourrierAdressage` refuse en `terme_prescriptif`, en passant par la copie réelle. Vu **rouge au débranchement** : la garde des options désactivée donne 30 rouges.
- Suites ciblées (route, `lib/securite/`, panneau) : 275/275.
- `npm run check:rapide` : 0.
- **Production** : lecture seule par conteneur `one-off-4271`, en agrégats. Le 2026-11-14, il y a 0 instrument du cabinet actif, donc 0 publié et 0 déclaré « oui ». Aucun libellé publié n'est à reprendre.
- **`wn-reviewer`** : GO, sans P0, P1 ni P2. Verdicts :
  - P3-1 (clé React en double) : corrigé, la clé est l'index ;
  - P3-2 (`role="alert"` sur le `<ul>`) : corrigé, l'alerte enveloppe la liste ;
  - P3-3 (erreur réseau invisible dans le tiroir) : corrigé, avec un test ;
  - P3-4 (résidu de bascule du drapeau) : routé, voir § 6 ;
  - P3-5 (double clic) : écarté, les boutons de l'éditeur sont déjà désactivés pendant `occupe` ;
  - tests suggérés : ajoutés, deux options au même libellé fautif et l'erreur réseau.
- Codex : non appelé. Le chemin n'est pas clinique : il s'agit d'une validation d'entrée de l'API praticien, sans règle, seuil ni table signée.
- **T2, `npm run check`, CI, PR-Agent** : voir le corps de la PR.

## 6. Problèmes ouverts

- **Résidu de bascule du drapeau** (`wn-reviewer`, P3-4). Un instrument déclaré « oui » sous drapeau allumé, puis édité drapeau éteint, change de libellés sans garde, et sa déclaration reste. Au rallumage, l'envoi copierait ces libellés. Le problème existait avant ce lot. La consigne « drapeau éteint : rien ne change » interdit de le corriger ici. La reprise déjà prescrite avant tout rallumage (`docs/FEATURE_FLAGS.md` : repasser en `grille_a_relire` les instruments `valide`) fait repasser chacun par la publication, donc par cette garde. À citer sur la surface de la PR 4.
- **P3-4 de la revue de #2126** : le commentaire de `web/src/lib/securite/alerteSecuritePraticien.ts` tient encore `20261114-1335-a` pour ouverte. Il est à corriger vers [[D-522]] dans la PR 4 (D-522 §5).

## 7. Prochaine action exacte

1. T2 vert, puis `npm run check`. Commit, push et PR (`--body-file`).
2. `wn-attendre-ci` en fond, puis `wn-revue-pr-agent` → 0 (à défaut, `wn-reviewer`, D-448). Donner un verdict à chaque commentaire, relire la boîte, puis déclarer « prête @<sha> » à l'intégrateur (question `20261114-1217-a`).
3. Ensuite, la PR 4 du lot `h59-d515-code`. Elle comprend la surface `docs/claude/campagnes/SURFACE_RELECTURE_SAF_QUEST_02_<date>.md` et sa signature par le responsable. Points à y faire figurer :
   - la conséquence de l'option C (D-522 §3) ;
   - la définition servie vivante face à la copie figée ;
   - `HORS_OPTIONS` hors int4 ;
   - la question de DC-24 sur une passation `CAB_` sans assignation ;
   - l'inscription dans `shaPerimetreLitteral.guard.test.ts` ;
   - l'E2E à inverser ;
   - le résidu du § 6 ;
   - le commentaire de `alerteSecuritePraticien.ts`.

## 8. Interdits encore actifs

- Allumage de `WN_ENABLE_DECLARATION_SUICIDE_CAB` : geste du responsable, après la PR 4 et le recomptage des `CAB_` à copie NULL.
- Table `SAF-QUEST-01`, `safetyQuestionnaireTextes.ts` et leur SHA : identiques à l'octet. Textes signés de D-275 et D-277 : mot pour mot.
- Pas de retouche au trigger `adressages_signal_alerte`.
- Ne pas reposer D-303, D-493, D-515, D-522, 0027-a à 0030-a, 2148-a, 2023-a à 2025-a, 1807-a, 1112-a, 1217-a ni 1335-a. Ne pas trancher `20261109-1354-c`.
- Pas de `prisma format`. Pas de SQL manuel en production. Production en lecture seule, par conteneur, en agrégats.
