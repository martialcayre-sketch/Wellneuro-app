# Handoff — H95 part B : `synthese-v42` (D-563), évaluation de l'appel principal seul non conforme

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-ligne10-v42`, née d'`origin/main` après le merge de #2351 (`45829112`).
- Commit du code évalué : `bf80a749`. Lot `h95-b-ligne10-v42` (file B, carnet D-510), **rangé `bloque`** : le verdict est non conforme et la suite revient au responsable.
- PR en brouillon, **non déclarée « prête »** : rien de ce lot ne se merge en l'état.

## 2. Objectif

Servir `synthese-v42` (D-563 §3 et §4) après une évaluation conforme de l'appel principal seul (D-563 §5) : consigne, empreintes, gardes et banc, puis évaluation et cotation.

## 3. Décisions prises

- Base v41 reprise de #2348 telle quelle (`main` n'avait pas touché ces fichiers). Les textes 5 à 7 et l'exemple du contrat ont été insérés par script, recopiés des lignes `  > ` de D-563.
- Le texte 5 est placé « à la suite du texte 3 de D-559 », comme le dit D-563 §3. Le « troisième paragraphe » de D-563 compte les paragraphes de D-557. Dans la section, ce paragraphe est le quatrième, si l'on compte celui de D-545 §5.
- D-559 : un renvoi à D-563 est ajouté à son statut. Sans lui, le banc `version-prompt-documents` est rouge : une décision du jour ne peut pas citer une version de consigne dépassée par le code.
- Les paquets de lecture recopient 1333, 1334 et 1335 de D-563 §2, sans la phrase finale qui donne l'avis Codex, pour garder la lecture à l'aveugle.
- **Verdict : non conforme**, 17 générations en violation sur 75 (34 sous v41), dont 11 communes aux deux lectures.
- Quatre lectures de la grille, posées par le responsable en séance : `20261125-1640-b-h95` A, `1641` C, `1642` A, `1643` A. Elles sont au registre (`repondue`) et au journal H95, `2026-11-25-05`.

## 4. Fichiers modifiés

- `web/src/lib/anthropic.ts` : les textes, l'exemple du contrat, `synthese-v42` et son commentaire.
- Gardes : `promptBiologie.guard.test.ts`, `promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts`, `biologie.generation.test.ts`.
- Banc `web/scripts/eval-d539/` : `dossiers.ts` (dossier 25), `evaluation.eval.ts` (v42, D-563 §5), `paquets-codex.mjs` (lectures de D-559 et de D-563).
- `docs/decisions/D-559.md` : le renvoi à D-563, au statut.
- Journal H95 `2026-11-25-05-part-b-evaluation-synthese-v42.md`, `changelog.d/2026-11-25-h95b-synthese-v42-code.md`, et ce handoff.

## 5. Validations exécutées

- `npm run check:rapide` vert. `npm run check` (T1 complet) : un premier passage rouge sur `version-prompt-documents`, corrigé par le renvoi de D-559 ; le banc est vert depuis.
- `npm run test:worktree` (T3) : vert, 10 min 37 s.
- Essai de fumée (dossier 25, 1 passage), puis les 75 générations : 75 HTTP 200, entrées conformes 75/75, aucun second appel.
- Cotation : quatre lectures de la session, indépendantes ; quatre avis Codex `--mode revue` (code 0) ; un avis Codex à l'aveugle sur les quatre questions (code 0).
- Pièces au dépôt privé des revues, sous `h95-d563-evaluation-2026-11-25/`. Copie locale : `~/Developer/wn-eval/h95-d563-2026-11-25/`.

## 6. Problèmes ouverts

- `synthese-v42` est non conforme. Selon D-563 §3, la suite passe par une nouvelle décision de retouche, puis par un nouveau rejeu de l'appel principal en entier.
- La forme dominante de v41 a reculé (6 générations, contre la quasi-totalité de 34), sans être fermée. Restent :
  - un niveau de messager à l'indicatif, ou un « profil » sans sous-score (5) ;
  - des symptômes renommés d'un état biologique (2) ;
  - un examen présenté comme existant (2) ;
  - un résultat rapporté par l'anamnèse, en argument d'axe et une fois au narratif (2).
- Questions `20261125-1640` à `1643-b-h95` : `repondue`, à passer à `close` avec la décision suivante.
- Le banc de la branche (dossier 25, lectures de D-559 et de D-563) n'est pas sur `main`.

## 7. Prochaine action exacte

Au responsable :
- lire le constat (journal H95, fragment `2026-11-25-05`) ;
- dire la suite : une nouvelle décision de retouche (D-563 §3), ou une autre voie.

La PR de ce lot reste en brouillon d'ici là.

## 8. Interdits encore actifs

- Ne pas merger ni déclarer « prête » la PR de ce lot : `synthese-v42` n'est pas servie.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`. Ne retoucher ni `synthese-biologie-v2` ni le contrôle de D-545 §4. Le second appel reste en pause (D-556 §7).
- Aucun texte clinique hors D-557 §2, D-559 §3 et D-563 §3 et §4, et aucune retouche de ces textes sans décision.
- Aucun dossier réel visé, aucune donnée patient envoyée au fournisseur, forme opaque au dépôt (D-251 §4).
