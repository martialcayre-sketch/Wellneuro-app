# Handoff — 2026-09-17 — Les deux premières attestations praticien, et un claim réfuté par la production

## 1. Branche et état Git

- Worktree : `.claude/worktrees/phases-hash-2026-09-16`.
- Branche : `wn-attestations-2026-09-17`, prise **depuis `origin/main`**
  (`3f28eab3`) et non depuis `HEAD` — l'autre session avait poussé quatre
  décisions et deux lots pendant la nuit.
- `main` local était sur `0891bea8` (ma tête de la veille) ; rien n'a été
  mergé ni rebasé, la branche part propre.

## 2. Objectif de la session

Poser les attestations que le responsable venait de déclarer en séance : la
table du repli (S2) et le catalogue de conduites (S1). Les surfaces de relecture
existaient depuis la veille ; il ne restait que le geste — et sa transcription.

## 3. Décisions prises

- **`D-223`** — la table du repli est attestée. Les trois constats `REPLI-01` à
  `REPLI-03` ont été relus mot à mot et déclarés conformes. Verrou armé.
- **`D-224`** — le catalogue de conduites reçoit sa première ligne,
  `insomnie_jambes_sans_repos`. Les deux autres lignes proposées sont
  **retenues**, pas écartées.
- **`conduites: false`** au contrat SQL de fraîcheur — arbitrage `D-046`,
  motivé sur place. L'intuition allait dans l'autre sens.
- **`claimsInstrument: []`** sur la ligne signée — une déclaration, pas un oubli.

## 4. LE CONSTAT QUI COMPTE — une désignation de claim était fausse

La surface de relecture désignait `WN-CL-0320-002` en claim d'instrument pour
les **trois** lignes. Lecture en production le 2026-09-17 : ce claim fonde
l'emploi du **HAD** dans le bilan d'une insomnie sans cause identifiée, et il
est `prescriptif = false`. *(Le texte du claim reste hors dépôt — G6 est fermée,
on le désigne, on ne le recopie pas.)*

Il fonde donc bien l'instrument des lignes 1 et 2, qui se déclenchent sur les
sous-scores `D` et `A` du HAD. Il **ne fonde rien** pour la ligne 3, qui se
déclenche sur l'IRLS (`Q_SOM_04`).

**Rien dans la chaîne n'aurait vu l'écart.** Le sha atteste le contenu relu, pas
sa pertinence. Le registre des sources est dense de `WN-SRC-0001` à
`WN-SRC-0507` sans trou, donc une vérification d'existence passe. Le CI
n'atteint que la forme. **Seule la lecture du texte du claim le montre.**

La même lecture a fait apparaître `WN-CL-0318-020`, claim **prescriptif** qui
fonde indépendamment la même indication et la même conduite — le « troisième
document » que la surface citait sans le désigner. Il est entré au périmètre.

**Opposable** : une désignation de claim se vérifie sur le texte du claim,
jamais sur la mémoire de qui l'a proposée. **Les deux lignes restantes n'ont pas
encore subi cette vérification** — leurs six claims d'indication et de sécurité
sont à lire sur pièce avant toute attestation.

## 5. Fichiers modifiés

**Code signé** — `web/src/lib/clinical/tableRepliV1.ts` (métadonnée +
commentaires d'attestation) · `catalogueConduitesV1.ts` (première ligne +
métadonnée) .

**Gardes** — `tableRepliV1.guard.test.ts` (verrou armé ; deux bancs neufs : perte
de signature sur reformulation, refus d'une quatrième ligne ; garde de source
**ancrée sur la ligne** au lieu d'une fenêtre de 400 caractères qui ne
l'atteignait plus) · `catalogueConduitesV1.guard.test.ts` (cinq bancs neufs) ·
`shaPerimetreLitteral.guard.test.ts` (les deux modules enrôlés) ·
`claimsEpinglesFraicheur.guard.test.ts` (`conduites: false` arbitré).

**Contrat SQL** — `rag_claim_fraicheur_tables_signees_v1.sql` et son négatif :
deux paires de claims, `exige_prescriptif = false`. Le bloc du prédicat est
repris **mot pour mot** entre les deux fichiers, comme le banc l'exige.

**Docs** — `docs/DECISIONS.md` (`D-223`, `D-224` en tête) · `FEATURE_FLAGS.md`
(deux lignes d'état) · les deux surfaces de relecture (bandeaux d'état) ·
`changelog.d/2026-09-17-deux-attestations-praticien.md`.

## 6. Validations exécutées

- **T1** : `T1-EXIT=0`, deux fois (avant et après les éditions documentaires).
- **Bancs ciblés** : table du repli 25 tests, conduites 28, contrat de
  fraîcheur + sha littéral + cohérence des verrous 36 — tous verts.
- **T2 `--fast`** : voir §8. `--fast` ne saute **pas** les contrats SQL ni la
  dérive schéma↔migrations — seulement lint, anti-secrets, audit de campagnes et
  certification scoring. Le contrat modifié est donc bien éprouvé.
- **Production lue** (conteneur `scalingo run -d`, lecture seule) : les sept
  claims de `WN-SRC-0320` et les quatre appuis de `BIO-SJS-01`.

## 7. Problèmes ouverts

- **Le numéro de décision a collisionné, encore.** `D-219` à `D-222` étaient
  pris par l'autre session au moment d'écrire. Renumérotés en `D-223`/`D-224`
  par script, en ne touchant QUE mes fichiers — les autres occurrences de
  `D-219`/`D-220` sont légitimes.
- **Aucun écran ne consomme ces deux tables.** Ni `lignesRepliServables` ni
  `lignesConduitesServables` n'a d'appelant de production. Les signatures
  **arment** les mécanismes, elles ne les branchent pas.
- **Deux claims donnent deux seuils de ferritine différents** — 50 ng/mL
  (`WN-CL-0318-020`) et 80 ng/ml (`WN-CL-0112-012`, valeurs HAS). La ligne signée
  ne porte aucun seuil, donc rien n'est incohérent aujourd'hui ; le jour où une
  conduite en portera un, c'est une discordance à signaler, jamais à moyenner
  (`DC-30`).
- **Une exigence `prescriptif` par CATÉGORIE serait plus juste** que par table.
  Le contrat SQL porte déjà un booléen par ligne ; c'est le banc qui impose
  l'uniformité. Écarté aujourd'hui, nommé au registre.
- **Le catalogue d'assiettes n'a toujours ni champ `statut` ni filtre de
  service** — c'est le chantier 1 de S3, et il reste entier.
- `D-049` n'est toujours pas refermée.

## 8. Prochaine action exacte

1. Lire la revue Copilot **avant** de merger — `.reviews[].body` compris, les
   constats peuvent ne vivre que dans le corps sous « Suppressed comments ».
2. Comparer le `head=` du SNAPSHOT de `wn-attendre-ci` à la tête réelle de la PR.
3. Vérifier que `D-223` et `D-224` sont **toujours libres** au moment du merge.
4. Ensuite : le chantier 1 de S3 — le champ `statut` sur la ligne d'indication
   **et** le filtre de service. Sans lui, `PractitionerFoodObservationPanel` rend
   toutes les entrées et un brouillon s'affiche comme une ligne publiée.

## 9. Interdits encore actifs

- **Aucune identité réelle dans le dépôt** — code, seeds, tests, docs, messages
  de commit.
- **Aucune signature clinique posée par l'outil.** Les deux posées ce jour l'ont
  été **sur déclaration du responsable**, puis transcrites ; les verrous restants
  (`safetyEffetIndesirableV1`, `gatePopulationV1`) sont éteints.
- **Aucun contenu clinique du corpus dans le dépôt** tant que G6 est fermée. Les
  textes de claims lus en production ce jour n'entrent **pas** au dépôt : les
  lignes les **désignent**.
- **Base de production : lecture seule** par conteneur `scalingo run -d`.
- **Pas de migration Prisma ni de modification de `schema.prisma`** sans demande
  explicite. Les deux fichiers `prisma/checks/` modifiés sont des **contrats de
  lecture**, pas des migrations.
- **Force-push, production et arbitrages** restent à demander. L'autorisation
  Git est **prolongée jusqu'au 2026-09-24**.
