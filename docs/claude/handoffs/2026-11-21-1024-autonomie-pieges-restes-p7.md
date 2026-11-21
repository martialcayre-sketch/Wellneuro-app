# Handoff — lot `autonomie-pieges-restes`, partie 7 : les quatre pièges E2E (2026-11-21)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie7`, tirée d'`origin/main` f47f4fce (après #2292), dans le worktree
  `.claude/worktrees/orch-ci`. L'ancienne `chore/autonomie-pieges-partie6` est périmée (#2291 mergée en
  701a1262) et n'a pas été touchée.
- Commit tardif (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` sont
  mis à jour avec `if_version` (version 24).
- Boîte D lue au démarrage : vide.

## 2. Objectif

Convertir en contrôles les quatre pièges E2E du titre du lot : « hier moins 24 h », « minuit UTC »,
`textContent` et « flèches WebKit » (mémoires `e2e-agenda-heure-hiver-hier-moins-24h`,
`e2e-doublon-biologie-minuit-utc`, `e2e-lexique-interdit-buildid-aleatoire`, `e2e-webkit-fleches-ne-defilent-rien`).

## 3. Décisions prises

- **Risque P2** : des specs E2E et un banc Vitest. Aucun code de l'application, aucun crochet, rien de clinique.
  La revue est donc celle de PR-Agent ; `wn-reviewer` seulement à défaut (D-448).
- **Hier moins 24 h** : `decalerDate(dateJourParis(), n)` dans `portail-hub-agenda.spec.ts` et
  `portail-agenda-alimentaire.spec.ts`. C'est la forme qu'emploie déjà `agenda-sommeil-saisie.spec.ts`, avec
  le `decalerDate` du domaine de chaque spec.
- **Minuit** : des deux correctifs que la mémoire laissait ouverts, celui du test qui fabrique lui-même ses
  deux consignations a été retenu. L'autre, une date figée côté serveur, toucherait le code de production.
  Le troisième test fait un geste ; s'il consigne une pièce neuve (le jour a changé depuis le test 1), il
  recommence sur une page neuve, et ce second geste doit mordre sur le doublon. Ce n'est pas un arbitrage :
  ça ne touche que le banc.
- **`textContent`** : `innerText()` aux trois lectures du `<body>` de `portail-dossier-deux-voix.spec.ts`.
  Effet assumé : un texte caché (`display: none`) n'est plus lu. Les tests disent « sur cet écran ».
- **Flèches WebKit** : aucun spec actuel n'est concerné ; seul le banc garde.
- **Banc `web/src/lib/e2ePieges.guard.test.ts`**, trois règles lues sur le texte des specs, commentaires
  masqués, chaînes gardées :
  1. un jour écrit en millisecondes, sous sept formes. Un seul instant est admis, avec son motif et son
     compte (`helpers/db.ts`, `dateT0` de `provisionAncreJalon`) ;
  2. `textContent()` ou `allTextContents()` sur le `<body>` ou le `<html>` ;
  3. un fichier qui presse une flèche et lit un défilement sans `test.skip` ni `test.fixme` visant WebKit.
- Le piège de minuit n'est pas gardé : il tient à un état partagé entre deux tests sériels, illisible en
  général. L'en-tête du banc le dit, avec les trous assumés.

## 4. Fichiers modifiés

- `web/e2e/portail-hub-agenda.spec.ts`, `web/e2e/portail-agenda-alimentaire.spec.ts`
- `web/e2e/biologie-document-patient.spec.ts`
- `web/e2e/portail-dossier-deux-voix.spec.ts`
- `web/src/lib/e2ePieges.guard.test.ts` (neuf)
- `changelog.d/2026-11-21-autonomie-pieges-partie7.md`, ce handoff

## 5. Validations exécutées

- Banc seul : 8 tests sur 8.
- Mutations : une lecture `textContent()` du `<body>` remise dans `portail-dossier-deux-voix.spec.ts`, et un
  `Date.now() - 86_400_000` dans `portail-hub-agenda.spec.ts`. Les règles 2 et 1 rougissent, et chacune nomme
  le fichier et la ligne fautifs. Après rétablissement, tout revient au vert.
- T1 (`check:rapide`) : 16 étapes vertes, 3 sautées. `tsc --noEmit` et ESLint sur les fichiers touchés : verts.
- **Non joué localement** : les trois specs modifiés. `test:worktree` ne sait pas cibler un spec, et le lot ne
  touche ni UI ni API. C'est le CI (`verify`, Chromium et WebKit) qui les joue. Les branches « minuit » et « 25 h »
  ne s'y exercent qu'à leur heure : elles sont démontrées dans le code, sans occurrence observée.

## 6. Problèmes ouverts

Pièges encore à traiter dans le lot :
- lot d'ingestion de plus de 10 claims ;
- listes jumelles ;
- release-db sur 504 ;
- one-off Scalingo recyclé ;
- réservation WN-SRC ;
- focus areas de PR-Agent ;
- SESSION_LOG réordonné ;
- sessions concurrentes ;
- crochets de la copie principale en retard ;
- `wn-attendre-ci` ;
- statut « transféré » (décision requise) ;
- lint « objet d'erreur brut ».

Les P3 assumés des crochets ne se reprennent que sur un cas réel.

## 7. Prochaine action exacte

1. Commit, push et PR (`--body-file`). Ensuite `wn-attendre-ci` en fond, sous la forme sûre.
2. PR-Agent → 0 (`wn-revue-pr-agent.mjs`). À défaut, la revue de `wn-reviewer` (D-448). Puis un verdict pour
   chaque remarque.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). Ensuite, plus aucune écriture sur la PR
   (D-546).
4. Ensuite, le piège suivant de la liste.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien dans `web/src/lib/clinical/`. Aucune écriture en production.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` reste à `true`. La phase 3 (pilote) attend le
  feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
