# Handoff — 2026-09-17 — Les deux premières attestations praticien, et un claim réfuté par la production

## 1. Branche et état Git

- Worktree : `.claude/worktrees/phases-hash-2026-09-16`.
- Branche `wn-attestations-2026-09-17`, prise **depuis `origin/main`**
  (`3f28eab3`) et non depuis `HEAD` : l'autre session avait poussé quatre
  décisions et deux lots pendant la nuit. PR **#1178**.

## 2. Objectif de la session

Poser les attestations que le responsable venait de déclarer en séance : la
table du repli (S2) et le catalogue de conduites (S1). Les surfaces de relecture
existaient depuis la veille ; il ne restait que le geste, et sa transcription.

## 3. Décisions prises

- **`D-223`** — la table du repli est attestée. Les trois constats `REPLI-01` à
  `REPLI-03` relus **mot à mot** et déclarés conformes. Verrou armé.
- **`D-224`** — le catalogue de conduites reçoit sa première ligne,
  `insomnie_jambes_sans_repos`. Les deux autres sont **retenues**, pas écartées :
  le périmètre se hache en entier, elles viendront par une nouvelle attestation.
- **`conduites: false`** au contrat SQL de fraîcheur (arbitrage `D-046`) :
  `claimsInstrument` est descriptif par construction, et l'exigence rejetterait
  une désignation valide dès la deuxième ligne (`DC-14`).
- **`claimsInstrument: []`** sur la ligne signée — une déclaration, pas un oubli.

## 4. Le constat qui compte — une désignation de claim était fausse

La surface désignait `WN-CL-0320-002` en claim d'instrument pour les **trois**
lignes. Lu en production, ce claim fonde l'emploi du **HAD** — il vaut donc pour
les lignes 1 et 2, qui lisent des sous-scores du HAD, et **ne fonde rien** pour
la ligne 3, qui se déclenche sur l'IRLS (`Q_SOM_04`). *(Le texte du claim reste
hors dépôt : G6 est fermée, on désigne, on ne recopie pas.)*

**Rien dans la chaîne n'aurait vu l'écart** : le sha atteste le contenu relu, pas
sa pertinence ; le registre des sources est dense sans trou, donc une
vérification d'existence passe ; le CI n'atteint que la forme. La même lecture a
fait apparaître `WN-CL-0318-020`, claim prescriptif qui fonde indépendamment la
même indication.

**Opposable** : une désignation de claim se vérifie sur le texte du claim, jamais
sur la mémoire de qui l'a proposée.

## 5. Fichiers modifiés

**Signés** — `tableRepliV1.ts`, `catalogueConduitesV1.ts` (métadonnées,
commentaires d'attestation, première ligne).

**Gardes** — `tableRepliV1.guard.test.ts` (verrou armé ; deux bancs neufs ;
garde de source **ancrée sur la ligne** au lieu d'une fenêtre de 400 caractères
qui ne l'atteignait plus) · `catalogueConduitesV1.guard.test.ts` (cinq bancs
neufs) · `shaPerimetreLitteral.guard.test.ts` (les deux modules enrôlés) ·
`claimsEpinglesFraicheur.guard.test.ts` (`conduites: false` arbitré).

**Contrats SQL** — `rag_claim_fraicheur_tables_signees_v1.sql` et son négatif :
deux paires, `exige_prescriptif = false`, bloc du prédicat repris **mot pour
mot** entre les deux fichiers comme le banc l'exige.

**Docs** — `DECISIONS.md` · `FEATURE_FLAGS.md` · les deux surfaces (bandeaux
d'état) · `FILE_ATTENTE.md` · `SESSION_LOG.md` · fragment de changelog.

## 6. Validations exécutées

- **T1** : `T1-EXIT=0`, deux fois.
- **T2 `--fast`** : `T2-EXIT=0` — 576 fichiers, **9653 tests unitaires**, 205
  E2E, contrats SQL et dérive schéma↔migrations verts. `--fast` ne saute **pas**
  les contrats SQL : seulement lint, anti-secrets, audit de campagnes et
  certification scoring.
- **Bancs ciblés** : repli 25, conduites 28, fraîcheur + sha littéral +
  cohérence des verrous 36.
- **Production lue** en conteneur détaché, lecture seule : les sept claims de
  `WN-SRC-0320` et les quatre appuis de `BIO-SJS-01`.
- **Revue Copilot** : six constats, **six réels**, tous corrigés avant merge.

## 7. Problèmes ouverts

- **Collision de numéro, encore** : `D-219` à `D-222` étaient pris au moment
  d'écrire. Renumérotés par script, en ne touchant QUE mes fichiers.
- **Aucun écran ne consomme ces deux tables.** Ni `lignesRepliServables` ni
  `lignesConduitesServables` n'a d'appelant de production : les signatures
  **arment** les mécanismes, elles ne les branchent pas.
- **Le journal du contrat positif avait lâché** : il annonçait onze paires
  `priorites` là où la liste en porte vingt, et « 42 » là où il y en a 53. Rien
  ne garde ce journal. Constaté sur place, les entrées datées non réécrites.
- **Deux claims donnent deux seuils de ferritine différents** (50 et 80). La
  ligne signée n'en porte aucun, donc rien n'est incohérent aujourd'hui ; le jour
  où une conduite en portera un, c'est une discordance à signaler (`DC-30`).
- **Une exigence `prescriptif` par CATÉGORIE serait plus juste** que par table :
  le contrat porte déjà un booléen par ligne, c'est le banc qui impose
  l'uniformité. Écarté, nommé au registre.
- **Le catalogue d'assiettes n'a ni champ `statut` ni filtre de service** — le
  chantier 1 de S3, entier. `D-049` n'est toujours pas refermée.

## 8. Prochaine action exacte

1. Le chantier 1 de S3 : le champ `statut` sur la ligne d'indication **et** le
   filtre de service. Sans lui, `PractitionerFoodObservationPanel` rend toutes
   les entrées et un brouillon s'affiche comme une ligne publiée.
2. Avant d'attester les deux lignes de conduite restantes : **lire leurs six
   claims sur pièce**. La vérification du 2026-09-17 a réfuté une désignation sur
   trois, et rien dans la chaîne n'attrape cette classe d'erreur.

## 9. Interdits encore actifs

- **Aucune identité réelle dans le dépôt** — code, seeds, tests, docs, commits.
- **Aucune signature clinique posée par l'outil.** Les deux posées ce jour l'ont
  été **sur déclaration du responsable**, puis transcrites.
- **Aucun contenu clinique du corpus dans le dépôt** tant que G6 est fermée. Les
  textes lus en production n'y entrent pas : les lignes **désignent**.
- **Base de production : lecture seule** par conteneur `scalingo run -d`.
- **Pas de migration Prisma ni de modification de `schema.prisma`** sans demande
  explicite. Les deux fichiers `prisma/checks/` touchés **ne sont pas** des
  migrations : le positif est un préflight `BEGIN READ ONLY … ROLLBACK` joué
  contre la production ; le **négatif écrit** — il pose des fixtures dans une
  transaction annulée, tourne en CI sur base éphémère, et **ne se joue jamais
  contre la production**.
- **Force-push, production et arbitrages** restent à demander. Autorisation Git
  **prolongée jusqu'au 2026-09-24**.
