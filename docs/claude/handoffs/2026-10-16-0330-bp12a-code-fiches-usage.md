# Handoff — BP-12a, code consommateur des fiches d'usage (D-314, PR 2)

## Branche et état Git

- Branche `feat/bp12a-code-fiches-usage`, worktree
  `.claude/worktrees/bio-ingest-cloture`, contient `origin/main` 28049522
  (#1492) ; poussée, **aucune PR ouverte** (la migration n'est pas appliquée).
- Commits du lot : ac9c05b6 (socle), 001d4d01 (dépôt), 4e60934a (décision,
  lecture, routes praticien), 0ce2a6c5 (écran), 6e847ec1 (outil, TRUST,
  RGPD, matrice, changelog), plus ce handoff et les suites de la revue.
- **PR 1, migration seule : #1488**, tête 344f5d1a, CI vert, CodeRabbit sans
  remarque sur la tête, Codex ACCEPTER. **Non mergée** : elle attendait la
  release-db de CC-8, constatée le 2026-10-16 à 01 h 44.

## Objectif

Livrer le code consommateur de LOT-12 (BP-12a) : structure signée (vide),
dépôt des brouillons sous secret, décision rubrique par rubrique et libellé
par libellé, écran praticien, outil hors ligne de rédaction, TRUST et RGPD.

## Décisions prises

- Structure livrée **vide, verrou éteint** (porte 23) ; les champs du cadrage
  qui exigent une liste fermée (question, besoins, nature, usage décisionnel,
  statut d'usage, statut réglementaire, renvois précautions) restent hors du
  type jusqu'à arbitrage (en-tête de `ficheUsageBesoin2V1.ts`).
- Validation par **toute session praticien** (patron D-251), à confirmer.
- Écran : rayon « Fiches d'usage » de la Bibliothèque, à côté de « Fiches
  conseils » (placement non fixé par D-314, à confirmer).
- Outil : **tout ou rien par fiche** — exclure une rubrique rendrait la
  version « non conforme » à jamais (arbitrage 5 + rubriques exactes).
- Contrat SQL de fraîcheur : rien à ajouter tant que la structure n'épingle
  aucun claim ; le balayage TS couvre déjà `fiches-usage/`. `exige_prescriptif`
  (D-046) à arbitrer avec les premiers claims.

## Fichiers modifiés

- `web/src/lib/fiches-usage/` (vocabulaire, structure, état, contrat,
  contrôle, empreintes, ingestion, décision, lecture, voies HTTP) et leurs
  bancs ; gardes `ecritures.guard.test.ts`.
- Routes : `web/src/app/api/internal/fiches-usage/{ingest,libelles/ingest}`,
  `web/src/app/api/praticien/fiches-usage/{,version,actes,libelles/actes}`,
  garde `confirmations.guard.test.ts`.
- Écran : `web/src/components/fiches-usage/*`, `BibliothequePanel.tsx`.
- Gardes étendues : `verrousSignatureDocumentes`, `claimsEpinglesFraicheur`,
  `fiches-assiette/journaux`, hook `protect-wellneuro-files` (+ bancs).
- Outil : `tools/corpus/fiches-usage/`, `scripts/run-certify-bancs.sh`.
- Docs : `docs/TRUST_IA_FICHES_USAGE.md` (projet), `docs/DOSSIER_RGPD.md`
  (rubrique 6), `docs/FEATURE_FLAGS.md`, matrice de consommation (script et
  Markdown), fiche LOT-12 (statut), `changelog.d/2026-10-16-bp12a-code-fiches-usage.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert sur 6e847ec1.
- T2 (`npm run test:worktree -- --fast`) vert sur l'écran (0ce2a6c5 + garde
  des corps) : 760 fichiers Vitest, 12 978 tests, 271 E2E Chromium + WebKit.
- Bancs de l'outil (`scripts/run-certify-bancs.sh`) : 113/113 ; essais à
  blanc de `rediger.mjs` (structure vide : « rien à rédiger ») et de
  `deposer.mjs --validate` (terme synthétique : bloqué hors structure).
- Revue `wn-reviewer` (lecture seule, sur les cinq commits du lot) : **go,
  aucun P0 ni P1**. P2 corrigés : le retrait ne rejoue plus le contrat
  (coupe-circuit intact si le contrat se resserre, banc ajouté) ; `--terme`
  non déclaré refusé avant tout appel de modèle ; message du contrat gardé
  dans les rapports de l'outil ; commentaire de `GesteTexte` rectifié.

## Problèmes ouverts

- **Release-db de #1488** : merge puis approbation humaine, sentinelle,
  constat par conteneur — avant toute PR du code.
- Arbitrages à rendre (liste au matin du 2026-10-16) : listes fermées des
  champs de structure ; `exige_prescriptif` des claims des fiches d'usage ;
  qui valide (tout praticien ou le responsable) ; placement de l'écran ;
  validation du document TRUST et relecture des deux consignes.
- P2 de la revue routés, non corrigés :
  - aucun **libellé de référence** par terme (deux libellés validés d'un même
    terme s'affichent tous deux « Validé ») — règle à fixer avant BP-11 ;
  - une rubrique garde « Validé » dans une version « À relire » ou « Hors
    structure » (le badge de version compense) ; une signature retirée sans
    changement d'empreinte laisse les versions « Validée » ;
  - « Valider » offert sur une version ancienne déjà dépassée (refus 409) ;
  - retrait offert pour une rubrique hors structure, pas pour un libellé ;
  - pas de banc Postgres réel de l'égalité d'empreinte JS ↔ SQL après
    aller-retour JSONB (accents, emoji, `\r\n`), ni de banc de concurrence
    réel — à poser avant les premiers dépôts.
- Bases locales de brouillon `wellneuro_bp12a_essai{1,2,3}` laissées en
  place : à supprimer sur accord.

## Prochaine action exacte

Merger #1488 (`--match-head-commit 344f5d1a`), faire approuver sa release-db,
attendre la sentinelle `WN_RELEASE_DB_OK`, constater
`20261016090000_fiches_usage_v1` par conteneur ; puis ouvrir la PR du code
depuis cette branche (`--body-file`), attendre CI et CodeRabbit.

## Interdits encore actifs

- Aucun texte de fiche, libellé, population en clair ni contenu de claim au
  dépôt (D-251 §4) ; aucune valeur clinique dans la structure (arbitrage 8).
- Ne pas signer la structure ni valider un texte à la place du responsable
  (porte 23) ; aucune écriture en production hors release-db approuvée.
- Pas d'auto-merge sur une PR de lot ; un merge à la fois (D-248).
- Pas de `prisma format`.
