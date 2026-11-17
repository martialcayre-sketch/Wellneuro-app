# Handoff — lot `autonomie-pieges-restes`, partie 5 (tête) : un commentaire placé dans l'appel ne fait plus sauter un fichier dans la garde des flux (2026-11-17)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie5`, tirée d'`origin/main` e6398626. Worktree : `.claude/worktrees/orch-ci`.
- PR en cours de la même session : #2219 (lot `journal-cles-soulignees`), sans fichier commun avec celle-ci.
- Fichier de code touché : `web/src/lib/anthropicFluxBorne.guard.test.ts`, un banc, sans code de production. Aucune migration, rien de clinique.

## 2. Objectif

Traiter l'élément routé en tête de la partie 5 : la focus area « Garde affaiblie » de PR-Agent sur #2209. Le tri de #2209 ne lisait que les fichiers où l'appel figure tel quel dans le texte brut. Un fichier qui contient `a.messages.stream/* x */(` était donc sauté sans bruit, alors que le contrôle `incertains` le relevait avant #2209.

## 3. Décisions prises

- Le tri passe par `aLire(source)`, qui retient tout fichier dont le texte brut contient `messages` et `stream` ou `create`. Ce tri est sûr : le masquage remplace chaînes et commentaires par des espaces sans rien déplacer, si bien que tout appel lu après masquage a ses mots dans le texte brut.
- Ajout d'un témoin : `APPEL` brut ne voit pas cet appel, `aLire` retient le fichier et `fluxSansSignal` relève le fautif.
- Le banc prend environ 100 ms (85 ms avec le tri de #2209, 1 561 ms avant celui-ci).
- Une PR, une finalité. Les autres pièges de la partie 5 viennent dans des PR suivantes.

## 4. Fichiers modifiés

- `web/src/lib/anthropicFluxBorne.guard.test.ts`
- `changelog.d/2026-11-17-autonomie-pieges-partie5.md`
- ce handoff

## 5. Validations exécutées

- Banc seul : 4 tests sur 4, en 101 ms.
- Mutation : quand `aLire` est ramené à l'ancien tri (`APPEL` brut), le témoin rougit (1 échec sur 4). Rétabli, il revient au vert.
- T1 complet : voir la PR.

## 6. Problèmes ouverts

- **Pièges encore à traiter dans le lot** (handoff `2026-11-16-2343-autonomie-pieges-restes-p5.md`, §6) :
  - quatre pièges E2E ;
  - lot d'ingestion de plus de 10 claims ;
  - listes jumelles ;
  - release-db sur 504 ;
  - one-off Scalingo recyclé ;
  - réservation WN-SRC ;
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `echo code=$?` en fond ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».
- **P3 assumés du crochet** : à ne reprendre que sur un cas réel.
- **Lot `synthese-enregistrer-verrou`** (ordre 88) : `pret` en file D.

## 7. Prochaine action exacte

1. Commit, push, PR (`--body-file`), `wn-attendre-ci` en fond, puis preuve PR-Agent.
2. Verdicts, puis « prête @<sha> » sur la PR et au registre.
3. Lot suivant : `synthese-enregistrer-verrou` (route praticien, concurrence, revue `wn-reviewer`).

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs` : il est chez F05.
- Ne jamais supprimer une ligne des registres.
- Horodater en lisant l'heure système, jamais à l'estime.
