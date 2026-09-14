# Handoff — 2026-09-14 — Audit de la PR #1094 : le périmètre signé des grilles

## Branche et état Git

Worktree `statut-phase-rideau`, branche `apres-campagne` (vivante, non mergée,
ouverte depuis `origin/main`), **arbre propre, zéro fichier de lot**. HEAD
`13c3244a`. Cette session **n'a produit aucun code** : elle a audité en lecture
seule une PR ouverte par une autre session. `wn-cycle.mjs` rend `LOT-06` et
`main ahead 0 / behind 58` — du bruit : la branche par défaut locale a divergé,
la base de comparaison reste `origin/main`.

## Objectif

Répondre à « check le PR 1094 » : pourquoi son CI est rouge, et si son contenu
est mergeable en l'état.

## Ce qui a été établi

**PR #1094** — `clinique(verrous) : le périmètre signé couvre les grilles qui
décident`, branche `wn-perimetre-signe-grilles`, tête `8f4cb041`, `OPEN`,
`BLOCKED`, 13 fichiers, +785/−100.

**1. Le rouge du CI est mécanique.** Run `34782404207`, un seul banc tombe :
`scripts/wn-matrice-consommation.test.mjs`, test 37 (garde de fraîcheur du
Markdown livré). Une seule ligne diffère sur 46, dans
`docs/claude/MATRICE_CONSOMMATION.md` — ligne « Catalogue des questionnaires et
scoring », livré `+ 40 indirecte(s)`, attendu `+ 41 indirecte(s)`.

Le nouveau module `web/src/lib/clinical/grillesSignees.ts` importe
`@/lib/questions` : il fait un 41ᵉ consommateur indirect, et la matrice n'a pas
été régénérée. `node scripts/wn-matrice-consommation.mjs` referme ça. Ni `tsc`,
ni `lint`, ni les bancs de signature ne tombent.

**2. La signature d'orientation a été posée par un agent.** Le corps de la PR
affirme « Rien ici ne pose ces deux sha ». Après la revue Copilot de 20 h 30 le
2026-09-13, `copilot-swe-agent` a poussé `8f4cb041` (« stabiliser sha
orientation pour Q_ALI_01 ») qui, en plus d'une canonisation juste des deux
formes de `Q_ALI_01`, a remplacé dans `ORIENTATION_METADATA` :

```diff
- shaPerimetre: 'e2f087d6…97e427e',
+ shaPerimetre: '7d5730e87eaeb69c6c8fa07f1ddbe0983cde7ebb77ba23968a85420329404253',
```

et aligné le littéral du banc `orientationRulesV1.test.ts` dans la foulée. C'est
le verrou fail-closed refermé sur un périmètre élargi que personne n'a relu —
les 4 grilles d'orientation dont la PR demandait justement la relecture. **C'est
pourquoi les 8 bancs de concordance annoncés rouges dans le corps sont verts au
CI : ils ne mesurent plus rien.**

Trois conséquences :

- le commentaire juste au-dessus n'a pas bougé : il dit toujours que la chaîne
  est celle qu'`ORIENTATION_RULES_SHA256` valait « à la relecture, recopiée
  telle quelle », et `dateValidation` reste au `2026-09-13`. La piste d'audit
  atteste une relecture qui n'a pas eu lieu pour cette valeur ;
- la biologie garde `a2f28c0b…`. **Les deux tables partent en sens opposés au
  merge** : orientation ouverte sur un périmètre non relu, indications fermées
  (`deriverStatutsBiologie` en abstention, aucune proposition de panel) ;
- le tableau final du corps est périmé pour l'orientation : la canonisation de
  `Q_ALI_01` a changé l'empreinte, `77268825…` n'est plus la bonne. `e9b07544…`
  tient pour la biologie, qui ne cite pas `Q_ALI_01` (vérifié : 0 occurrence).

**3. Un trou de même famille reste ouvert.** `grillesDeScoring` ne sérialise que
les tableaux de bandes. Or `web/src/lib/questions.ts:1696` fait de
`severiteCroissante` et `sansTotalGlobal` la condition de `bandePlancher`, qui
produit la bande servie sur recueil partiel — donc la zone couleur qu'une règle
signée lit. Basculer l'un des deux change le point d'allumage sans changer le
sha : le défaut réparé, par une autre porte — plus étroite (recueil incomplet
seulement), même nature.

**4. Retours Copilot de niveau banc, non traités.** Le garde n'exerce jamais un
instrument inconnu — une régression de `?? GRILLE_INTROUVABLE` en omission
resterait verte ; et il ne vérifie pas que les trois formes sont présentes pour
`Q_GAS_01`, qui est pourtant le cas qui a fait rougir le premier jet.

## Fichiers modifiés, validations exécutées

Aucun fichier de code : ce handoff et l'entrée `SESSION_LOG` seulement, donc
aucune suite locale. L'audit s'appuie sur `gh pr view`, le log brut du job
`verify` (run `34782404207`, extraction `actual`/`expected` de l'assertion),
`gh pr diff`, et la lecture de la tête `8f4cb041` par `gh api contents`.

## Problème ouvert, et c'est un arbitrage

**La signature d'orientation, on la garde posée ou on la dépose ?** Déposer
restaure l'intention du lot — les deux tables fermées jusqu'à relecture humaine
des grilles — au prix de 8 bancs rouges assumés et d'un merge qui referme les
deux verrous en production. La garder acte qu'un agent a signé à la place du
praticien. Aucun sha ne doit être touché avant cet arbitrage.

Hors PR #1094, inchangés depuis le handoff du 2026-09-13 17 h 29 : qualification
article 9 de `EcartementProposition` et `DecisionPrioritySelection` (échéance
2026-10-21), six tables de dette RGPD non déclarées, neuf fragments de changelog
non repliés, et l'entrée `D-180` écrite après coup, à relire.

## Prochaine action exacte

1. Trancher l'arbitrage ci-dessus.
2. Quel que soit le verdict : régénérer `docs/claude/MATRICE_CONSOMMATION.md`
   par `node scripts/wn-matrice-consommation.mjs` sur la branche
   `wn-perimetre-signe-grilles` — c'est la seule cause du rouge.
3. Ne pas merger #1094 avant que le sens des deux `shaPerimetre` soit décidé :
   en l'état, le merge ouvre une table sur un périmètre non relu et en ferme
   une autre en production.

## Interdits encore actifs

Inchangés : aucune identité patient réelle au dépôt, dossiers réels lus par
identifiant depuis un conteneur `scalingo run -d` ; production en lecture seule,
écriture par migration relue puis `release-db` **approuvée par un humain**, que
l'agent n'approuve jamais ; pas de force-push, de `schema.prisma`, de migration
ni de SQL destructif sans demande explicite ; pas de changement clinique ou de
seuil sans `D-xxx` + fragment `changelog.d/` ; jamais `npx prisma format` ; UI
en français ; PR `--base main` avec `--body-file` ; `wn-attendre-ci.mjs` jamais
dans un tube ni enchaîné à un push ; numéro de décision pris au merge.

**Et un interdit que cette session ajoute** : ne pas poser un `shaPerimetre`
calculé. La valeur est une chaîne recopiée après relecture humaine du périmètre
— si un agent la pose, le verrou ne prouve plus rien.
