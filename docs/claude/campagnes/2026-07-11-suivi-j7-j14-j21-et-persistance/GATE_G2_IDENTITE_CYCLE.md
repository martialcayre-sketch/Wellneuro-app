# Gate G2 — identité de cycle des épisodes (dette de modèle C2B LOT-09)

> Préparé le 2026-07-19, **appliqué le 2026-07-20** (branche
> `feat/vague2-gate-g2-identite-cycle`), dans une session lancée avec
> `WN_ALLOW_PROTECTED_WRITE=1` (hook `.claude/hooks/protect-wellneuro-files.mjs`,
> qui protège `prisma/schema.prisma` et `prisma/migrations/`).
>
> **Écart assumé vs le plan ci-dessous** : la résolution du cycle est une
> fonction PURE `resolveCycleId` dans `lib/protocol/versioning.ts` (les routes
> lui passent les T0 déjà persistés du patient), plutôt qu'une requête écrite
> deux fois. Une raison `version_inconnue` distincte de `versions_differentes` a
> été ajoutée pour que l'UI puisse dire *pourquoi* elle ne compare pas.
>
> Vérification exécutée : `npm --prefix web run test:worktree -- --fast` —
> migration appliquée sur PostgreSQL éphémère, **aucune dérive schéma ↔
> migrations**, 674 tests unitaires et 41 E2E verts.

## Pourquoi

`assessment_episodes` stocke **une ligne par jalon**, sans clé de cycle : les
épisodes J21/J42/J90 ne sont rattachés à aucun T0. Et le `versionScore` est
recalculé au vol depuis la constante courante
(`api/praticien/trajectoire/route.ts`), ce qui rend la garde **A8-3**
(« jamais de comparaison hors version identique ») **structurellement
indéclenchable** : `versions.size > 1` ne peut jamais être vrai en production.

Dette consignée par `lots/LOT-09-comparateur-multi-episodes.md`.

## Ce qui n'est PAS ajouté, et pourquoi

**`instrument_id`** — écarté après vérification. Le score « Mon équilibre » est
un **composite pondéré par strate** (CORPS 0,6 / ANCRAGE 0,2 / ESPRIT 0,2) sur
les 12 besoins (`lib/equilibre/constants.ts`), pas un instrument parmi d'autres.
La colonne n'aurait rien à contenir et donnerait l'illusion d'une garde.

Le vrai risque de comparabilité est ailleurs et **ne demande aucune migration** :
deux cycles peuvent reposer sur des **couvertures de questionnaires
différentes**, et comparer leurs composites induirait en erreur. Cela se calcule
à la lecture, dans un lot ultérieur.

## 1. `web/prisma/schema.prisma` — modèle `AssessmentEpisode`

```prisma
  contractVersion String   @map("contract_version") // objets-cliniques-v1
  // Identité de cycle (C2B / Vague 2, gate G2). Nullables : une ligne héritée
  // non rattachable reste NULL, jamais devinée.
  cycleId         String?  @map("cycle_id")
  versionScore    String?  @map("version_score") // figé à la mesure (A8-3)
  createdAt       DateTime @default(now()) @map("created_at")
```

et, dans le bloc d'index :

```prisma
  @@index([idPatient, cycleId], map: "c2b_episode_cycle_idx")
```

## 2. `web/prisma/migrations/20260719120000_c2b_cycle_identity_v1/migration.sql`

```sql
-- C2B / Vague 2 — identité de cycle des épisodes (gate G2).
-- Gate confirmé explicitement par l'utilisateur le 2026-07-19.
--
-- ADDITIVE UNIQUEMENT : deux colonnes nullables ajoutées, un index créé.
-- Aucun DROP, aucun renommage, aucune colonne existante modifiée, aucune
-- suppression de ligne. Rollback = ignorer les deux colonnes (le code retombe
-- sur « version inconnue » et sur le rattachement par date).

ALTER TABLE "assessment_episodes" ADD COLUMN "cycle_id" TEXT;
ALTER TABLE "assessment_episodes" ADD COLUMN "version_score" TEXT;

-- Backfill 1 — version de score figée à la mesure.
-- Justification factuelle : VERSION_SCORE_EQUILIBRE vaut 'v1' depuis son
-- introduction (aucun bump dans l'historique du dépôt) et la table
-- `assessment_episodes` lui est postérieure (migration c2a_persistance_v1,
-- 2026-07-17). Toutes les lignes existantes ont donc été confirmées sous v1.
UPDATE "assessment_episodes" SET "version_score" = 'v1' WHERE "version_score" IS NULL;

-- Backfill 2 — un épisode T0 ouvre son propre cycle.
UPDATE "assessment_episodes" SET "cycle_id" = "id" WHERE "milestone" = 'T0' AND "cycle_id" IS NULL;

-- Backfill 3 — un jalon postérieur rejoint le dernier T0 du MÊME patient,
-- antérieur ou égal à sa propre confirmation. Une ligne sans T0 antérieur reste
-- NULL : elle n'est jamais rattachée de force au premier cycle venu.
UPDATE "assessment_episodes" AS e
SET "cycle_id" = (
  SELECT t0."id"
  FROM "assessment_episodes" AS t0
  WHERE t0."id_patient" = e."id_patient"
    AND t0."milestone" = 'T0'
    AND t0."confirmed_at" <= e."confirmed_at"
  ORDER BY t0."confirmed_at" DESC
  LIMIT 1
)
WHERE e."milestone" <> 'T0' AND e."cycle_id" IS NULL;

CREATE INDEX "c2b_episode_cycle_idx" ON "assessment_episodes"("id_patient", "cycle_id");
```

## 3. Code applicatif (hors chemin protégé)

- **Écriture** — `lib/protocol/versioning.ts`, `toEpisodeCreateInput` : accepter
  un `cycleId` résolu par l'appelant et estampiller
  `versionScore: VERSION_SCORE_EQUILIBRE` à la confirmation. Les deux routes
  appelantes (`api/praticien/protocoles/route.ts`,
  `api/praticien/protocoles/versions/route.ts`) résolvent le cycle **avant** la
  transaction : `T0` → son propre id ; sinon dernier `T0` du patient à
  `confirmedAt <=` celui du nouvel épisode ; sinon `null`.
- **Lecture** — `api/praticien/trajectoire/route.ts` : sélectionner `cycleId` et
  `versionScore`, cesser de passer la constante uniforme à
  `construireTrajectoire`.
- **Domaine** — `lib/protocol/trajectoire.ts` :
  - `TrajectoireCycle.versionScore` devient `string | null` ;
  - `resoudreComparaison` gagne une raison `'version_inconnue'` — une version
    nulle n'est **jamais** assimilée à la version courante, sinon la garde A8-3
    redevient indéclenchable ;
  - les entrées d'`index` portent le `cycleId` stocké quand il existe ;
    `rattacherReperesAuxCycles` (livré en #149) reste le **repli** par date pour
    les lignes sans `cycleId`.
- **Présentation** — `TrajectoirePanel.tsx` : « version de score : inconnue »
  quand elle est nulle, et bloc « non comparable » correspondant.

## 4. Vérification

```bash
npm --prefix web run test:worktree -- --fast
```

Le harnais applique la migration sur un PostgreSQL **éphémère** et vérifie
l'absence de dérive schéma ↔ migrations. Aucune base réelle n'est touchée.

## 5. Ce que le merge déclenche

`web/scripts/vercel-build.sh` exécute `prisma migrate deploy` sur la base
**Supabase de production** au build Vercel de `main` (scope production
uniquement, jamais en preview). Merger la PR applique donc la migration en
production — c'est l'intention du gate, mais cela doit être conscient.

## Les trois autres gates de la Vague 2

| Gate | Objet | Campagne | Nature |
|---|---|---|---|
| **G1** | Refus persisté des cartes du Fil (garde-fou 5.0 « refusable » non tenu) | SP-FIL | table additive |
| **G3** | `relecture_notes` — note horodatée au présent, append-only | SP-TT / LOT-02 | table additive |
| **G4** | Identité patient durable (lien magique à usage unique) | IDP / LOT-01 | table additive **+ revue de sécurité + gate TRUST** |

G1 et G3 sont réversibles par simple abandon de la table. **G4 ne l'est pas au
même titre** : il touche l'authentification patient, exige une revue de sécurité
avant merge, et son activation avec données réelles reste **NO-GO** tant que les
gates TRUST ne sont pas levés.
