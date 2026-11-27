# Handoff — H95 part B : D-573 acceptée (texte 12 au contrat de sortie, `synthese-v44`), décision seule

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-d573-retouche`, née d'`origin/main` (`1f47a0a0`).
- Lot `h95-b-contrat-arguments` (file B, carnet D-510) : documentation seule, sans code ni migration.
- #2386 (lot `h95-b-entree-libelle-code`, `bloque`) reste en brouillon : son évaluation de `synthese-v43` est non conforme. Elle porte l'entrée de D-571 §3, les textes 8 à 11, les gardes et le banc.

## 2. Objectif

Instruire la décision qui suit le verdict non conforme de `synthese-v43` (D-571 §4). Le responsable a choisi la voie 1 : retoucher la consigne sur la seule forme restante, un résultat déclaré par l'anamnèse en argument et en titre d'axe.

## 3. Décisions prises

- **D-573** (numéro réservé par `wn-reserver-decision.mjs`), acceptée telle quelle le 2026-11-27 (`20261127-1925-b-h95`). Codex, à l'aveugle : B, que le texte 12 bloque « prête » ; écarté, comme sous D-571 §7.
- **Texte 12** (`20261127-0005-b-h95`, A'), validé mot pour mot : un paragraphe neuf juste après « ## Format de sortie », avant « Réponds exclusivement en JSON valide… ». Rien ne suit la structure JSON : un garde exige que le contrat finisse par `}`. Codex, à l'aveugle : A, confiance moyenne ; A' lève sa réserve.
- Version `synthese-v44` ; `synthese-v43` n'a jamais été servie.
- D-571 reçoit sa note d'amendement par D-573.

## 4. Fichiers modifiés

- `docs/decisions/D-573.md` (neuf), `docs/decisions/D-571.md` (note d'amendement).
- `changelog.d/2026-11-27-h95b-d573-contrat-arguments.md`.
- `docs/claude/plan-journal/H95/2026-11-27-01-part-b-d573-contrat-arguments.md`.
- Ce handoff.

## 5. Validations exécutées

- `npm run check` (T1 complet) vert avant le commit, `version-prompt-documents` compris. Le seul avertissement est le trou habituel des numéros réservés.
- Deux avis Codex `--mode question`, code 0. Paquets et avis hors dépôt : `~/Developer/wn-eval/h95-d573-questions/`, à verser au dépôt privé des revues sous `h95-d573-questions/`.

## 6. Problèmes ouverts

- La proximité du contrat de sortie est une hypothèse, pas une efficacité démontrée (réserve de Codex). Un nouvel échec renverrait aux voies 2 (lecture de la grille) ou 3 (contrôle par le code en sortie).
- Problèmes ouverts de #2386, inchangés : le titre de passation de `Q_INF_02` peut nommer l'état ; une section du DNST sans « — » ferait échouer la synthèse.

## 7. Prochaine action exacte

Après le merge de cette décision, faire le lot de code sur la branche de #2386 (`b-h95-entree-libelle-code`, après fusion d'`origin/main`) :
- insérer le texte 12 par script depuis la ligne `  > ` de D-573 ;
- passer à `synthese-v44`, reporter les empreintes (contrat, section, consigne allumée, alimentaire), et poser le garde qui construit le contrat attendu depuis D-573 ;
- mettre le banc à `synthese-v44`, avec les réponses `2305` à `2307` recopiées dans les paquets ;
- rejouer les 75 sorties et coter selon D-545 §6.

## 8. Interdits encore actifs

- `synthese-v39` reste en service jusqu'au merge du lot de code après un verdict conforme. Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`. Ne retoucher ni `synthese-biologie-v2`, ni son entrée, ni le contrôle de D-545 §4. Le second appel reste en pause (D-556 §7).
- Aucun texte clinique hors des textes validés de D-539, D-545, D-557, D-559, D-563, D-571 et D-573 ; aucune retouche sans décision. Aucune ligne de la grille de D-545 §2 modifiée.
- Ne toucher ni au calcul des scores, ni aux libellés, ni à leur affichage au praticien.
- Aucun dossier réel visé ; forme opaque au dépôt (D-251 §4). Pas de `prisma format`. Pas de merge par la session : l'intégrateur merge.
