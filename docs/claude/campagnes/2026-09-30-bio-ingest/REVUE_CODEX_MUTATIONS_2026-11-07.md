# Contre-revue par mutations — BIO-INGEST — 2026-11-07

Suite datée de `REVUE_CODEX_MUTATIONS_2026-10-10.md`, dont le §4 laissait
M1 à M11 et M15 sans résultat (ligne D/25 du plan). Énoncé :
`PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-11-07.md`, même dossier. Passe jouée
par Codex, lancée par le responsable le 2026-11-07, sur la cible épinglée.

Le rapport de Codex est versé ci-dessous (§1 à §5) sans changement de fond.
Ses pièces (diff, JSON et sortie de chaque banc) sont restées hors du dépôt,
dans le dossier de preuve local du responsable : les liens vers elles sont
rendus par le nom de la pièce. Le §6 est de l'assistant : il relit les deux
survivants sur la cible et range les lots de banc proposés.

**Bilan : 10 `MORD`, 2 `SURVIT` (M1, M2), aucun `NON VÉRIFIABLE`.** Les deux
survivants sont des P1 de couverture : des faiblesses des bancs face à une
régression injectée, pas des défauts constatés dans le code intact.

## 1. Conditions de la passe

Cible : `4ecad8e10cd8c744fbc6cdfa6a1de6c040bd9a01`. Copie jetable détachée et
propre à sa création. `npm ci` et `npx prisma generate` : codes 0. Base locale
créée et migrations intactes appliquées par `scripts/wn-dev-db.sh --migrate` :
code 0. Aucun accès à la production ni appel Anthropic réel. Aucun banc de
l'auteur modifié ; aucune correction, PR, publication, aucun commit ni push.

Chaque mutation consigne les bancs désignés avant l'essai, la ligne, le
remplacement exact, les codes de sortie et la restauration propre, avec son
diff complet et la sortie de chaque banc. Les mutations SQL sont installées
uniquement par `npm run test:worktree -- --fast --keep-db` ; l'option de
conservation permet de relancer le banc nommé sur la même base éphémère mutée
pour lire sa sortie. Cette base est ensuite arrêtée et supprimée. Les chemins
ci-dessous sont relatifs à `web/`, sauf ceux qui commencent déjà par `web/`.

## 2. Tableau des essais

| # | Fichier:ligne muté | Mutation (avant → après) | Bancs désignés avant essai ; résultat de chacun | Verdict |
|---|---|---|---|---|
| M1 | `web/src/lib/biology-library/import/decisions.ts:232` | `if (b.decision !== 'valider') return refuser(index, idLigne, 'decision_invalide');` → `if (false && b.decision !== 'valider') return refuser(index, idLigne, 'decision_invalide');` | `src/lib/biology-library/import/decisions.test.ts` : vert — 32 passed (32) (pièce `M1-1.log`) | **SURVIT** |
| M2 | `web/src/lib/biology-library/import/decisions.ts:299` | `const resultat = await tx.resultatBiologique.create({` → `const resultat = await prisma.resultatBiologique.create({` | `src/lib/biology-library/import/decisions.test.ts` : vert — 32 passed (32) (pièce `M2-1.log`) | **SURVIT** |
| M3 | `web/prisma/migrations/20261010220000_bio_ingest_commentaires_laboratoire_v1/migration.sql:160` | `NEW.marquage_non_transcrit, NEW.commentaire_lu,` → `NEW.marquage_non_transcrit, OLD.commentaire_lu,` | `prisma/checks/bio_ingest_staging_v1_negatif.sql` : vert — code 0 (`M3-1.log`)<br>`prisma/checks/bio_ingest_faits_laboratoire_v1_negatif.sql` : vert — code 0 (`M3-2.log`)<br>`prisma/checks/bio_ingest_commentaires_laboratoire_v1_negatif.sql` : rouge — code 1 (`M3-3.log`) | **MORD** |
| M4 | `web/src/lib/biology-library/import/lancerExtraction.ts:269` | `analytePropose: resolution.code,` → `analytePropose: resolution.code ?? 'BIO_FERRITINE',` | `src/lib/biology-library/import/lancerExtraction.test.ts` : rouge — 1 failed \| 26 passed (27) (`M4-1.log`)<br>`src/lib/biology-library/import/resolverLibellesV1.test.ts` : vert — 116 passed (116) (`M4-2.log`) | **MORD** |
| M5 | `web/src/lib/biology-library/import/valeurLue.ts:108` | `if (a === b) return true;` → `if (a.toLowerCase() === b.toLowerCase()) return true;` | `src/lib/biology-library/import/valeurLue.test.ts` : rouge — 3 failed \| 11 passed (14) (`M5-1.log`)<br>`src/lib/biology-library/import/decisions.test.ts` : vert — 32 passed (32) (`M5-2.log`) | **MORD** |
| M6 | `web/src/app/api/praticien/biologie/resultats/bilan/route.ts:207` | `new Prisma.Decimal(l.valeur)` → `new Prisma.Decimal(Number(l.valeur))` | `src/app/api/praticien/biologie/resultats/bilan/route.test.ts` : rouge — 1 failed \| 36 passed (37) (`M6-1.log`) | **MORD** |
| M7 | `web/src/lib/biology-library/import/extraction.ts:383` | `, signal: borne.signal` → (retiré) | `src/lib/biology-library/import/extraction.borne.test.ts` : rouge — 2 failed \| 2 passed (4) (`M7-1.log`)<br>`src/lib/biology-library/import/extraction.test.ts` : rouge — 1 failed \| 27 passed (28) (`M7-2.log`) | **MORD** |
| M8 | `web/src/lib/biology-library/import/purge.ts:128` | `if (graceEchue) {` → `if (false && graceEchue) {` | `src/lib/biology-library/import/purge.test.ts` : rouge — 1 failed \| 10 passed (11) (`M8-1.log`) | **MORD** |
| M9 | `web/src/lib/biology-library/import/extraction.ts:271` | `{ texte: null, nonTranscrit: true };` → `{ texte: t.slice(0, max), nonTranscrit: false };` | `src/lib/biology-library/import/extraction.test.ts` : rouge — 3 failed \| 25 passed (28) (`M9-1.log`)<br>`src/lib/biology-library/import/lancerExtraction.test.ts` : vert — 27 passed (27) (`M9-2.log`)<br>`e2e/sentinelle-marquage.spec.ts` : désigné au rejeu, non joué conformément à l'énoncé. | **MORD** |
| M10 | `web/src/lib/biology-library/import/depot.ts:115` | `const image = sharp(octets, { limitInputPixels: PIXELS_MAX_IMAGE }).rotate();` → `const image = sharp(octets, { limitInputPixels: PIXELS_MAX_IMAGE }).rotate().keepMetadata();` | `src/app/api/praticien/biologie/import/depot/route.test.ts` : rouge — 1 failed \| 17 passed (18) (`M10-1.log`)<br>`src/app/api/portail/comptes-rendus/route.test.ts` : vert — 19 passed (19) (`M10-2.log`)<br>`src/app/api/portail/documents/route.test.ts` : rouge — 1 failed \| 17 passed (18) (`M10-3.log`)<br>`src/lib/biology-library/import/enregistrerMasquage.test.ts` : rouge — 1 failed \| 15 passed (16) (`M10-4.log`) | **MORD** |
| M11 | `web/src/lib/biology-library/import/fileExtraction.ts:138` | `if (masquages === 0) return { ok: false as const, reason: 'masquage_absent' as const };` → `if (false && masquages === 0) return { ok: false as const, reason: 'masquage_absent' as const };` | `src/lib/biology-library/import/fileExtraction.test.ts` : rouge — 1 failed \| 7 passed (8) (`M11-1.log`)<br>`src/lib/biology-library/import/boucleFileExtraction.test.ts` : vert — 8 passed (8) (`M11-2.log`)<br>`src/lib/biology-library/import/lancerExtraction.test.ts` : vert — 27 passed (27) (`M11-3.log`)<br>`src/app/api/praticien/biologie/import/extraction/route.test.ts` : vert — 12 passed (12) (`M11-4.log`) | **MORD** |
| M15 | `web/prisma/migrations/20261010220000_bio_ingest_commentaires_laboratoire_v1/migration.sql:181` | `FOR SHARE OF c;` → `; -- mutation M15 : lecture sans verrou de partage` | `scripts/banc-ecart-validation-deux-sessions.test.mjs` : rouge — tests 4, pass 0, fail 4 (`M15-1.log`) | **MORD** |

## 3. Trouvailles

### P1-1 — M1 : une action inconnue peut valider une ligne dans un lot mixte

`web/src/lib/biology-library/import/decisions.ts:232`. La mutation neutralise
le refus `decision_invalide`. Le banc désigné `decisions.test.ts` reste vert
(32 passed sur 32). `npm run check` sur M1 muté : code 0 (pièce
`M1-check.log`).

La collecte des analytes (:206) ne charge les codes que des décisions
`valider`. Il faut donc un lot mixte : une vraie validation charge un code ;
une seconde entrée utilise ce même code, une autre date et une action
inconnue, par exemple `attendre`. Avec la mutation, cette seconde entrée
traverse la branche de validation puis rejoint `validations` (:256). La route
transmet `body.decisions` sans filtrer les actions
(`web/src/app/api/praticien/biologie/import/decisions/route.ts:48`). La base
reçoit ensuite une ligne `validee`, sans connaître l'action reçue. Cette
chaîne est démontrée par lecture du code muté ; aucun parcours réel n'a été
observé.

Cas précis permis par les fixtures existantes : `l1` validée en ferritine au
`2026-09-15T06:30:00.000Z`, puis `l7` avec `decision: "attendre"`, le même
analyte et `2026-09-14T22:00:00.000Z` (heure imprimée, valeur quantitative,
unité concordante). Les deux clés de mesure diffèrent. Un essai à action
inconnue seule pourrait être refusé par `analyte_inconnu` et manquer le
problème.

**Lot de banc proposé par Codex, non écrit** : tester ce lot mixte, demander
`decision_invalide` pour la seconde entrée et vérifier qu'aucune transaction
ni création de résultat ne part. La mutation doit faire rougir cet essai.

### P1-2 — M2 : une création hors transaction échappe au banc

`web/src/lib/biology-library/import/decisions.ts:299`. Remplacement de
`tx.resultatBiologique.create` par `prisma.resultatBiologique.create`. Le banc
désigné reste vert (32 passed sur 32). `npm run check` sur M2 muté : code 0
(pièce `M2-check.log`).

Le double `$transaction` appelle `cb(prisma)` (`decisions.test.ts:87`) : le
client transactionnel et le client global sont le même objet. Le banc ne
distingue donc pas les deux écritures. Avec un vrai client, la création
globale est commise séparément ; un refus ultérieur de
`ligneBiologiqueCandidate.updateMany`, un `count !== 1` ou un refus de purge
annule la transaction des lignes mais laisse le résultat créé. C'est
l'atomicité de M2 qui n'est plus gardée. Conséquence établie dans le code
muté, sans occurrence observée en production.

**Lot de banc proposé par Codex, non écrit** : séparer les doubles du client
global et du client transactionnel et exiger les créations sur `tx`. Ajouter
un témoin PostgreSQL local qui provoque un échec après la première création
et vérifie qu'aucun résultat n'est conservé, que toutes les lignes restent
proposées et que le document reste intact.

### Constat complémentaire M7

`fileExtraction.ts:51` réserve 360 000 ms ; `verrou.ts:14` fixe la péremption
à 300 000 ms. Entre les deux, `demanderExtraction` refuse encore tout travail
ouvert avant de juger la fraîcheur de l'import (:119-123). La réclamation
exige l'expiration de `reserve_jusqua` (:186-188 et :258-259) ; la reprise
ferme l'ancien import en cours (:211-214), puis ouvre un nouvel import. Le
banc à deux sessions de la file vérifie la réservation de six minutes
(`scripts/banc-file-extraction-deux-sessions.test.ts:230`). Aucun test reliant
directement les deux constantes n'a été trouvé dans les bancs de la file
examinés. Ce constat n'ajoute aucune règle et ne reçoit aucun verdict
`SURVIT`.

La relation originale de M7 est testée : 240 000 + 20 000 + 30 000 =
290 000 ms ≤ 300 000 ms (`extraction.test.ts:368`). La mutation qui retire le
signal d'abandon a bien fait rougir les bancs de flux et d'extraction.

## 4. Contrôles finaux

- Avant les mutations : **15 fichiers, 368 tests ciblés verts**.
- Après restauration : **15 fichiers, 368 tests ciblés verts**.
- Contrats SQL staging, faits du laboratoire et commentaires : **trois codes
  0** sur la base locale intacte.
- Banc écart/validation sans mutation : **4 réussites, 0 échec**.
- `npm run check` final sans mutation : **code 0**. Les deux rejeux M1/M2
  mutés ont également rendu chacun le code 0, typage compris.
- `git status --porcelain` : **vide après chaque restauration et avant
  suppression**. `git worktree remove --force` de la copie jetable : **code
  0** ; répertoire et inscription Git absents. La copie de lancement est
  restée sans modification.
- Les deux serveurs PostgreSQL éphémères de mutation sont **arrêtés et leurs
  répertoires supprimés**. La base locale persistante créée par
  `wn-dev-db.sh` n'a reçu aucune mutation SQL ; elle est conservée
  conformément au fonctionnement du script. Aucune base distante utilisée.

## 5. Non vérifié

Les E2E, dont `e2e/sentinelle-marquage.spec.ts`, ne sont pas joués dans cette
passe ; la sentinelle M9 est explicitement exclue par l'énoncé. Les lanceurs
SQL s'arrêtent avant build et Playwright sur les rouges attendus. Leurs
suites unitaires préalables comptent chacune 16 346 réussites et 48 tests
sautés ; ces derniers ne sont pas comptés comme vérifiés. Une mutation par
ligne ne prouve pas toute la surface de l'invariant : M5 éprouve la
concordance d'unités, M6 la voie bilan, M8 la clôture après grâce, M11 le
refus sans masquage à la demande. Aucun verdict ne s'étend aux branches non
mutées. Les chemins vivants de la file ont été utilisés pour M11 ; la
fonction historique `lancerExtraction()` n'a pas été mutée.

## 6. Relecture par l'assistant et lots proposés

Relu sur `4ecad8e1`, en lecture seule, sans rejouer de mutation. Ce qui se
vérifie depuis le dépôt :

- `decisions.ts:232` porte bien le refus `decision_invalide`, et `:299` la
  création du résultat sur `tx` (`git show 4ecad8e1:web/src/lib/biology-library/import/decisions.ts`).
- `decisions.test.ts:87` installe bien
  `prisma.$transaction.mockImplementation(async cb => cb(prisma))` : le double
  confond les deux clients, comme le dit P1-2.
- Les diffs M1 et M2 du dossier de preuve ne comptent chacun qu'un seul bloc
  d'une ligne changée, sur la cible ; en voici l'en-tête de bloc et les
  lignes changées (lignes de contexte omises) :

  ```diff
  @@ -229,7 +229,7 @@ export async function deciderLignes(params: {
  -    if (b.decision !== 'valider') return refuser(index, idLigne, 'decision_invalide');
  +    if (false && b.decision !== 'valider') return refuser(index, idLigne, 'decision_invalide');
  @@ -296,7 +296,7 @@ export async function deciderLignes(params: {
  -        const resultat = await tx.resultatBiologique.create({
  +        const resultat = await prisma.resultatBiologique.create({
  ```

Ce qui ne se vérifie pas depuis le dépôt, **déclaré par Codex, non revérifié** :
les sorties de bancs (32 tests verts sous chaque mutation), les codes de
`npm run check` mutés, la suppression de la copie jetable et la propreté des
deux copies (le constat du dossier de preuve porte
`restored_copy_status_before_removal` et `launch_copy_status` vides). Ces
pièces sont restées dans le dossier local du responsable. Le banc de chaque
lot ci-dessous rejoue sa mutation, ce qui revérifiera le `SURVIT`.

Deux lots de banc sont **proposés au responsable, non écrits**. Aucun ne
touche au code de production, ni à une valeur, ni à un seuil :

| Lot proposé | Survivant | Contenu | Doit rougir sous |
|---|---|---|---|
| d25-b1 | M1 | dans `decisions.test.ts`, un lot mixte : `l1` validée, puis `l7` au même analyte, à une autre date, avec une action inconnue ; attendu `decision_invalide` pour la seconde entrée, aucune transaction, aucune création de résultat | la mutation M1 |
| d25-b2 | M2 | dans `decisions.test.ts`, des doubles distincts pour le client global et le client transactionnel, et les créations exigées sur `tx` ; en plus, un témoin PostgreSQL local qui fait échouer la décision après la première création et constate aucun résultat conservé, toutes les lignes encore proposées, le document intact | la mutation M2 |

Chaque lot rejoue sa mutation avant le merge : le banc neuf doit rougir sous
elle et reverdir après restauration. Le témoin PostgreSQL de d25-b2 suit la
forme des bancs à deux sessions (variable qui nomme la base, égale au nom de
la base de `DATABASE_URL`) ; son nom et son pas CI se fixent dans le lot.
