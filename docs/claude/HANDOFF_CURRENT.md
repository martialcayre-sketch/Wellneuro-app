# Handoff — 2026-08-03 — LOT-02 clos : rayon `douleur`, et une allowlist reprise en défaut

## Git

- Worktree `.claude/worktrees/lot-02-rayon-douleur`, branche
  `worktree-lot-02-rayon-douleur`, partie de `main` à `3b96170b` (**après** le
  merge de #550/LOT-06, survenu pendant cette session).
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`,
  reliquat du **LOT-02**, palier T2.
- Clôture et handoff écrits **sur la branche vivante**, avant la PR.

## Objectif atteint

Brancher le rayon corpus `douleur` (notebook 06 — Douleurs chroniques) sur la
recherche corpus praticien, ce que #546 n'avait pas pu faire : le notebook 06
n'avait alors aucun claim validé. **La condition est levée** — le corpus entier
est signé. Le LOT-02 passe de `partiel` à `livré`, et le LOT-01 est clos **sur
preuve**.

## Le fait qui a rouvert le lot, vérifié en base et non dans un document

`execute_sql`, agrégat par `rag_corpus_chunks.notebook` :

| claims actifs | VALIDE | en attente | VALIDE sans validateur |
|--------------:|-------:|-----------:|-----------------------:|
|         8 224 |  8 224 |      **0** |                  **0** |

Les douze notebooks 01→12 sont à 100 % (06 = 651/651). Le 13 « Instruments »
reste à 0 claim **par conception**. Tout document annonçant « 2982 en attente »,
« 06/11/12 non validés » ou « restant à ingérer » est périmé.

Deux contrôles avant d'écrire une ligne de code, qui auraient chacun produit un
rayon silencieusement vide s'ils avaient échoué :

- `'06 — Douleurs chroniques' = notebook` rend **vrai** (102 chunks) — le libellé
  du mapping correspond au caractère près, tiret cadratin compris ;
- les 651 claims portent 16 `source_id`, **tous** parmi les 17 que le registre
  déclare pour ce notebook (seule `WN-SRC-0176` n'a aucun claim) : le
  `filter_source_ids` recouvre la donnée.

## Le défaut de la revue — la même règle prise en défaut à l'autre bout

`/api/praticien/complements/corpus` (tiroir justificatif du catalogue
compléments) validait `rayon` par une **regex syntaxique seule**, puis passait la
valeur à `servirRayonCorpus`. Elle servait donc **toute** entrée de
`RAYON_VERS_NOTEBOOK` derrière `WN_C4_ENABLED` — allumé en production — sans
jamais consulter `WN_RECHERCHE_CORPUS_ENABLED`.

Conséquence si le lot avait été mergé tel quel : `?rayon=douleur` sur cette route
aurait rendu des claims du notebook 06 **dès le merge**, alors que le lot annonce
un lancement dark. Et le jour où l'on éteint le drapeau pour une raison clinique
— un claim douleur fautif à retirer — l'interrupteur n'aurait rien coupé.

C'est le **miroir** du défaut jugé bloquant sur #546 : là on sortait de la
recherche corpus vers micronutrition, ici on y entre par la porte compléments.
`cognition` et `intestin` y étaient déjà exposés depuis #546.

Corrigé par une allowlist d'un seul rayon (`rayonBrut !== RAYON_MICRONUTRITION`).
Aucun appelant ne passait autre chose (`FicheComplementPanel`, prop par défaut
jamais surchargée) : rien ne casse, et l'exposition héritée se ferme avec.

## Décisions à ne pas rejouer

1. **Une allowlist par route, jamais la carte entière.** Ajouter une paire à
   `RAYON_VERS_NOTEBOOK` n'est pas un geste local : il faut relire **toutes** les
   routes qui acceptent un `rayon` en entrée libre. La règle existait depuis
   #546 ; elle n'avait été appliquée qu'à la route qui l'avait révélée.
2. **Les listes de rayons refusés sont désormais dérivées du mapping**
   (`Object.keys(RAYON_VERS_NOTEBOOK).filter(…)`), dans les deux routes : le
   prochain rayon ajouté sans allowlist est couvert par les tests d'office. Une
   liste littérale ne protège que du passé.
3. **Un test qui mocke le service ne prouve que le routage.** Le titre du test
   `douleur` le dit maintenant, et un test distinct lie `douleur` au
   `filter_source_ids` du notebook 06 — sans lui, `douleur: '05 — Cognition et
   mémoire'` passerait toute la suite au vert en servant des claims de cognition
   sous l'étiquette « Douleurs chroniques ».
4. **Écarté** : ouvrir `stress`, `humeur`, `sommeil` dans la foulée. Ils sont
   mappés, validés à 100 %, et sans appelant — décision produit, hors périmètre.
5. **Écarté** : clore le LOT-01 en l'exécutant. Il n'y avait plus rien à valider ;
   il est clos sur preuve, avec son critère « modalité de revue tracée » laissé
   **décoché** — l'information est dans les journaux de décision, pas reconstituée.

## Validations exécutées

**T1** vert (3 451 + 92 Vitest, 70 bancs Node, anti-secrets 0). **T2**
`test:worktree -- --fast` **vert en 6 min 9 s**, E2E compris.

⚠ La **première** passe de T2 avait rendu 2 échecs sur
`e2e/portail-lien-magique.spec.ts:48` (Chromium + iPhone 13) — l'anti-oracle de
temps documenté comme flake local. La seconde passe, après correctifs, est verte
sans rien changer à ce sous-système : c'était bien le flake, pas une régression.

Revue adversariale `wn-reviewer` : **GO** sous réserve du MAJEUR ci-dessus,
tranché par le praticien en session (« fermer dans cette PR »).

## Pièges rencontrés

- **Le checkout principal était en retard d'un commit** (`92adb17a` au démarrage,
  `main` réel à `3b96170b`) : les premières lectures de `CAMPAGNE.md` y ont montré
  un état périmé — LOT-04 `à_faire`, LOT-05/06 absents — et m'ont fait annoncer un
  écart documentaire qui n'existait pas. **Lire les documents de campagne depuis
  le worktree du lot, jamais depuis le checkout principal**, ou faire
  `git pull --ff-only` avant.
- `main` a avancé **pendant** la session (#550 mergée). La branche en est partie,
  aucun conflit.
- Worktree neuf : `npx prisma generate` avant `npm run check`.

## Problèmes ouverts

- **`stress`, `humeur`, `sommeil`** : mappés, 100 % validés, sans appelant. Trois
  lignes de code chacun ; c'est la décision produit qui manque, pas le code.
- **`lot_courant: "LOT-06"`** dans l'en-tête de `CAMPAGNE.md` alors que #550 est
  mergée — non touché ici, ce n'est pas le lot de cette PR. La ligne du tableau,
  elle, a été corrigée en `livré (#550)`.
- **LOT-05 toujours `livré_partiel`** : la table d'orientation porte ses six
  règles mais n'est pas signée. Tant que la signature clinique n'a pas eu lieu,
  le LOT-06 livré ne peut afficher que « en cours de constitution ».
- Le critère « modalité de revue tracée » du LOT-01 reste décoché.

## Prochaine action exacte

Ouvrir la PR de ce lot, lire son `verify`, merger. Ensuite, deux candidats sans
dépendance : le **LOT-07** (reliquat de certification, bibliographie et
psychométrie), ou la **signature clinique des six règles du LOT-05** — geste
praticien, qui débloque l'affichage réel du LOT-06.

## Interdits encore actifs

Aucune migration, aucune écriture Supabase (lectures seules ici), aucun
changement clinique. `WN_RECHERCHE_CORPUS_ENABLED` reste **éteint** : l'allumer
est un geste de production distinct, postérieur au merge. Ne jamais forcer un
merge sur une PR gelée en `action_required` — `enforce_admins` est actif,
`verify` obligatoire. Après un merge en squash, repartir de `main`.
