# Handoff — H95 part B : `synthese-v44` (texte 12 de D-573), évaluation de l'appel principal seul non conforme

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-entree-libelle-code` (#2386, brouillon). `origin/main` y a été fusionnée deux fois, après le merge de D-573 (#2398, `6584dd10`) puis en clôture, sans fichier commun.
- Code évalué : `83eee898`. Le commit de clôture (constat, changelog, handoff) vient ensuite.
- Lot `h95-b-entree-libelle-code` (file B, carnet D-510), repris le 2026-11-28 puis **rangé `bloque`** : verdict non conforme, suite au responsable.
- La PR reste en **brouillon, non déclarée « prête »**.

## 2. Objectif

Appliquer D-573 : texte 12 au contrat de sortie, `synthese-v44`, sur la base de v43. Puis évaluer l'appel principal seul sur 75 sorties (D-573 §4) avant toute déclaration « prête ».

## 3. Décisions prises

- Texte 12 inséré par script depuis la ligne `  > ` de D-573, en paragraphe neuf après « ## Format de sortie ». Le garde le reconstruit depuis la décision et vérifie que, hors du texte 12, le contrat est celui de v43, au caractère près.
- Empreintes :
  - contrat `32590ab4a46424b6` ;
  - consigne allumée `f013ddc951252d1b` ;
  - consigne alimentaire inchangée (`e0c328690bba65a7`), qui hache la seule gouvernance ; sa version suit.
- Cotation (D-545 §6) :
  - quatre lectures de la session, par des sous-agents lancés par l'outil Agent, sans Workflow ;
  - quatre avis Codex `--mode revue` ;
  - verdicts motivés sur chaque désaccord.
- **Verdict : non conforme, 5 sur 75**, toutes en ligne 10 :
  - la forme restante (résultat déclaré en argument et en titre d'axe), sur un dossier et ses trois passages ;
  - un titre d'axe qui dit le niveau de deux messagers ;
  - un examen non déclaré présenté comme réalisé.

  Constat : journal H95, `2026-11-28-01`.

## 4. Fichiers modifiés

- `web/src/lib/anthropic.ts` : texte 12, `synthese-v44` et son commentaire.
- Gardes :
  - `promptBiologie.guard.test.ts` : texte 12, contrat v43 hors texte 12, empreinte ;
  - `promptAlimentaire.guard.test.ts` et `anthropic.corpusActif.guard.test.ts` : empreintes ;
  - `biologie.generation.test.ts`.
- Banc : `web/scripts/eval-d539/evaluation.eval.ts` (v44, D-573 §4) et `paquets-codex.mjs` (lectures 2305 à 2307).
- `changelog.d/2026-11-28-h95b-d573-code-synthese-v44.md`, journal H95 `2026-11-28-01-…`, ce handoff.

## 5. Validations exécutées

- `npm run check:rapide`, puis `npm run check` (T1 complet), verts avant le commit du code. Les 597 tests de synthèse sont verts.
- Évaluation :
  - un essai de fumée, conforme ;
  - les 75 générations : 75 HTTP 200, un appel chacune, entrées conformes 75/75.
- Cotation : quatre lectures de la session et quatre avis Codex, codes 0. Pièces au dépôt privé des revues, sous `h95-d573-evaluation-2026-11-28/`. Copie locale : `~/Developer/wn-eval/h95-d573-2026-11-28/`.
- T3 n'a pas été rejoué sur v44 : la PR n'est pas déclarée « prête ». Il reste à jouer avant toute déclaration.

## 6. Problèmes ouverts

- La forme du résultat déclaré en argument d'axe résiste à cinq versions de la consigne : trois textes dans la section « Résultats de biologie », puis le texte 12 au contrat de sortie. Les voies restantes, écartées le 2026-11-26 au profit de la voie 1, sont :
  - voie 2 : une autre lecture de la grille ;
  - voie 3 : un contrôle par le code en sortie ;
  - ou une retouche qui agisse sur l'entrée, en retirant de l'anamnèse transmise le résultat qu'elle rapporte.
- Deux formes isolées sont apparues : un titre d'axe qui dit le niveau de deux messagers, et un examen non déclaré présenté comme réalisé.
- Un doute est non tranché, sans effet sur le verdict : « explorations diagnostiques en cours », affirmé, de nature non dite, sans examen déclaré.
- Problèmes ouverts de #2386, inchangés : le titre de passation de `Q_INF_02` peut nommer l'état ; une section du DNST sans « — » ferait échouer la synthèse.

## 7. Prochaine action exacte

Au responsable :
- lire le constat (journal H95, `2026-11-28-01`) ;
- dire la suite : une nouvelle retouche de texte, un contrôle par le code en sortie, une action sur l'entrée, ou une autre lecture de la grille.

La PR reste en brouillon d'ici là.

## 8. Interdits encore actifs

- Ne pas merger ni déclarer « prête » #2386 : `synthese-v44` n'est pas servie, et `synthese-v39` reste en service.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`. Ne retoucher ni `synthese-biologie-v2`, ni son entrée, ni le contrôle de D-545 §4. Le second appel reste en pause (D-556 §7).
- Aucun texte clinique hors des textes validés de D-539, D-545, D-557, D-559, D-563, D-571 et D-573, et aucune retouche sans décision. Aucune ligne de la grille de D-545 §2 modifiée.
- Ne toucher ni au calcul des scores, ni aux libellés, ni à leur affichage au praticien.
- Aucun dossier réel visé ; forme opaque au dépôt (D-251 §4). Pas de `prisma format`. Pas de merge par la session.
