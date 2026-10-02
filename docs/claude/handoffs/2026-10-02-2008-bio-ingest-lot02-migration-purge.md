# Handoff — 2026-10-02 — BIO-INGEST LOT-02 : migration de la purge du compte rendu (D-257)

## Branche et état Git

- `feat/bio-ingest-lot02-purge-migration`, partie de `origin/main` à `a9ed0ede` (#1282).
- Commits :
  - `1403de0b` : migration, v12, contrats ;
  - `42bb95f7` : retour arrière précisé, conditions de la PR 2.
- Clôture faite sur la branche. **PR à ouvrir.**

## Objectif

Point 2 des arbitrages du 2026-10-02 (fiche LOT-02) : purger le PDF déposé
**avant** la pose de `WN_BIO_INGEST_ENABLED`. Le lot se fait en deux PR
([[D-087]]) :

- **cette PR** : la migration seule, et la v12 ;
- **la PR 2** : le code consommateur, après `release-db` et constat.

## Décisions prises (mode Plan, responsable, 2026-10-02)

- **D-257** : le document est purgé dès que l'extraction courante est
  décidée, et **au plus tard 30 jours** après le dépôt.
  - Restent l'empreinte, les extractions et les lignes lues (A5).
  - Les sauvegardes de l'hébergeur ne sont pas déclarées tant que leur
    rétention n'est pas établie.
- **Colonne `heure_lue`** : oui, `DEFAULT false` (fail-closed : l'heure reste
  exigée tant que l'extraction ne l'écrit pas).
- **Échéance** : tenue par un **cron Scalingo** (`web/cron.json`, conteneur
  ponctuel), sans route ni secret.
- **v12 de `donnees_confidentialite`** : accusé exigé, une seule phrase
  change.

## Fichiers modifiés

- Migration `web/prisma/migrations/20261002200000_bio_ingest_purge_compte_rendu_v1/` :
  - `contenu` devient nullable ;
  - ajout de `purge_le` et `motif_purge` ;
  - le trigger `bio_ingest_compte_rendu_avant_purge` remplace le gel ;
  - une insertion d'import est refusée sur un document purgé ;
  - ajout de `heure_lue`, avec son CHECK, dans le tuple figé.
- `web/prisma/schema.prisma`.
- Compagnon `lancerExtraction.ts`, pour `contenu` nullable.
- Contrats :
  - nouveau `bio_ingest_purge_v1_negatif.sql`, avec son étape dans `ci.yml` ;
  - `bio_ingest_staging_v1_negatif.sql` ajusté : message du gel, colonnes,
    7 fonctions.
- `web/src/lib/trust/contenus/registre.ts` (v12) et `registre.test.ts`.
- Documentation :
  - `docs/DECISIONS.md` (D-257) ;
  - `docs/DOSSIER_RGPD.md` (§2 ter, rubriques 5, 8 et 14) ;
  - `docs/FEATURE_FLAGS.md` ;
  - la fiche LOT-02 ;
  - `changelog.d/2026-10-02-bio-ingest-lot02-migration-purge.md`.

## Validations exécutées

- Contrats v1 et purge verts sur une base migrée de zéro, en Europe/Paris.
- **32 mutants tués sur 32**, chacun par le contrat ; le témoin reste vert.
- Parité `migrate diff` : *No difference detected*.
- T1 complet vert.
- Tests trust verts : 71.
- **T3 vert** : séquence CI complète, 225 E2E Chromium + WebKit.
- `wn-reviewer` : **GO**, aucun P0. P2-3 corrigé (retour arrière). P1 et P2
  routés vers la PR 2, dans la fiche.
- **Constat de production avant `release-db`** (conteneur, lecture seule) :
  - staging vide, 0/0/0 ;
  - dernière migration appliquée : `bio_ingest_staging_v1`.

## Problèmes ouverts

- **Texte de la v12** : à relire et valider par le responsable **avant le
  merge**. La phrase est dans `registre.ts`, constante `DONNEES_CONFIDENTIALITE_V12`.
- **Rétention des sauvegardes Scalingo** : à établir. Ensuite seulement, la
  déclarer au patient et dans la rubrique 8.
- **`publieLe` de la v12** vaut `2026-10-02`. Si le merge glisse, le passer à
  la date réelle et recalculer le hash (le test le donne).
- **Base locale jetable `wellneuro_purge_contrat`** : un `DROP` attend
  l'accord de l'utilisateur.
- **Conditions de la PR 2** (fiche LOT-02, point 2) :
  - **P1** : le cron clôt d'abord les imports `en_cours` périmés, puis purge ;
  - **P2** : le cron prend le même verrou consultatif ;
  - **P2** : la purge passe par `updateMany` avec `contenu: { not: null }`,
    après avoir compté zéro ligne proposée ;
  - relance refusée par un 409 `document_purge` ;
  - `lecture.ts:63` à aligner.

## Prochaine action exacte

1. Le responsable relit et valide la phrase de la v12.
2. Ouvrir la PR (`--body-file`). Attendre le CI en fond
   (`wn-attendre-ci`, code 0). Lire les commentaires en ligne. Merger.
3. **`release-db` approuvé par le responsable.**
4. Constat par conteneur :
   - migrations agrégées par nom ;
   - colonnes `purge_le`, `motif_purge`, `heure_lue` ;
   - trigger `comptes_rendus_biologiques_avant_purge` présent ;
   - `no_update` absent ;
   - `relrowsecurity`.
5. `/clear`, puis la PR 2, selon les conditions de la fiche.

## Interdits encore actifs

- Aucun code consommateur avant le constat.
- Jamais `prisma format`.
- `release-db` reste humain.
- Aucune écriture dans `resultats_biologiques` sans geste du praticien.
- Aucune conversion d'unité, aucune qualification de valeur.
- Fixtures seulement. Aucun seed ni E2E sur un dossier réel.
- Drapeau éteint.
- Aucun chiffre sur les sauvegardes sans vérification.
- Ne pas sonder le CI.
