# Contre-revue adverse, passe des mutations — les bancs de BIO-INGEST mordent-ils ?

> Énoncé versé au dépôt AVANT d'être joué. Lancé manuellement par le
> responsable. Passe sur lecture, indépendante :
> `PROMPT_CONTRE_REVUE_CODEX_2026-10-10.md`, dans ce dossier. Résultat attendu
> dans `REVUE_CODEX_MUTATIONS_2026-10-10.md`, dans ce dossier.

## 0. Ta mission

Les bancs de BIO-INGEST ont été écrits par l'auteur du code, et aucun tiers
ne les a jamais éprouvés. C'est ta seule mission : **pour chaque invariant
ci-dessous, casse le code de production et dis si le banc qui le garde
rougit.**

**C'est toi qui choisis la mutation**, et non l'auteur : une mutation qu'il
aurait prévue ne prouve rien.

**Avant de jouer une mutation, désigne le ou les bancs censés la détecter.**
Ce sont ceux qui gardent la surface que tu casses, et non tous ceux de la
ligne. Une ligne peut réunir des surfaces indépendantes : le banc d'une page
n'a pas à rougir quand tu casses la route. **Si tous les bancs désignés
restent verts, c'est une trouvaille P1** (« banc qui ne mord pas sur un
invariant »), `CONFIRMÉE` puisque tu en donnes la sortie. Un banc non désigné
qui reste vert ne prouve rien.

**Trois lignes sont signalées par l'auteur comme probablement sans banc qui
morde** (M16, M17, M18). Ne les tiens pas pour acquises : joue-les comme les
autres. Elles comptent comme trouvailles si elles se confirment.

---

## 1. Règles d'engagement, non négociables

- **Mutations dans un worktree jetable seulement** :
  `git worktree add --detach <dossier> <commit>`, **propre à sa création**
  (`git status --porcelain` vide), jamais dans la copie où tu as été lancé. Tu y
  mutes, joues le banc, notes la sortie, remets le fichier
  (`git checkout -- <fichier>`), puis passes à la mutation suivante. À la fin :
  `git worktree remove --force <dossier>`. Si tu ne peux pas créer ce worktree
  propre, **ne mute pas** : tout est `NON VÉRIFIABLE`, avec le motif.
- **Une mutation touche le code de production, une migration ou un trigger,
  jamais un banc.** Une seule idée par mutation, la plus petite possible.
- **Installation, une fois, avant la première mutation** : le worktree neuf
  n'a pas les `node_modules` de la copie d'origine. Depuis son `web/` :
  `npm ci`, puis `npx prisma generate`. Ces deux commandes partent du lockfile
  et du schéma du commit visé. Si l'une échoue, tout est `NON VÉRIFIABLE`,
  avec la sortie.
- **Commandes admises**, depuis `web/` du worktree jetable :
  - `npx vitest run <fichier>` et `npm run check` ;
  - `npm run test:worktree -- --fast`, seulement pour les contrats SQL
    (`prisma/checks/*.sql`) et les deux bancs sur base réelle
    (`scripts/banc-*-deux-*.test.*`). Cette commande exige un PostgreSQL
    local ; s'il ne répond pas, ces invariants sont `NON VÉRIFIABLE`. Le script
    crée sa propre base **éphémère** et y applique les migrations : c'est
    admis, et c'est ce qui éprouve une mutation de migration. Il s'arrête au
    premier contrat ou banc rouge, et le nomme.
- **Aucune PR, aucun commit, aucun push.** Aucune migration appliquée **hors
  de la base éphémère de `test:worktree`**. Aucun accès à la production (ni
  `scalingo`, ni base, ni URL). **Aucun appel à l'API Anthropic** : les bancs
  de l'extraction simulent le client ou le serveur.
- **Aucune identité patient réelle** : fixtures seules (Sophie Nicola,
  Jennifer Martin, Michel Dogné). Aucun compte rendu réel n'est dans le
  dépôt, et tu n'en fabriques pas d'imitation.
- **Réponds en français. Ne corrige rien.**

---

## 2. Cible

`main` à **`e78a9c6d`** ou postérieur. Le code de la campagne n'a pas bougé
depuis `2eb11f82` (LOT-11, #1380).

---

## 3. Les invariants et leurs bancs

Il faut au moins **une** mutation par ligne. Si la première n'est attrapée que
par le typage (`npm run check`), joue-en une seconde qui compile. Chemins sous
`web/`. La colonne « Code à muter » est un point de départ, et non une borne :
si l'invariant se casse mieux ailleurs, mute ailleurs, et dis où.

| # | Invariant | Code à muter | Bancs à jouer |
|---|---|---|---|
| M1 | Une ligne ne devient un résultat que sur décision « validée » du praticien ; une ligne refusée n'écrit rien | `src/lib/biology-library/import/decisions.ts` | `import/decisions.test.ts`, `prisma/checks/bio_ingest_staging_v1_negatif.sql` |
| M2 | Une soumission de décisions est entière ou rien | `import/decisions.ts` (transaction, ordre des contrôles) | `import/decisions.test.ts` |
| M3 | Une ligne ne se décide qu'une fois ; son « lu » ne se réécrit jamais, **en base** | migrations `20261001210000_bio_ingest_staging_v1` et `20261007100000_bio_ingest_transmission_patient_v1` (trigger de ligne) | `prisma/checks/bio_ingest_staging_v1_negatif.sql`, `prisma/checks/bio_ingest_faits_laboratoire_v1_negatif.sql` |
| M4 | L'analyte proposé ne vient que du résolveur signé, jamais du modèle | `import/lancerExtraction.ts`, `import/resolverLibellesV1.ts` | `import/lancerExtraction.test.ts`, `import/resolverLibellesV1.test.ts` |
| M5 | Une unité divergente est refusée, jamais convertie (trois voies) | `import/valeurLue.ts` (`unitesConcordent`), `api/praticien/biologie/resultats/bilan/route.ts`, `api/praticien/biologie/resultats/route.ts` | `import/valeurLue.test.ts`, `import/decisions.test.ts`, `api/praticien/biologie/resultats/bilan/route.test.ts`, `api/praticien/biologie/resultats/route.test.ts`, `prisma/checks/cb_biologie_catalogue_v1_negatif.sql` |
| M6 | Aucune valeur ne passe par un `number` entre la saisie ou la lecture et la base (trois voies) | `src/lib/biology-library/valeurDecimale.ts`, `import/decisions.ts`, `api/praticien/biologie/resultats/bilan/route.ts`, `api/praticien/biologie/resultats/route.ts` | `src/lib/biology-library/valeurDecimale.test.ts`, `import/decisions.test.ts`, `api/praticien/biologie/resultats/bilan/route.test.ts`, `api/praticien/biologie/resultats/route.test.ts`, `src/components/patient-cockpit/EstimeMesurePanel.test.tsx` |
| M7 | L'appel d'extraction est borné en totalité, flux compris, sous la péremption du verrou | `import/extraction.ts` (`DUREE_TOTALE_EXTRACTION_MS`, `AbortController`, `signal`), `import/verrou.ts` | `import/extraction.borne.test.ts`, `import/extraction.test.ts` |
| M8 | Le contenu se purge à la dernière décision, à l'écart, et à 30 jours au plus tard ; la base refuse toute autre purge, et toute purge pendant une extraction | `import/decisions.ts`, `import/purge.ts`, `import/ecart.ts`, trigger `bio_ingest_compte_rendu_avant_purge` | `import/decisions.test.ts`, `import/purge.test.ts`, `import/ecart.test.ts`, `prisma/checks/bio_ingest_purge_v1_negatif.sql`, `prisma/checks/bio_ingest_transmission_patient_v1_negatif.sql` |
| M9 | Les faits du laboratoire sont verbatim ; au-delà de 300/50 points de code : `NULL` et signal, sans troncature ni échec ; signal interdit à côté d'un fait | `import/extraction.ts` (`lireFaitLaboratoire`, bornes), `import/lancerExtraction.ts`, migration `20261005210000_bio_ingest_faits_non_transcrits_v1` | `import/extraction.test.ts`, `import/lancerExtraction.test.ts`, `prisma/checks/bio_ingest_faits_non_transcrits_v1_negatif.sql`, `e2e/sentinelle-marquage.spec.ts` (désigne-le, ne le joue pas) |
| M10 | Une image est réencodée sans métadonnées sur les deux voies ; la signature d'octets décide du type | `import/depot.ts` (`preparerImage`, `jugerFichier`), `api/portail/comptes-rendus/route.ts`, `api/praticien/biologie/import/depot/route.ts` | `api/praticien/biologie/import/depot/route.test.ts`, `api/portail/comptes-rendus/route.test.ts` |
| M11 | La relance est refusée après une ligne validée ou sur un document purgé, et ne réécrit aucun import antérieur | `import/lancerExtraction.ts` | `import/lancerExtraction.test.ts`, `api/praticien/biologie/import/extraction/route.test.ts` |
| M12 | Le patient ne lit et ne dépose que dans son dossier ; la liste ne rend que date et statut de ses transmissions | `import/transmission.ts` (`listerTransmissions`, `deposerTransmission`), `api/portail/comptes-rendus/route.ts` | `import/transmission.test.ts`, `api/portail/comptes-rendus/route.test.ts`, `import/transmissionStatut.test.ts` |
| M13 | Aucun dépôt sans l'accusé courant d'`usage_ia` (version et empreinte), ni dans un dossier clos ; drapeau fermé, tout se tait | `import/transmission.ts` (`aPrisConnaissanceUsageIa`), `api/portail/comptes-rendus/route.ts`, `src/lib/biology-library/featureFlag.ts`, `src/app/portail/[token]/comptes-rendus/page.tsx` | `import/transmission.test.ts`, `api/portail/comptes-rendus/route.test.ts`, `src/app/portail/[token]/comptes-rendus/page.test.tsx` |
| M14 | Les plafonds tiennent en concurrence (verrou du dossier, nouveau jugement sous lui) | `import/transmission.ts` (`pg_advisory_xact_lock`, second `jugerPlafonds`) | `scripts/banc-plafond-transmission-deux-depots.test.ts` (par `test:worktree -- --fast`), `import/transmission.test.ts` |
| M15 | L'écart d'un document patient et la validation d'une ligne s'excluent en base, dans les deux ordres | trigger de purge (motif `ecarte`) et trigger de ligne (`FOR SHARE`) de la migration `20261007100000_…`, `import/ecart.ts` | `scripts/banc-ecart-validation-deux-sessions.test.mjs`, `prisma/checks/bio_ingest_transmission_patient_v1_negatif.sql`, `import/ecart.test.ts`, `api/praticien/biologie/import/ecart/route.test.ts` |
| M16 | Aucun journal ne recopie le message d'une erreur, **hors** du dossier `import/` aussi | `api/portail/comptes-rendus/route.ts`, `scripts/purgeComptesRendusEcheance.ts`, `api/praticien/biologie/resultats/bilan/route.ts`, `src/lib/biology-library/saisieMessages.ts` | `src/lib/fiches-assiette/journaux.guard.test.ts`, `api/portail/comptes-rendus/route.test.ts`, `api/praticien/biologie/resultats/bilan/route.test.ts` |
| M17 | L'effacement d'un dossier supprime documents, imports, lignes, lectures et résultats, sans orphelin ni échec | `src/lib/patient/effacement.ts` (suppressions des quatre tables d'import, et leur ordre) | `src/lib/patient/effacement.test.ts`, `src/lib/biology-library/staging.guard.test.ts`, contrats SQL (cas « effacement nommé ») |
| M18 | Chaque route d'import passe la garde (drapeau, session, appartenance, journal d'accès) avant toute lecture ou écriture | `api/praticien/biologie/import/decisions/route.ts` (aucun `route.test.ts` à côté), puis `api/praticien/biologie/import/document/route.ts` | ceux que tu trouves pour la route des décisions ; `api/praticien/biologie/import/document/route.test.ts` pour le visionneur |

Le chemin `import/` abrège `src/lib/biology-library/import/` ; `api/`
abrège `src/app/api/`.

---

## 4. Ce qu'il ne faut PAS demander

Ces arbitrages du responsable sont datés et consignés :

- que la **base** tienne les plafonds, l'accusé `usage_ia`, le dossier ouvert
  ou le refus du retrait d'un dépôt patient : ils sont rangés dans le code par
  l'en-tête de la migration `20261007100000_bio_ingest_transmission_patient_v1`
  (`D-269`) ;
- que l'E2E patient aille au-delà du statut « En attente » (arbitrage du
  2026-10-10, LOT-11) ;
- les valeurs des bornes (240 s, 5 min, 20 s, 300/50, 30 jours, 3 et 10/24 h) ;
- le contenu clinique du catalogue, des unités et du résolveur.

---

## 5. Sortie attendue

1. **Tableau** : `#` | fichier:ligne muté | mutation (une ligne de diff) |
   bancs désignés (avant de jouer) | résultat de chacun (**rouge** / **vert** /
   typage seul) | verdict (`MORD` / `NE MORD PAS` / `NON VÉRIFIABLE`).
2. **Trouvailles** : chaque `NE MORD PAS` est une P1, avec la sortie des
   bancs désignés restés verts et l'invariant qu'ils laissent passer.
3. **Contrôles finaux** : le code restauré, les bancs ciblés verts sans
   mutation, `npm run check` vert, le worktree supprimé.
4. **Non vérifié**, et pourquoi.

Sois bref sur ce qui mord ; sois précis sur ce qui ne mord pas.
