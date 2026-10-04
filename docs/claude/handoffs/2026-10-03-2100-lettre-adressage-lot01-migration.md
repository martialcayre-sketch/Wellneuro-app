# Handoff — 2026-10-03 — Lettre d'adressage remise au patient : LOT-01, la table des remises

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, repartie de `origin/main` (`301ba72`, merge
  de #1298 — cadrage D-262). Un commit, PR de migration seule.

## Objectif

Créer la table `lettres_adressage_remises` ([[D-262]], cadrage §3.3) : ajout
seul, contrôles en base, effacement nommé. Aucun code consommateur ([[D-087]]).

## Décisions prises

- Phrase d'accompagnement **signée** le 2026-10-03 (cadrage §4, D-262).
- Le texte remis est recopié dans la remise (instantané + empreinte vérifiée
  par CHECK) ; la base exige que ce soit la lettre ACTIVE (couverture
  `adressage` non révoquée sur la consultation porteuse courante), sortante,
  ancrée `safety-signals-…`, sous une approbation du même dossier dont l'action
  0 est l'orientation réservée.
- Idempotence sur la remise en cours (RETURN NULL) ⇒ l'émetteur du LOT-02
  passera par `createMany`.
- Instant posé en UTC par la base (`clock_timestamp() AT TIME ZONE 'UTC'`).

## Fichiers modifiés

- `web/prisma/migrations/20261003210000_lettres_adressage_remises_v1/migration.sql`
- `web/prisma/schema.prisma` (modèle `LettreAdressageRemise` + 3 relations inverses)
- `web/prisma/checks/lettres_adressage_remises_v1_negatif.sql`, `.github/workflows/ci.yml`
- `web/src/lib/patient/effacement.ts` (+ test), garde
  `web/src/lib/correspondance/lettresAdressageRemises.guard.test.ts`
- Docs : D-262 (statut), cadrage §4, `DOSSIER_RGPD.md` rubrique 5, changelog.

## Validations exécutées

- Postgres 16 local : `migrate deploy` OK, `migrate diff` *No difference
  detected*, `prisma validate` OK.
- Contrat négatif : quatorze promesses tenues ; mutation 9/9 mutants tués.
- Vitest ciblé (patient, portail, fiches, gardes) vert ; `npm run check` vert.
- Revue `wn-reviewer` : **P1 corrigé** — la base n'admettait pas que la plus
  récente des lettres actives ; elle refuse désormais toute autre (refus
  distinct, cas « 8 active mais pas la plus récente », cas 9 réécrit avec
  révocation ; mutant tué). **P2 corrigés** : retour arrière par migration
  compensatrice ; limites du verrou, exception du refus 4 à isoler au LOT-02
  et idempotence par lettre écrites en tête de migration. **P2 routé** :
  export d'accès sans les remises, comme les fiches — à trancher au LOT-03.
- Contrat rejoué après correctif : quatorze promesses tenues ; parité OK.

## Problèmes ouverts

- Q1, Q2, Q3 de la campagne levée (handoff 19 h 45) toujours ouvertes.

## Prochaine action exacte

1. CI vert sur la tête, merge sur accord du responsable, créneau choisi.
2. Approbation `release-db` (geste humain), sentinelle liée au run, constat
   par conteneur `migrate status` ; première ligne de `deployments` = tête.
3. LOT-02 : émission dans la transaction de diffusion, drapeau neuf éteint.

## Interdits encore actifs

- Aucun code n'écrit ni ne lit la table avant l'application constatée.
- Aucune identité réelle dans le dépôt ; aucune écriture en production hors
  `release-db` approuvée.
