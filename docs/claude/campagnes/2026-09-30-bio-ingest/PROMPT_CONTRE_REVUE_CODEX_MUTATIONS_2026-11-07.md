# Contre-revue adverse, passe des mutations (reprise) — M1 à M11 et M15

> Énoncé versé au dépôt AVANT d'être joué. Lancé manuellement par le
> responsable (levée de la ligne D/25 du plan, arbitrage du 2026-11-07). Il
> reprend `PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-10-10.md` (même dossier)
> pour les seules lignes jamais jouées : la passe du 2026-10-10 n'a joué que
> M12, M13, M14 et M17, et l'auteur a fermé M16 et M18
> (`REVUE_CODEX_MUTATIONS_2026-10-10.md`, §1 et §4). Les lignes ont été
> requalifiées sur la cible ci-dessous (§3) : depuis le 2026-10-10, le code a
> bougé (file d'extraction, masquage d'identité, commentaires du
> laboratoire, purge de D-451, concordance d'unités de D-356).

## 0. Ta mission

Les bancs de BIO-INGEST ont été écrits par l'auteur du code, et aucun tiers
ne les a éprouvés sur ces lignes. C'est ta seule mission : **pour chaque
invariant ci-dessous, casse le code de production et dis si le banc qui le
garde rougit.**

**C'est toi qui choisis la mutation**, pas l'auteur : une mutation qu'il
aurait prévue ne prouve rien. La colonne « Surface en vigueur » est un point
de départ, pas une borne : si l'invariant se casse mieux ailleurs, mute
ailleurs, et dis où.

**Avant de jouer une mutation, désigne par écrit le ou les bancs censés la
détecter**, ceux qui gardent la surface que tu casses, et non tous ceux de la
ligne. **Si tous les bancs désignés restent verts, c'est une trouvaille P1**
(« banc qui ne mord pas sur un invariant »), avec la sortie en preuve. Un banc
non désigné qui reste vert ne prouve rien.

---

## 1. Règles d'engagement, non négociables

- **Cible épinglée** : `4ecad8e10cd8c744fbc6cdfa6a1de6c040bd9a01` (`main`
  après #1901). Les `fichier:ligne` de cet énoncé sont ceux de ce commit. Pas
  de tête plus récente.
- **Copie jetable seulement** : `git worktree add --detach <dossier> 4ecad8e1`,
  **propre à sa création** (`git status --porcelain` vide), jamais dans la
  copie où tu as été lancé. Tu y mutes, joues les bancs désignés, notes la
  sortie, **restaures** (`git checkout -- <fichier>`, puis
  `git status --porcelain` vide), et seulement ensuite tu passes à la mutation
  suivante. À la fin : `git worktree remove --force <dossier>`. Si tu ne peux
  pas créer cette copie propre, **ne mute pas** : tout est `NON VÉRIFIABLE`,
  avec le motif.
- **Installation, une fois, avant la première mutation**, depuis `web/` de la
  copie : `npm ci`, puis `npx prisma generate`. Si l'une échoue, tout est
  `NON VÉRIFIABLE`, avec la sortie.
- **Base locale** : depuis la racine de la copie,
  `bash scripts/wn-dev-db.sh --migrate`. Le script crée une base PostgreSQL
  propre à ce chemin (`wellneuro_dev_<hash>`), y applique les migrations, et
  **imprime** l'URL à passer en `DATABASE_URL` (il n'écrit aucun
  `.env.local`). Si PostgreSQL ne répond pas, les lignes qui exigent une base
  sont `NON VÉRIFIABLE`.
- **Une mutation de migration ou de trigger ne se joue jamais sur cette
  base** : elle y resterait après la restauration. Elle se joue par
  `npm run test:worktree -- --fast` (depuis `web/`), qui crée une base
  **éphémère**, y applique les migrations de la copie, puis joue les contrats
  SQL et les bancs à deux sessions. Il s'arrête au premier rouge et le nomme ;
  sa sortie de banc va à `/dev/null` : relance seul le banc nommé pour la lire.
  Il joue d'abord les suites : quelques minutes sans sortie ne sont pas un
  blocage.
- **Mute la définition EN VIGUEUR** d'une fonction trigger : la dernière
  migration qui la réécrit (`CREATE OR REPLACE FUNCTION`). Muter une version
  remplacée ne prouve rien. Les versions en vigueur sont indiquées au §3.
- **Commandes admises**, depuis `web/` de la copie :
  - `npx vitest run <fichier>` et `npm run check` ;
  - un contrat SQL sur la base locale :
    `DATABASE_URL=<url imprimée> npx prisma db execute --file prisma/checks/<contrat>.sql` ;
  - un banc à deux sessions sur la base locale, comme le CI
    (`.github/workflows/ci.yml`) le lance : `DATABASE_URL=<url>` plus la
    variable qui nomme la base (elle doit égaler le nom de la base de
    `DATABASE_URL`, sinon le banc refuse) :
    - `WN_BIO_ECART_BANC_BASE=<base> node scripts/banc-ecart-validation-deux-sessions.test.mjs`
    - `WN_BIO_MASQUAGE_BANC_BASE=<base> node scripts/banc-masquage-purge-deux-sessions.test.mjs`
    - `WN_BIO_FILE_BANC_BASE=<base> TZ=Europe/Paris node prisma/runWithAlias.js scripts/banc-file-extraction-deux-sessions.test.ts`
    - `WN_BIO_PURGE_BANC_BASE=<base> node prisma/runWithAlias.js scripts/banc-purge-echeance.test.ts`
  - `npm run test:worktree -- --fast`, pour les mutations de migration.
- **Aucune PR, aucun commit, aucun push.** Aucune migration appliquée hors de
  la base locale de la copie ou de la base éphémère de `test:worktree`.
  **Aucun accès à la production** (ni `scalingo`, ni base distante, ni URL).
  **Aucun appel à l'API Anthropic** : les bancs de l'extraction simulent le
  client ou le serveur.
- **Aucune identité patient réelle** : fixtures seules (Sophie Nicola,
  Jennifer Martin, Michel Dogné). Aucun compte rendu réel n'est dans le
  dépôt, et tu n'en fabriques pas d'imitation.
- **Une mutation touche le code de production, une migration ou un trigger,
  jamais un banc.** Une seule idée par mutation, la plus petite possible. Si
  la première n'est attrapée que par le typage (`npm run check`), joue-en une
  seconde qui compile.
- **Réponds en français. Ne corrige rien.**

---

## 2. Ce qu'il ne faut PAS demander

Arbitrages du responsable, datés et consignés :

- les valeurs des bornes (240 s, 5 min, 6 min, 20 s, 300/50, 1000/4000,
  30 jours, 1 h, 3 et 10/24 h) ;
- les équivalences d'unités de `D-356` §3-§4 (« mL/min » ≡
  « mL/min/1,73 m² » ; une unité absente concorde avec « ratio ») : ce sont
  des règles, pas des failles ;
- que la **base** tienne les plafonds, l'accusé `usage_ia`, le dossier ouvert
  ou le refus du retrait d'un dépôt patient (`D-269`, en-tête de
  `20261007100000_bio_ingest_transmission_patient_v1`) ;
- le contenu clinique du catalogue, des unités et du résolveur.

---

## 3. Les invariants, leurs surfaces en vigueur et leurs bancs

Au moins **une** mutation par ligne. Chemins sous `web/` ; `import/` abrège
`src/lib/biology-library/import/`, `api/` abrège `src/app/api/`,
`migrations/` abrège `prisma/migrations/`.

**Versions en vigueur des triggers** (sur la cible) :

- `bio_ingest_ligne_avant_modification` (trigger de ligne) :
  `migrations/20261010220000_bio_ingest_commentaires_laboratoire_v1/migration.sql:140`.
  Il a été réécrit six fois ; cette version gèle aussi `commentaire_lu` et
  `commentaire_non_transcrit`, et garde le `FOR SHARE OF c` (:181) ;
- `bio_ingest_compte_rendu_avant_purge` (trigger de purge) :
  `migrations/20261007100000_bio_ingest_transmission_patient_v1/migration.sql:115` ;
- masquage : `bio_ingest_masquage_avant_purge` et
  `bio_ingest_compte_rendu_apres_purge`,
  `migrations/20261013233000_bio_ingest_masquage_identite_v1/migration.sql:164` et `:207`.

| # | Invariant | Surface en vigueur (point de départ) | Bancs à désigner parmi |
|---|---|---|---|
| M1 | Une ligne ne devient un résultat que sur décision « validée » du praticien ; une ligne écartée n'écrit rien | `import/decisions.ts` (`deciderLignes` :159, branche `valider` :232-258, écriture :297 et suivantes) ; trigger de ligne en vigueur | `import/decisions.test.ts`, `prisma/checks/bio_ingest_staging_v1_negatif.sql`, `prisma/checks/bio_ingest_commentaires_laboratoire_v1_negatif.sql` |
| M2 | Une soumission de décisions est entière ou rien | `import/decisions.ts` : préflight qui refuse tout avant écriture (:271-275), transaction unique (:279) et relecture sous le verrou (:283-296) | `import/decisions.test.ts` |
| M3 | Une ligne ne se décide qu'une fois ; son « lu » (valeur, unité, faits, commentaires du laboratoire) ne se réécrit jamais, **en base** | trigger de ligne **en vigueur** (`20261010220000`, :140) ; côté code, `updateMany` filtré `proposee` et `count !== 1` (`decisions.ts` :317, :324) | `prisma/checks/bio_ingest_staging_v1_negatif.sql`, `prisma/checks/bio_ingest_faits_laboratoire_v1_negatif.sql`, `prisma/checks/bio_ingest_commentaires_laboratoire_v1_negatif.sql`, `import/decisions.test.ts` |
| M4 | L'analyte proposé ne vient que du résolveur signé, jamais du modèle | `import/lancerExtraction.ts` (`consignerLignes` :224, appel `resoudreLigne`) ; `import/resolverLibellesV1.ts` (résolveur, départage par unité via `unitesConcordent`) | `import/lancerExtraction.test.ts`, `import/resolverLibellesV1.test.ts` |
| M5 | Sur la voie d'import, une unité lue qui ne concorde pas avec celle du catalogue est refusée, jamais convertie ; seules concordent l'égalité, les notations de la liste fermée et les deux règles de `D-356` §3-§4. Sur la saisie unitaire et le bilan, l'unité écrite est celle du catalogue relue à l'instant, jamais une unité venue du client | `import/valeurLue.ts` (`unitesConcordent` :101, liste fermée :94-98) et son appel `decisions.ts:252` ; `api/praticien/biologie/resultats/route.ts` (écriture :659-668) ; `api/praticien/biologie/resultats/bilan/route.ts` (:187-207) | `import/valeurLue.test.ts`, `import/decisions.test.ts`, `api/praticien/biologie/resultats/route.test.ts`, `api/praticien/biologie/resultats/bilan/route.test.ts`, `prisma/checks/cb_biologie_catalogue_v1_negatif.sql`, `prisma/checks/cb_resultats_biologiques_v1_negatif.sql` |
| M6 | Aucune valeur ne passe par un `number` entre la saisie ou la lecture et la base (trois voies) | `src/lib/biology-library/valeurDecimale.ts` ; les trois `new Prisma.Decimal(<chaîne>)` : `decisions.ts:304`, `resultats/route.ts:665`, `resultats/bilan/route.ts:207` ; saisie côté écran : `src/components/patient-cockpit/EstimeMesurePanel.tsx`, `SaisieBilan.tsx` | `src/lib/biology-library/valeurDecimale.test.ts`, `import/decisions.test.ts`, `api/praticien/biologie/resultats/route.test.ts`, `api/praticien/biologie/resultats/bilan/route.test.ts`, `src/components/patient-cockpit/EstimeMesurePanel.test.tsx` |
| M7 | L'appel d'extraction est borné en totalité, flux compris ; cette durée, plus la transaction des lignes et une marge, reste sous la péremption du verrou | `import/extraction.ts` (`DUREE_TOTALE_EXTRACTION_MS` :68, `AbortController` et minuteur :360-361, `signal` :383, `delai_depasse` ensuite) ; `import/verrou.ts` (`PEREMPTION_EN_COURS_MS` :14, `DELAI_TRANSACTION_LIGNES_MS` :24) | `import/extraction.borne.test.ts`, `import/extraction.test.ts` (relation des durées :368) |
| M8 | Le contenu se purge à la dernière décision, à l'écart, et à 30 jours ; la base refuse toute autre purge, et toute purge pendant une extraction ouverte. À l'échéance, la purge ne diffère que dans la grâce d'une heure, puis close elle-même import et travail ouverts avant de purger (`D-451`) | `import/decisions.ts` (purge `lignes_decidees`) ; `import/ecart.ts:103` (`ecarte`) ; `import/purge.ts` (`ECHEANCE_DEPOT_JOURS` :38, `GRACE_TRAVAIL_OUVERT_MS` :46, clôture des ouverts :122-162, purge :166, `purgerAEcheance` :179) ; trigger de purge en vigueur (`20261007100000`, :115) ; triggers du masquage (`20261013233000`) | `import/decisions.test.ts`, `import/purge.test.ts`, `import/ecart.test.ts`, `prisma/checks/bio_ingest_purge_v1_negatif.sql`, `prisma/checks/bio_ingest_transmission_patient_v1_negatif.sql`, `prisma/checks/bio_ingest_masquage_identite_v1_negatif.sql`, `scripts/banc-purge-echeance.test.ts`, `scripts/banc-masquage-purge-deux-sessions.test.mjs` |
| M9 | Les faits et les commentaires du laboratoire sont verbatim ; au-delà de leur borne : `NULL` et signal, sans troncature ni échec ; signal interdit à côté d'un fait | `import/extraction.ts` (`lireFaitLaboratoire` :255, bornes :106-110, `analyserSortieExtraction` :280) ; écriture dans `import/lancerExtraction.ts` (`consignerLignes`) ; CHECK des migrations `20261005210000_bio_ingest_faits_non_transcrits_v1` et `20261010220000_bio_ingest_commentaires_laboratoire_v1` | `import/extraction.test.ts`, `import/lancerExtraction.test.ts`, `prisma/checks/bio_ingest_faits_non_transcrits_v1_negatif.sql`, `prisma/checks/bio_ingest_commentaires_laboratoire_v1_negatif.sql`, `e2e/sentinelle-marquage.spec.ts` (désigne-le, ne le joue pas) |
| M10 | Une image est réencodée sans métadonnées sur chaque voie de dépôt ; la signature d'octets décide du type | `import/depot.ts` (`jugerFichier` :61, `preparerImage` :94) ; appelants : `api/portail/comptes-rendus/route.ts`, `api/praticien/biologie/import/depot/route.ts`, `api/portail/documents/route.ts`, `import/enregistrerMasquage.ts` (`preparerImage` seule, après un contrôle JPEG) | `api/praticien/biologie/import/depot/route.test.ts`, `api/portail/comptes-rendus/route.test.ts`, `api/portail/documents/route.test.ts`, `import/enregistrerMasquage.test.ts` |
| M11 | La (re)lecture est refusée après une ligne validée, sur un document purgé, échu ou sans masquage, et ne réécrit aucun import antérieur | **par la file** : la route `api/praticien/biologie/import/extraction/route.ts:70` appelle `demanderExtraction` (`import/fileExtraction.ts:81`, refus :107, :115, :134, :138), puis le worker rejuge à la réclamation (`ouvrirExtractionDans`, `import/lancerExtraction.ts:101`, refus :116, :139, :143). `lancerExtraction()` (:83) n'a plus d'appelant de production : la muter ne prouve rien | `import/fileExtraction.test.ts`, `import/boucleFileExtraction.test.ts`, `import/lancerExtraction.test.ts` (pour `ouvrirExtractionDans`), `api/praticien/biologie/import/extraction/route.test.ts`, `scripts/banc-file-extraction-deux-sessions.test.ts`, `prisma/checks/g3_travaux_extraction_biologique_v1_negatif.sql` |
| M15 | L'écart d'un document patient et la validation d'une ligne s'excluent en base, dans les deux ordres | trigger de purge, motif `ecarte` (`20261007100000`, :115 et suivantes) ; trigger de ligne **en vigueur** (`20261010220000`, `FOR SHARE OF c` :181) ; `import/ecart.ts` (`ecarterCompteRendu` :59, refus :84, purge :103) | `scripts/banc-ecart-validation-deux-sessions.test.mjs`, `prisma/checks/bio_ingest_transmission_patient_v1_negatif.sql`, `import/ecart.test.ts`, `api/praticien/biologie/import/ecart/route.test.ts` |

**Fait complémentaire à examiner (M7)** : la file réserve le travail pendant
6 minutes (`RESERVATION_TRAVAIL_MS`, `import/fileExtraction.ts:51`), contre
une péremption du verrou de 5 minutes (`import/verrou.ts:14`). Aucun test
reliant ces deux durées n'a été relevé à la requalification. Ce constat ne
démontre pas un défaut et ne pose aucune relation normative entre elles :
étendre M7 au bail de réservation introduirait une exigence nouvelle, à
décider explicitement. Si tu l'examines, rends un constat, pas un verdict
`SURVIT`.

---

## 4. Sortie attendue

1. **Tableau** : `#` | fichier:ligne muté | mutation (une ligne de diff) |
   bancs désignés (avant de jouer) | résultat de chacun (**rouge** / **vert** /
   typage seul) | verdict : **`MORD`** (au moins un banc désigné rougit),
   **`SURVIT`** (tous les bancs désignés restent verts) ou
   **`NON VÉRIFIABLE`** (avec le motif).
2. **Trouvailles** : chaque `SURVIT` est une P1, avec la sortie des bancs
   désignés restés verts et l'invariant qu'ils laissent passer.
3. **Contrôles finaux** : le code restauré (`git status --porcelain` vide),
   les bancs ciblés verts sans mutation, `npm run check` vert, la copie
   supprimée.
4. **Non vérifié**, et pourquoi.

Sois bref sur ce qui mord ; sois précis sur ce qui survit.
