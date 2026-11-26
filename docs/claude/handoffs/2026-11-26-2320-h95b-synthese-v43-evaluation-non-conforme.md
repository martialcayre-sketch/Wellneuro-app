# Handoff — H95 part B : code de D-571 (entrée sans libellé, `synthese-v43`), évaluation de l'appel principal seul non conforme

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-entree-libelle-code`, née d'`origin/main` (après le merge de #2377, D-571).
- Commit du code évalué : `9cca6e35`. `origin/main` fusionnée ensuite, sans fichier commun (consigne du lot), puis commit de clôture (constat, changelog, handoff).
- Lot `h95-b-entree-libelle-code` (file B, carnet D-510), **rangé `bloque`** : le verdict est non conforme, et la suite revient au responsable.
- PR en **brouillon, non déclarée « prête »** : rien de ce lot ne se merge en l'état.

## 2. Objectif

Appliquer D-571 : l'appel principal ne reçoit plus le libellé d'interprétation de `Q_INF_02` ni de `Q_INF_03` (§3) ; ajouter les textes 8 à 11 et la phrase qui suit le texte 11 (§4) ; passer à `synthese-v43` ; évaluer l'appel principal seul sur 75 sorties avant « prête » (§5).

## 3. Décisions prises

- Code, consigne v42, empreintes et banc repris de #2358 (`b-h95-ligne10-v42`) : `main` n'avait pas touché ces fichiers. Le changelog et la version de #2358 n'ont pas été repris. Les textes de D-571 ont été insérés par script, depuis les lignes `  > ` de la décision. Le garde reconstruit la section depuis D-539, D-545, D-557, D-559, D-563 et D-571, et la compare au caractère près.
- Entrée : `web/src/lib/synthese/interpretationNonTransmise.ts` (liste fermée, projection) et une branche dans `buildUserMessage`. La projection est une **liste blanche**. Raison : sur un recueil partiel, le moteur recopie aussi le libellé dans `bandePlancher` et dans `note`, et la bande d'un sous-score porte ses bornes.
- Ce qui est transmis :
  - totaux, sous-scores et leur libellé ;
  - les comptes de questions `missing`, `items` et `repondus`, que la consigne décrit déjà ;
  - le domaine du DNST, lu au titre de sa section au catalogue.
- Une clé absente de la source reste absente, sans `null` inventé : correctif P2 de la revue, fait avant le rejeu. Motif fixe : « Libellé d'interprétation non transmis. »
- Équivalence des deux formes (D-571 §5), telle que le test la vérifie : mêmes clés de passation ; mêmes identifiants, libellés et domaines de sous-score ; clés de scores de la fixture incluses dans celles du moteur.
- D-559 et D-563 reçoivent leur note d'amendement par D-563 et par D-571. Sans elle, le banc `version-prompt-documents` est rouge.
- Réponses du responsable :
  - `20261126-2245-b-h95` **A**, exception déclarée : le bloc d'orientation recopie l'objectif des règles signées R2-NEU-03 et R2-NEU-04, qui nomme un messager du DNST et sa bande ; il reste tel quel ;
  - `20261126-2305-b-h95` **A**, `2306-b-h95` **A**, `2307-b-h95` **A** : lectures de la grille.
- **Verdict : non conforme**. 3 générations en violation sur 75, contre 17 sous v42. Elles viennent d'un même dossier, sur ses trois passages, et d'une seule forme : un résultat rapporté par l'anamnèse, en argument d'axe. Constat au journal H95, `2026-11-26-01`.

## 4. Fichiers modifiés

- `web/src/lib/synthese/interpretationNonTransmise.ts` (neuf) et `web/src/lib/synthese/generation.ts`.
- `web/src/lib/anthropic.ts` : les textes de D-557, D-559, D-563 et D-571, l'exemple du contrat, `synthese-v43`.
- Gardes :
  - `promptBiologie.guard.test.ts`, `promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts`, `biologie.generation.test.ts` ;
  - `conduite.guard.test.ts`, `promptSousScores.guard.test.ts` ;
  - `interpretationNonTransmise.guard.test.ts` (neuf).
- Banc `web/scripts/eval-d539/` : `dossiers.ts`, `evaluation.eval.ts` (v43, contrôle des libellés), `paquets-codex.mjs` (lectures 1640 à 1643).
- `docs/decisions/D-559.md`, `D-563.md` : notes d'amendement.
- `changelog.d/2026-11-26-h95b-d571-entree-libelle-code.md`, journal H95 `2026-11-26-01-…`, ce handoff.

## 5. Validations exécutées

- `npm run check:rapide` vert après les éditions. `npm run check` (T1 complet) vert avant le commit, après la note de D-559 et D-563.
- T3 (`npm run test:worktree`) : vert avant le correctif P2. Rejoué sur le code final : voir le commentaire de la PR.
- Revue `wn-reviewer` du diff indexé : GO avec réserves. P1 (bloc d'orientation) porté au responsable. Premier P2 (`null` inventé) corrigé, avec les tests manquants. Les autres P2 sont acceptés ou mis en problèmes ouverts.
- Évaluation :
  - un essai de fumée (dossier 1, un passage), conforme ;
  - les 75 générations : 75 HTTP 200, entrées conformes 75/75, aucun second appel.
- Cotation :
  - quatre lectures indépendantes de la session ;
  - quatre avis Codex `--mode revue` (code 0) ;
  - deux avis Codex à l'aveugle sur les questions (code 0) ;
  - recherche mécanique des exemples du contrat.
- Pièces au dépôt privé des revues, sous `h95-d571-evaluation-2026-11-26/`. Copie locale : `~/Developer/wn-eval/h95-d571-2026-11-26/`.

## 6. Problèmes ouverts

- `synthese-v43` est non conforme. Selon D-571 §4, la suite passe par une nouvelle décision qui retouche les textes, puis par un rejeu.
- La forme restante est seule, et présente sous v40 à v43 : un résultat déclaré (ferritine) argumente un axe et le nomme, malgré le texte 11. C'est un seul dossier, mais les trois passages.
- Le titre d'une passation de `Q_INF_02` peut nommer l'état : le référentiel d'assignation écrit « Hypersensibilité au déficit en magnésium — Spasmophilie ». D-571 garde la passation nommée. Le titre réellement stocké en production n'a pas été lu (revue, P2).
- Une section du DNST sans « — » au catalogue ferait échouer la synthèse de tout dossier qui porte un DNST. C'est un refus par défaut, épinglé par le garde.
- Le banc ne produit pas de bloc d'orientation. L'exception A (`2245`) est déclarée, rien d'autre n'est instruit.
- Les questions `20261126-2245`, `2305`, `2306` et `2307-b-h95` sont `repondue`, à passer à `close` avec la décision suivante.

## 7. Prochaine action exacte

Au responsable :
- lire le constat (journal H95, `2026-11-26-01`) ;
- dire la suite : une nouvelle décision qui retouche les textes, sur la forme du résultat déclaré en argument d'axe, ou une autre voie.

La PR de ce lot reste en brouillon d'ici là. Si une retouche est décidée, elle repart de cette branche (code, banc et gardes), avec une version neuve.

## 8. Interdits encore actifs

- Ne pas merger ni déclarer « prête » la PR de ce lot : `synthese-v43` n'est pas servie, et `synthese-v39` reste en service.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`. Ne retoucher ni `synthese-biologie-v2`, ni son entrée, ni le contrôle de D-545 §4. Le second appel reste en pause (D-556 §7).
- Aucun texte clinique hors des textes validés de D-539, D-545, D-557, D-559, D-563 et D-571, et aucune retouche de ces textes sans décision. Aucune ligne de la grille de D-545 §2 modifiée.
- Ne toucher ni au calcul des scores, ni aux libellés, ni à leur affichage au praticien.
- Aucun dossier réel visé, aucune donnée patient envoyée au fournisseur, forme opaque au dépôt (D-251 §4). Pas de `prisma format`.
