# Handoff — 2026-09-18 — Le validateur partagé, et les douze sources lues en entier (D-229)

## 1. Branche et état Git

- Branche `wn-indications-assiettes-claims-2026-09-18`, partie de `origin/main`
  à `7496842e` (#1188, `D-228`). Worktree `phases-hash-2026-09-16`, propre avant
  le lot. PR #1190.
- Lot d'une seule finalité : chantier 2 de S3. **Aucune ligne d'indication
  écrite**, aucune signature posée, aucun écran changé.

## 2. Objectif de la session

Le chantier 2 des cinq que `D-216` laisse devant l'attestation du catalogue
d'assiettes : **le champ d'indication et ses claims**, consigne de `D-227` — lire
chaque claim **sur pièce, source ENTIÈRE** —, et avant toute ligne le
**validateur partagé** que `D-225` §4 bis exigeait.

## 3. Décisions prises

- **`D-229`**, avec **trois arbitrages du responsable**.
- **Validateur partagé livré** (`declencheursAnamnese.ts`) : correspondance clé
  typée ↔ champ d'anamnèse, lecture des options, deux gardes — **une seule fois
  pour les deux tables**. L'interdit `signauxAlerte` suit : application de
  l'arbitrage du 2026-08-03, pas règle neuve.
- **Arbitrage 1 — le catalogue C5B part en lot propre, la table reste vide.**
  Aucune des douze assiettes n'a de `plateCode` ; les ajouter ferait passer la
  liste du praticien de trois à quinze options. Écarté : écrire les lignes en
  laissant le verrou les refuser ; étendre sans filtre.
- **Arbitrage 2 — la sérotoninergique change de porte** : `Q_GAS_01`, fondée par
  `WN-CL-0290-005`, à la place de `Q_INF_03`/`SE` que rien ne fondait.
- **Arbitrage 3 — la dopaminergique s'élargit** à `DA` **ou** `NA`, bande `>= 10`,
  pas de sens déclaré en `raccourciAssume`. Vérifié avant d'écrire : `Q_INF_03`
  porte bien `NA` (/40), grille `subscale: '*'`.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** la dette de `D-225` §4 bis : les deux tables qui partagent
  `OrientationDeclencheur` partagent enfin ses gardes.
- **Ferme** la lecture sur pièce des douze protocoles. **Vingt-six désignations
  exactes** (24 en colonne « Claims d'indication », 2 brouillons) ; **six claims
  de plus en cinq constats** ; quatre constats corrigent la colonne voisine,
  jamais confrontée au dépôt.
- **N'atteint pas** : la table, toujours **VIDE**, verrou **ÉTEINT** ;
  `TABLE_EXIGE_PRESCRIPTIF` sans entrée et `shaPerimetreLitteral` non enrôlé,
  réglés le jour de la première signature (`D-198`, `D-223`, `D-224`). Ni la
  classe d'erreur de `D-227` §8 : le validateur garde le **câblage** d'une porte,
  jamais ce qu'un claim **fonde**.

## 5. Fichiers modifiés

**Neufs** — `web/src/lib/clinical/declencheursAnamnese.ts` · son banc (9 cas) ·
le fragment `changelog.d/` du jour · ce handoff.

**Modifiés** — `indicationsAssiettesV1.ts` (`anomaliesDuDeclencheur` délègue ;
trois blocs de prose périmés corrigés) · `indicationsAssiettesV1.guard.test.ts`
(le test de FRANCHISE devient quatre tests de comportement) ·
`orientationRulesV1.test.ts` (copies locales retirées) · `docs/DECISIONS.md` ·
`SURFACE_RELECTURE_CATALOGUE_ASSIETTES_2026-09-16.md` · `FILE_ATTENTE.md` (deux
dettes routées, une acquittée) · `docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **Production, trois one-off détachés, lecture seule** : les 131 claims de
  `WN-SRC-0284` → `0295`, **sources entières**. Tous `VALIDE`, actifs, non
  remplacés, `v1.0`.
- **T1** vert (404 tests, anti-secrets OK). **Bancs cliniques** : 713 tests.
- **T2 `--fast`** : **`T2-EXIT=0`**, lu dans le fichier — pas dans le résumé de la
  tâche de fond, qui rapporte le code du dernier `echo`. 581 fichiers, 9 730 tests
  unitaires, **contrats SQL joués 25 s**, build vert, **205 E2E** Chromium **et**
  WebKit. **Aucune signature `D-049`.**
- **Les deux délégations mutées séparément** (sauvegarde par `cp`, jamais
  `git checkout --`) : chacune tue deux bancs ; module restauré **identique**,
  vérifié par `diff`.
- **Contrôle G6 sur `git diff --cached`**, contre les 131 textes lus (2 974
  n-grammes de six mots) : **il a mordu quatre fois** — deux fragments écrits ce
  jour, **deux préexistants** que des lignes modifiées réintroduisaient. Zéro
  après reformulation. Il ne peut pas entrer au dépôt : son référentiel est ce que
  G6 interdit d'y écrire.
- **Audit de campagnes**, **cohérence d'état** (29), **numérotation** (19).

## 7. Problèmes ouverts

- **Le catalogue C5B bloque tout le reste de S3** — routé en file. Sans les douze
  entrées, aucune ligne ne peut être signée.
- **Le régime alimentaire n'est pas un drapeau** — seconde dette routée. La
  méthylation attend **deux** chantiers ; la surface l'annonçait disponible.
- **Quatre lignes ne s'ouvriraient qu'au second tour** (épargne digestive,
  détoxication, psychobiotique, sérotoninergique) : `Q_GAS_01` n'est pas au pack
  de base. À connaître avant de signer, pas un défaut.
- **La méthylation reste « publiée » avec un déclencheur « AUCUN »** : le verdict
  porte sur l'indication FONDÉE, la colonne voisine sur ce que le dépôt lit.
- **Numéro `D-229` à vérifier au merge** — cinq collisions en trois nuits.
- **Piège de concurrence du CI** : la ligne de `.claude/rules/` a été écrite par
  une autre session (PR #1189), après l'arbitrage. Ne pas la réécrire ici.

## 8. Prochaine action exacte

1. **La revue Copilot est lue et traitée** (voir ci-dessous) ; la relire après le
   second push, puis merger avec `--subject` portant le bon `D-NNN` — sans lui,
   le sujet du squash vient du commit de tête.
2. **Le lot catalogue** : les douze entrées C5B **et** ce qui protège la liste
   d'observation, dans le même diff. C'est lui qui débloque S3.
3. Puis le chantier 3 (déclencheur d'âge, revisite de `DC-43`), la dette du
   drapeau de régime, et les lignes elles-mêmes.

**Revue Copilot — six constats, six réels, tous corrigés.** Un décompte contredit
ici même, déjà trouvé par recomptage avant la revue ; **quatre fois « cinq claims
de plus » là où il y en a six** — le décompte portait sur les constats ; et ce
handoff, au-delà du plafond de `docs/claude/handoffs/README.md`.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée — une ligne
  **désigne** ses claims. Une signature clinique ne se pose jamais par l'outil.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
