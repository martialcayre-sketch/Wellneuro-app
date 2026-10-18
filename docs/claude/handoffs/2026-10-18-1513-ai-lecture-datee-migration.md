# Handoff — ai, migration du jour de première lecture (D-297 §6)

## Branche et état Git

`feat/ai-lecture-datee-migration` (worktree `cc8-migration`), à jour de `origin/main`. PR de migration seule, ouverte par cette session.

## Objectif

Livrer le schéma de la lettre ai : le jour (heure de Paris) de la première ouverture d'un document remis, vu du praticien, sans aucune heure (D-297). Le code qui l'écrit et la phrase « Votre lecture est datée » forment la seconde PR, après la release-db constatée.

## Décisions prises

- Migration permise par le responsable (2026-10-18), avec deux triggers (recommandation de revue retenue).
- Colonne `lu_le` DATE, nullable, **sans défaut** (§4) ; aucun rattrapage (§3).
- Trigger d'insertion : toute date fournie est remplacée par `(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date`. Le code choisit s'il date, jamais quelle date.
- Trigger de mise à jour : tout changement de `lu_le` est refusé (pose après coup, correction, effacement) ; une mise à jour qui ne touche pas au jour passe.
- La route `POST /api/portail/lectures` lit `select: { idObjet: true }` : elle ne tombe pas entre le déploiement et la release-db.

## Fichiers modifiés

- `web/prisma/migrations/20261018120000_portail_lectures_lu_le_v1/migration.sql`
- `web/prisma/schema.prisma` (bloc `PortailLecturePatient` seul)
- `web/prisma/checks/portail_lectures_lu_le_v1_negatif.sql` (neuf), `portail_lectures_patient_v1_negatif.sql`, `portail_lectures_protocole_v1_negatif.sql` (commentaire)
- `.github/workflows/ci.yml` (étape du contrat neuf)
- `web/src/app/api/portail/lectures/route.ts` et son test
- `docs/DOSSIER_RGPD.md`, `docs/claude/PLAN_WELLNEURO.md` (H51), `changelog.d/2026-10-18-ai-lecture-datee-migration.md`

## Validations exécutées

- `prisma validate` vert.
- Migrations appliquées sur une base locale jetable ; les deux contrats verts ; contrat neuf rouge après retrait du trigger d'insertion (mutation), base supprimée ensuite.
- Tests de la route : 56 verts. T1 complet et T3 avant la PR (voir la PR).

## Problèmes ouverts

- Release-db de `main` en attente pour le lot F80 de l'autre session : une release à la fois ; constater la sienne avant d'approuver celle-ci.
- Écarts routés sans correctif : garde d'âge absente du POST check-in et du compagnon (D-284) ; fenêtre de la ligne de suivi fermée environ 24 h entre deux points.

## Prochaine action exacte

CI vert et revue CodeRabbit sur la tête → merge → déploiement du code seul constaté → approbation de la release-db sur la tête de `main` → sentinelle `WN_RELEASE_DB_OK id=<run>` → `scalingo --app wellneuro run -d "npx prisma migrate status"` → seconde PR (INSERT `ON CONFLICT DO NOTHING` avec jour demandé, phrase de D-297 §4 sur chaque page remise et dans « Mes échanges », « Lu le JJ/MM/AAAA » / « Lu, date non enregistrée » côté praticien, garde `portailLecturesPatient.guard.test.ts` amendée).

## Interdits encore actifs

- Aucun code qui écrit `lu_le` avant la migration constatée en production, et jamais sans la phrase servie sur la même page (§4).
- Aucun rattrapage des lectures antérieures.
- `WN_PORTAIL_MES_ECHANGES` reste éteint avant ai livrée et ACT-2 constaté.
- Aucune règle clinique ni seuil touchés ; fixtures neutres seulement ; production lue par conteneur seulement.
