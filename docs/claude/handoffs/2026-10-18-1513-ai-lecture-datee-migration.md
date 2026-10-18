# Handoff — ai, migration du jour de première lecture (D-297 §6)

## Branche et état Git

`feat/ai-lecture-datee-migration` (worktree `cc8-migration`), à jour de `origin/main`. PR de migration seule, ouverte par cette session.

## Objectif

Livrer le schéma de la lettre ai : le jour (heure de Paris) de la première ouverture d'un document remis, vu du praticien, sans aucune heure (D-297). Le code qui l'écrit et la phrase « Votre lecture est datée » forment la seconde PR, après la release-db constatée.

## Décisions prises

- Migration permise par le responsable (2026-10-18), avec deux triggers (recommandation de revue retenue).
- Colonne `lu_le` DATE, nullable, **sans défaut** (§4) ; aucun rattrapage (§3).
- Trigger d'insertion : toute date fournie est remplacée par `(clock_timestamp() AT TIME ZONE 'Europe/Paris')::date`. Le code choisit s'il date, jamais quelle date.
- Trigger de mise à jour : tout changement de `lu_le` est refusé (pose après coup, correction, effacement), et une lecture ne change pas de document (`espece`, `id_objet`), sur constat CodeRabbit de #1547 et arbitrage du responsable. `id_patient` reste modifiable : la clé étrangère est en ON UPDATE CASCADE.
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
- Seconde mutation : un trigger qui lit `CURRENT_DATE` (fuseau de la session) est attrapé par la passe sous fuseaux extrêmes (UTC+14, UTC-12).
- Tests de la route : 56 verts. T1 complet vert ; T3 complet vert (6 min 18 s, E2E compris).
- `wn-reviewer` (P0) : go, aucun P0 ni P1. P2 repris : passe sous fuseaux extrêmes, mise en garde sur une recopie de la table dans le commentaire de retour arrière. Reste la passe Codex manuelle du responsable (P0).

## Problèmes ouverts

- PR 2 : l'affichage praticien de D-297 doit amender explicitement `portailLecturesPatient.guard.test.ts` (qui interdit la table sous `app/api/praticien` et `components/patient-cockpit`), en citant D-297 ; écrire par `ON CONFLICT DO NOTHING` ou `create` + P2002, jamais `DO UPDATE` (refusé par le trigger).

- Release-db de `main` en attente pour le lot F80 de l'autre session : une release à la fois ; constater la sienne avant d'approuver celle-ci.
- Écarts routés sans correctif : garde d'âge absente du POST check-in et du compagnon (D-284) ; fenêtre de la ligne de suivi fermée environ 24 h entre deux points.

## Prochaine action exacte

CI vert et revue CodeRabbit sur la tête → merge → déploiement du code seul constaté → approbation de la release-db sur la tête de `main` → sentinelle `WN_RELEASE_DB_OK id=<run>` → `scalingo --app wellneuro run -d "npx prisma migrate status"` → seconde PR (INSERT `ON CONFLICT DO NOTHING` avec jour demandé, phrase de D-297 §4 sur chaque page remise et dans « Mes échanges », « Lu le JJ/MM/AAAA » / « Lu, date non enregistrée » côté praticien, garde `portailLecturesPatient.guard.test.ts` amendée).

## Interdits encore actifs

- Aucun code qui écrit `lu_le` avant la migration constatée en production, et jamais sans la phrase servie sur la même page (§4).
- Aucun rattrapage des lectures antérieures.
- `WN_PORTAIL_MES_ECHANGES` reste éteint avant ai livrée et ACT-2 constaté.
- Aucune règle clinique ni seuil touchés ; fixtures neutres seulement ; production lue par conteneur seulement.
