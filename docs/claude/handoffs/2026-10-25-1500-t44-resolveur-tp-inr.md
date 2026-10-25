# Handoff — t44, second lot : TP et INR au résolveur, re-signé (D-363)

## Branche et état du dépôt

- Branche `lot/t44-resolveur-tp-inr`, worktree `d281-lot3-portail`, partie de
  `origin/main` (7bbe762a). Aucune migration, aucun schéma : la table du
  résolveur et sa signature seulement.

## Objectif

Solder la ligne t44 du plan (D-361 §6) : « Taux de prothrombine » et « INR »
proposent leur fiche à l'import. Préalable rempli : la migration
`20261024220000_catalogue_biologie_tp_inr` est appliquée et constatée
(#1692, `BIO_TP` en %, `BIO_INR` en « ratio », 94 analytes).

## Décisions prises

- Libellés arbitrés par D-361 §6, repris tels quels : deux entrées, sans
  synonyme ; temps de Quick patient et témoin jamais rattachés.
- Re-signature posée sur l'instruction du responsable (question à options du
  2026-10-25) : SHA `b4007b9c…`, 177 entrées, 87 analytes, datée
  `2026-10-25T10:52:31.000Z`. Elle remplace celle de D-356 (`D-363`).
- Numéro : décidé au merge, sur arbitrage du responsable. D-362 est
  revendiqué par #1701 et D-361 à D-363 par #1693, déjà en collision avec
  main. #1701 mergée (D-362, ac835c41), main fusionné : D-363 tient la
  suite. Il se revérifie libre juste avant le merge.

## Fichiers modifiés

- `web/src/lib/biology-library/import/resolverLibellesV1.ts` : deux entrées
  sous un commentaire D-361 §6, METADATA, commentaire « RE-SIGNÉE PAR ».
- `import/resolverLibellesV1.test.ts` : test « sans fiche » réécrit (TP et
  INR en sortent, le temps de Quick reste « inconnu ») ; banc TP/INR (INR
  sans unité résolu et concordant ; « TP » nu, « Temps de prothrombine »
  et le temps de Quick en s restent « inconnu »).
- `docs/DECISIONS.md` (D-363), `docs/claude/PLAN_WELLNEURO.md` (ligne t44
  soldée), `changelog.d/2026-10-25-t44-resolveur-tp-inr.md`, SESSION_LOG.

## Validations exécutées

- Vitest `biology-library/import` : 322 verts, signature posée. Sans elle,
  68 rouges : le verrou s'était refermé, c'est voulu.
- T1 rapide : vert sauf `decisions-check`, et `bancs-outillage-check`
  rouge sur la même cause (trou à D-362 tant que #1701 n'est pas sur main).
- `/code-review medium` : quatre remarques. Corrigé : l'espace parasite du plan ; les bornes de la correspondance exacte (« INR cible », « INR (patient) », « Temps de Quick », « Temps de Quick (TP) » restent « inconnu »). Écarté : le SHA dépend de l'ordre des entrées, voulu (toute retouche referme le verrou).
- T3 : arrêté sur le même banc de numérotation, à rejouer en entier après
  la fusion de main. Résultat dans la PR.

## Problèmes ouverts

- Numéro D : il dépend de l'ordre des merges des autres sessions (#1701,
  #1693).
- Les lignes TP/INR déjà importées restent « inconnu » (rattachement à la
  main) ; constat des prochains imports par conteneur, en agrégats.
- Correspondances NABM de TP et INR : geste du praticien dans la
  Bibliothèque.

## Prochaine action exacte

Rejouer T3, CI, CodeRabbit sur la tête,
vérifier le numéro, merge, observer le déploiement. Puis faire le constat par
conteneur dès qu'un compte rendu avec TP ou INR arrive.

## Interdits encore actifs

- Un merge à la fois, aucun auto-merge ; jamais d'image antérieure à
  257807e3 ; ne pas toucher `lot/file-a-suivant`,
  `j3-12d-badges-preuve-masques`, `lot/t23-restes-verificateur`, ni les PR
  des autres sessions (#1693, #1701) ; hors périmètre : t45 (acides gras),
  m38, WN_CONSTAT_BESOIN, signature NABM de TP/INR.
