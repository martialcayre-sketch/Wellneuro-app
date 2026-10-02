# Handoff — 2026-10-02 — BIO-INGEST LOT-02 : code consommateur de la purge (PR 2 de D-258)

## Branche et état Git

- `feat/bio-ingest-lot02-purge-code`, partie de `origin/main` à `9ccd17fb` (#1286).
- Un commit de lot, clôture comprise. **PR à ouvrir.**

## Objectif

PR 2 de [[D-258]] : mettre en œuvre la purge du compte rendu déposé, que la
migration `bio_ingest_purge_compte_rendu_v1` (PR 1) rend possible. Aucune
migration dans cette PR.

## Constat préalable (conteneur, lecture seule, 2026-10-02)

- `release-db` du commit `9ccd17fb` vert (run 37057825468).
- Migration appliquée en une tentative.
- Colonnes présentes : `purge_le`, `motif_purge`, `heure_lue` (NOT NULL, `false`).
- Trigger `comptes_rendus_biologiques_avant_purge` présent, `no_update` absent.
- RLS active sur les trois tables du staging.
- 0 compte rendu en base.
- Déploiement en service : `9ccd17fb`, la tête de `main`.

## Décisions prises

- **Purge `lignes_decidees` dans `deciderLignes`**, dans la même transaction
  et sous le même verrou. Elle n'est tentée qu'une fois établi, sous le
  verrou, qu'il ne reste aucune ligne proposée ni aucune extraction en cours.
  Elle passe par `updateMany` avec `contenu: { not: null }`. La réponse porte
  `documentPurge`.
- **L'échéance** :
  - le code : `import/purge.ts` et `scripts/purgeComptesRendusEcheance.ts`,
    lancés par `npm run bio:purge-echeance` ;
  - le cron : `web/cron.json`, **chaque heure**, taille M. Horaire plutôt que
    nocturne (revue `wn-reviewer`) : la v12 promet « au plus tard 30 jours » ;
  - une transaction par compte rendu ;
  - les imports périmés sont d'abord clos `delai_depasse` (P1) ;
  - les candidats sont choisis à l'horloge de la base ;
  - le journal ne porte que des compteurs.
- **Exécution par `prisma/runWithAlias.js` (jiti)**, le patron déjà en place.
  Sondé dans un conteneur de production : charge `@/lib/prisma` en 0,5 s, pour
  167 Mo.
- **Relance sur un document purgé** : 409 `document_purge`, vérifié sous le
  verrou.
- **`heure_lue`** :
  - écrite par l'extraction (`heureLisible`), jamais vraie sans date ;
  - à la validation, l'heure est exigée si `!heureLue` ;
  - l'écran affiche « 00:00 » quand l'heure a été lue.
- **Liste des comptes rendus** : elle montre l'extraction courante, sinon le
  dernier échec, qui reste visible.
- **Écran** : il dit le document effacé et ne propose plus de relecture. Les
  lignes restent décidables.
- **Garde** : `staging.guard.test.ts` nomme les seuls auteurs d'une
  modification de compte rendu, `decisions.ts` et `purge.ts`.

## Fichiers modifiés

- **Bibliothèque `web/src/lib/biology-library/import/`** :
  - `decisions.ts`, `extraction.ts`, `lancerExtraction.ts`, `lecture.ts`, `retrait.ts` (commentaire) ;
  - `purge.ts`, nouveau ;
  - les tests de chacun, dont `purge.test.ts`, nouveau.
- **Échéance** : `web/scripts/purgeComptesRendusEcheance.ts`, `web/cron.json`, `web/package.json`.
- **Route et écran** :
  - `web/src/app/api/praticien/biologie/import/extraction/route.ts`, avec son test ;
  - `web/src/components/patient-cockpit/ImportCompteRenduPanel.tsx`, avec son test.
- **Garde** : `web/src/lib/biology-library/staging.guard.test.ts`.
- **Documentation** :
  - `docs/DOSSIER_RGPD.md`, rubrique 8, état ;
  - la fiche LOT-02 ;
  - `changelog.d/2026-10-02-bio-ingest-lot02-purge-code.md`.

## Validations exécutées

- Tests ciblés verts : 314.
- T1 complet vert.
- T2 vert : 225 E2E, avant les correctifs de revue, qui ne touchent que la
  liste, des commentaires, `cron.json` et des tests. Ces correctifs ont été
  rejoués en tests ciblés puis en T1 complet.
- Épreuve d'intégration locale, sur base de dev migrée, triggers réels :
  11 assertions vertes. Elle a été **jouée à la main, non versionnée**, et
  couvre :
  - le CHECK `heure_lue` ;
  - la purge à la dernière décision ;
  - `document_purge` ;
  - l'échéance antidatée, import abandonné clos compris ;
  - un second passage à vide.
- `npm run bio:purge-echeance` en local : sortie propre, code 0.
- `wn-reviewer` : **GO**, aucun P0 ni P1. Le passage horaire, l'échec visible
  dans la liste, l'indentation et les tests manquants sont corrigés ; les autres
  P2 sont routés (voir plus bas).

## Problèmes ouverts

- **Le premier passage du cron en production verra 0 candidat.** Il prouve le
  démarrage du conteneur et la connexion, pas la requête des imports périmés.
  Seule l'épreuve locale prouve cette requête.
- **Dépendances de `runWithAlias.js`** : `jiti` est transitif, `dotenv` est en
  devDependency. Les deux sont présents dans l'image au 2026-10-02, mais rien
  ne le garantit.
- **Fuseau du cron Scalingo** : non vérifié. Sans effet sur la règle, que juge
  l'horloge de la base.
- **Rétention des sauvegardes Scalingo** : à établir avant toute déclaration.
- **Base locale jetable `wellneuro_purge_contrat`** : son DROP attend l'accord
  de l'utilisateur.

## Prochaine action exacte

1. Commit, puis PR (`--body-file`).
2. `wn-attendre-ci` en tâche de fond, jusqu'au code 0 ; comparer `head=`.
3. Lire la revue (corps et commentaires en ligne), trancher chaque
   commentaire, puis merger.
4. Constater le déploiement par contenance.
5. Constater le **premier passage du cron** : `scalingo logs`, ligne
   `[bio-ingest purge échéance]`, code de sortie 0.
6. Ensuite, le point 3 de la fiche : relecture et signature du resolver
   (D-xxx).

## Interdits encore actifs

- Drapeau `WN_BIO_INGEST_ENABLED` éteint. Avant la pose, il faut :
  - le premier passage du cron constaté ;
  - le resolver signé ;
  - la v12 servie.
- Jamais `prisma format`.
- `release-db` reste humain.
- Aucune écriture dans `resultats_biologiques` sans geste du praticien.
- Aucune conversion d'unité, aucune qualification de valeur.
- Fixtures seulement ; aucun seed ni E2E sur un dossier réel.
- Aucun chiffre sur les sauvegardes sans vérification.
- Ne pas sonder le CI.
