# Handoff — levée du blocage par signal d'alerte, LOT-02 (migration seule)

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, PR **#1288** (brouillon jusqu'à la clôture),
  base `main`. Tête `860b6d7` + ce handoff. Arbre propre.
- CI verte sur `860b6d7` : `controles` (51 contrats SQL, dont le nouveau),
  `e2e`, `verify`. Mergeable `clean` au dernier relevé.
- Déjà fusionnés dans la même session : #1282 (cadrage), #1285 (`D-257`).

## Objectif

Sortir de l'impasse les dossiers bloqués par un signal d'alerte de rang
`adressage` (`D-099`) : la lettre d'adressage consignée lève le blocage, signal
par signal (`D-257`). Ce lot pose la **table de couverture**, sans aucun code
consommateur (`D-087`).

## Décisions prises

- Arbitrages A1-A12 du responsable (2026-10-02), consignés au cadrage
  `docs/claude/campagnes/CADRAGE_LEVEE_SIGNAL_ALERTE_2026-10-02.md` et dans
  `D-257` ; texte patient de l'action d'orientation signé (version sobre, sans
  repère d'urgence).
- Table `adressages_signal_alerte`, en ajout seul, actes `adressage` /
  `revocation` ; table dédiée (A8), révocation tracée avec motif (A12).
- **Après revue `wn-reviewer` (P1-1)** : la lettre doit être consignée dans la
  MÊME transaction que sa couverture (`xmin` comparé à `txid_current()`, sans
  horodatage), et la consultation doit être LA porteuse au moment de
  l'insertion (règle de `consultationPorteuse.ts` rejouée en SQL). Une lettre
  ancienne ou antérieure à la table ne lève rien (A6, A9).
- Horodatage de migration décalé à `20261002230000` : la migration BIO-INGEST
  du même jour occupait `20261002200000`.
- Une lettre dont la couverture est révoquée ne couvre plus jamais (re-consigner).

## Fichiers modifiés (PR #1288)

- `web/prisma/migrations/20261002230000_adressages_signal_alerte_v1/migration.sql`
- `web/prisma/schema.prisma` (modèle `AdressageSignalAlerte` + relations)
- `web/prisma/checks/adressages_signal_alerte_v1_negatif.sql`, `.github/workflows/ci.yml`
- `web/src/lib/patient/effacement.ts` + `.test.ts` ;
  `web/src/lib/correspondance/adressagesSignalAlerte.guard.test.ts`
- `docs/DOSSIER_RGPD.md` (rubrique 5) ; `changelog.d/2026-10-02-adressages-signal-alerte-migration.md`
- Cadrage §7 (consignes LOT-03/LOT-04 issues de la revue).

## Validations exécutées

- `prisma validate` ; `prisma migrate diff` → *No difference detected* (code 0).
- Contrat : 17 promesses tenues (PostgreSQL 16 local, fuseau Europe/Paris) ;
  **45 mutants sur 45 tués** (script de mutation hors dépôt, scratchpad).
- 51 contrats SQL du CI joués localement contre la base migrée : 0 échec.
- `npm run check` (T1 complet) vert ; Vitest effacement 16/16, rubrique 5 4/4,
  garde 4/4.
- **T3 local incomplet** : segment E2E impossible dans le conteneur cloud
  (navigateurs Playwright bloqués, WebKit absent). Le job `e2e` du CI est vert.

## Problèmes ouverts

- Aucune mesure de production postérieure au 2026-08-23 (6 dossiers sur 25) :
  dossiers bloqués et lettres déjà consignées à relire par conteneur détaché,
  en agrégats, avant la pose du drapeau du LOT-04.
- Fuseau de session en production non constaté (n'affecte plus ce lot : aucune
  comparaison d'horodatage ; à garder en tête pour la suite).

## Prochaine action exacte

1. Responsable : choisir le créneau, fusionner #1288, **approuver `release-db`
   dans la foulée** (panne sur la table entre merge et approbation).
2. Constater par conteneur : `scalingo --app wellneuro run -d "npx prisma migrate status"`
   → *up to date*, puis première ligne de `scalingo --app wellneuro deployments`
   = tête de `main`.
3. Seulement ensuite : LOT-03 (écrivain : lettre + couverture dans une seule
   `$transaction` ; révocation) selon le §7 du cadrage.

## Interdits encore actifs

- Aucun code n'écrit ni ne lit `adressages_signal_alerte` avant l'application
  **constatée** de la migration (`D-087`).
- La garde « qui écrit » exige aujourd'hui zéro écrivain : le LOT-03 la met à
  jour en nommant son unique écrivain, et l'étend aux scripts et aux E2E.
- Pas de modification de la cotation signée des douze signaux (`D-099`).
- Pas de pose du drapeau du LOT-04 sans mesure de production préalable.
- Aucune identité réelle dans le dépôt ; dossiers réels lus par identifiant
  seulement, depuis un conteneur.
