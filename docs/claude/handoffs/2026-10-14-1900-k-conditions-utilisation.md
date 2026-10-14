# Handoff — 2026-10-14 — lettre k (F77) : D-292, les conditions d'utilisation de l'espace patient

## Branche et état Git

`docs/k-conditions-utilisation`, dans le worktree
`.claude/worktrees/k-conditions-utilisation`, partie d'`origin/main` 6fc65160
(#1440). Un commit de doc, aucun code. Non poussée : D-292 n'est contiguë
qu'après le merge de #1444, qui tient D-291.

## Objectif

Session consacrée à la file C du plan. Aucune place n'y est codable : ACT-1
(place 1) attend k, G-8, J2-base et J2-cc8 ; les places 2 à 5 attendent
ACT-1. Le responsable a choisi le premier jet de k, seul préalable de la
place 1 qui ne dépend ni de BP-09 ni d'une migration.

## Décisions prises

- Les quatre textes d'information sont fusionnés mot pour mot, avec un seul
  renvoi corrigé, en « Conditions d'utilisation de votre espace Wellneuro ».
  Une partie 5 neuve dit comment elles évoluent ; l'e-mail aux patients
  suivis est rédigé.
- Arbitrages du 2026-10-14 : le nom (sans « générales ») ; les durées de
  D-283 §2 renvoyées à une version suivante. Textes **validés tels quels**.
- D-292 : un accusé à chaque version ; mur d'accueil pour un nouveau patient
  seulement ; lien par e-mail, accusé par POST ; filet au dépôt
  (D-269 §6 amendée) ; rien ne change avant ACT-1.

## Fichiers modifiés

- `docs/claude/propositions/2026-10-14-k-conditions-utilisation/README.md`
  (neuf : assemblage, partie 5 et e-mail mot pour mot).
- `docs/DECISIONS.md` (D-292 en tête).
- `docs/claude/PLAN_WELLNEURO.md` (porte 13, ligne k, mise à jour de F77).
- Fragment `changelog.d/2026-10-14-k-conditions-utilisation.md`, SESSION_LOG,
  ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : vert sauf `decisions-check` et deux tests de
  `bancs-outillage-check` (504/506), tous trois sur le même trou attendu,
  D-291 absente de main. `ancres-check` vert ; anti-secrets des lignes
  indexées OK. Lot de doc : pas de T2.

## Problèmes ouverts

- D-291 tenue par #1444 (publiée) ; la lettre cj, commit local non poussé de
  la copie principale, porte aussi D-291 et devra prendre D-293.
- Durées de conservation (D-283 §10 a) : une version suivante des conditions.
- Durée de validité du lien et sa forme : code d'ACT-1, sans migration selon
  H70.

## Prochaine action exacte

1. Après le merge de #1444 : rebase sur `origin/main`, T1 complet vert, push,
   PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, lecture
   des commentaires de revue, merge.
2. Puis u (H37) et G-8 (H50), qui attendaient k ; ACT-1 attend encore
   J2-base et J2-cc8 (rang 4).

## Interdits encore actifs

- Les textes ne changent plus sans nouvelle validation du responsable.
- Rien n'est servi au patient avant ACT-1 ; une place de la file C à la fois,
  constat entre chacune (D-288).
- Aucune identité réelle au dépôt ; production en lecture par conteneur.
