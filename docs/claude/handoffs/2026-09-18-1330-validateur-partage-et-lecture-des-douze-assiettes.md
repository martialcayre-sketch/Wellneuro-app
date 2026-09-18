# Handoff — 2026-09-18 — Le validateur partagé, et les douze sources lues en entier (D-229)

## 1. Branche et état Git

- Branche `wn-indications-assiettes-claims-2026-09-18`, partie de `origin/main`
  à `7496842e` (#1188, `D-228`, mergée la veille au soir).
- Worktree `phases-hash-2026-09-16`. `status --porcelain -uall` vide avant le lot.
- Lot d'une seule finalité : le chantier 2 de S3. **Aucune ligne d'indication
  n'est écrite**, aucune signature posée, aucun écran changé.

## 2. Objectif de la session

Le chantier 2 des cinq que `D-216` laisse devant l'attestation du catalogue
d'assiettes : **le champ d'indication d'assiette et ses claims**, avec la
consigne de `D-227` — lire chaque claim **sur pièce, source ENTIÈRE**, jamais
depuis la surface. Et, avant toute ligne, le **validateur partagé** que `D-225`
§4 bis exigeait.

## 3. Décisions prises

- **`D-229`**, avec **trois arbitrages du responsable**.
- **Le validateur partagé est livré** (`declencheursAnamnese.ts`) : la
  correspondance clé typée ↔ champ d'anamnèse, la lecture des options et les deux
  gardes, **une seule fois pour les deux tables**. L'interdit `signauxAlerte`
  suit — application de l'arbitrage du 2026-08-03, pas règle neuve.
- **Arbitrage 1 — le catalogue C5B part en lot propre, et la table reste vide.**
  Aucune des douze assiettes n'a de `plateCode` ; l'y ajouter ferait passer la
  liste d'observation du praticien de trois à quinze options. Écarté : écrire les
  lignes en laissant le verrou les refuser ; étendre sans filtre.
- **Arbitrage 2 — la sérotoninergique change de porte** : `Q_GAS_01`, fondée par
  `WN-CL-0290-005`, à la place de `Q_INF_03`/`SE` que rien ne fondait.
- **Arbitrage 3 — la dopaminergique s'élargit** à `DA` **ou** `NA`, comme
  `WN-CL-0289-004` le dit, à la bande d'entrée `>= 10`, avec le pas de sens
  déclaré en `raccourciAssume`.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** : la dette nommée de `D-225` §4 bis. Les deux tables qui partagent
  `OrientationDeclencheur` partagent désormais ses gardes.
- **Ferme** : la lecture sur pièce des douze protocoles. Les vingt désignations
  de la surface sont **exactes** ; cinq claims de plus ont été trouvés ; quatre
  constats corrigent la colonne « déclencheur disponible », qui n'avait jamais
  été confrontée au dépôt.
- **N'atteint pas** : la table des indications, toujours **VIDE**, verrou
  **ÉTEINT**. `TABLE_EXIGE_PRESCRIPTIF` reste sans entrée et
  `shaPerimetreLitteral` non enrôlé — les deux se règlent le jour de la première
  signature, comme `D-198`, `D-223` et `D-224` l'ont fait.
- **N'atteint pas** : la classe d'erreur de `D-227` §8. Le validateur garde le
  **câblage** d'une porte, jamais ce qu'un claim **fonde**.

## 5. Fichiers modifiés

**Neufs** — `web/src/lib/clinical/declencheursAnamnese.ts` (le validateur) · son
banc `declencheursAnamnese.test.ts` (9 cas) ·
`changelog.d/2026-09-18-validateur-partage-et-lecture-des-douze-assiettes.md` ·
ce handoff.

**Modifiés** — `web/src/lib/clinical/indicationsAssiettesV1.ts`
(`anomaliesDuDeclencheur` délègue ; trois blocs de prose périmés corrigés) ·
`indicationsAssiettesV1.guard.test.ts` (le test de FRANCHISE devient quatre tests
de comportement) · `orientationRulesV1.test.ts` (les copies locales retirées, les
imports inutiles avec) · `docs/DECISIONS.md` (`D-229` en tête) ·
`SURFACE_RELECTURE_CATALOGUE_ASSIETTES_2026-09-16.md` · `FILE_ATTENTE.md` (deux
dettes routées, une acquittée) · `docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **Lecture de production, trois one-off détachés, lecture seule** : le
  dimensionnement par source, puis les 131 claims de `WN-SRC-0284` → `0295`,
  **sources entières**. Tous `VALIDE`, actifs, non remplacés, `v1.0`.
- **T1 `npm run check`** : vert, 404 tests, anti-secrets OK.
- **Bancs cliniques** `src/lib/clinical/` : **713 tests, 28 fichiers, verts.**
- **Les deux délégations mutées séparément** (`cp` de sauvegarde, jamais
  `git checkout --`) : retirer la garde de libellé tue 2 bancs, retirer celle du
  signal d'alerte en tue 2 autres. Module restauré **identique à la sauvegarde**,
  vérifié par `diff`.
- **Contrôle G6 sur le diff**, joué à la main contre les 131 textes lus en
  production (2 974 n-grammes de six mots) : **il a MORDU quatre fois**. Deux
  fragments que je venais d'écrire, reformulés pour désigner. **Et deux
  PRÉEXISTANTS** — des parenthèses de `main`, dans deux cellules du tableau dont
  je modifiais la colonne voisine : le diff les réintroduisait, donc elles
  entraient dans le périmètre de ce lot et ont été reformulées aussi. Zéro
  fragment après correction, sur les 927 lignes ajoutées. **Ce contrôle ne peut
  pas entrer au dépôt** — son référentiel est exactement ce que G6 interdit d'y
  écrire ; il se rejoue à la main à chaque passage sur ces sources.
- **Audit de campagnes** et **banc de cohérence d'état** : verts (29 tests).
  **Numérotation des décisions** : 19 tests verts.
- **T2 `npm run test:worktree -- --fast`** : **`T2-EXIT=0`**, lu dans le fichier
  et non dans le résumé de la tâche de fond, qui rapporte le code du dernier
  `echo`. 581 fichiers, **9 730 tests unitaires** (1 sauté), **contrats SQL joués
  25 s** — ils ne sont pas dans le saut `--fast` —, build vert, **205 E2E passés**
  et 3 sautés, Chromium **et** WebKit. **Aucune signature `D-049`** : la montée
  en Playwright 1.63.0 tient.

## 7. Problèmes ouverts

- **Le catalogue C5B bloque tout le reste de S3** — routé en file d'attente avec
  son adresse. Tant qu'il ne porte pas les douze entrées, aucune ligne
  d'indication ne peut être signée.
- **Le régime alimentaire n'est pas un drapeau** — seconde dette routée. La
  méthylation attend **deux** chantiers, pas un ; la surface l'annonçait
  disponible.
- **Trois lignes se déclencheraient au second tour seulement** (épargne
  digestive, détoxication, psychobiotique, et maintenant la sérotoninergique) :
  `Q_GAS_01` n'est pas dans le pack de base. Fait à connaître avant de signer,
  pas un défaut.
- **La méthylation reste « publiée » au tableau avec un déclencheur « AUCUN »** :
  le verdict porte sur l'indication FONDÉE, la colonne voisine sur ce que le
  dépôt sait lire. Les deux sont maintenant justes et disent des choses
  différentes — à ne pas lire comme une contradiction.
- **Numéro de décision** : `D-229` est pris ici, **à vérifier au merge**. Cinq
  collisions en trois nuits.
- **Piège de concurrence du CI**, toujours non documenté : relancer un ancien run
  **annule celui de la tête** hors `main`. La ligne de `.claude/rules/` attend un
  arbitrage, deux sessions se la partagent.

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot AVANT de merger** — `gh api --paginate
   --slurp repos/{owner}/{repo}/pulls/<N>/comments` dans un fichier, **ET**
   `gh pr view <N> --json reviews` pour `.reviews[].body`, **ET** le bloc
   « Suppressed comments » du corps de revue, qui n'est dans aucun des deux.
   Puis merger avec `--subject` portant le bon `D-NNN`.
2. Ensuite, **le lot catalogue** : les douze entrées C5B **et** ce qui protège la
   liste d'observation, dans le même diff. C'est lui qui débloque S3.
3. Puis seulement le chantier 4 (déclencheur d'âge et revisite de `DC-43`), la
   dette du drapeau de régime, et les lignes elles-mêmes.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; les dossiers de test se lisent par
  identifiant, jamais nommés, jamais visés par un seed ou un E2E.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite. Ce lot
  n'en porte aucune.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée — une ligne
  **désigne** ses claims, elle ne les recopie pas.
- Une signature clinique ne se pose jamais par l'outil : surface, demande,
  transcription.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
