# Note technique — modèle multi-cycles &amp; mécanique de migration

> Enrichit `BRAINSTORM_GATE_MULTI_CYCLES.md` (2026-07-18). Ancre les options dans
> le code réel et la mécanique de migration du dépôt. **Documentaire — aucun code,
> aucun DDL, aucune migration.** Les tranchages restent pour
> `ARBITRAGES_GATE_MULTI_CYCLES.md`. Ne dé-risque pas : ne décide pas.

## 1. État réel du modèle

**Épisode** — `web/prisma/schema.prisma:657-677` (verbatim) :

```prisma
model AssessmentEpisode {
  id              String   @id @map("id")
  idPatient       String   @map("id_patient")
  milestone       String   @map("milestone") // T0 | J21 | J42 | J90 (réf. momentum.ts)
  targetAt        DateTime @map("target_at")
  confirmedAt     DateTime @map("confirmed_at")
  payload         Json     @map("payload")
  payloadHash     String   @map("payload_hash")
  contractVersion String   @map("contract_version") // objets-cliniques-v1
  createdAt       DateTime @default(now()) @map("created_at")

  patient        Patient         @relation(fields: [idPatient], references: [idPatient])
  protocolDrafts ProtocolDraft[]

  @@index([idPatient, milestone], map: "c2a_episode_patient_milestone_idx")
  @@index([idPatient, confirmedAt], map: "c2a_episode_patient_confirmed_idx")
  @@map("assessment_episodes")
}
```

Aucun champ ne relie deux épisodes d'un même parcours. Sur write
(`toEpisodeCreateInput`, `web/src/lib/protocol/versioning.ts:80-91`), on pose
`id, idPatient, milestone, targetAt, confirmedAt, payload, payloadHash,
contractVersion` — **jamais de clé de cycle, jamais `versionScore`**.

**Cycle déduit en mémoire** — `web/src/lib/protocol/trajectoire.ts:69-71` :

```ts
const cycles: TrajectoireCycle[] = episodesTriees
  .filter((e) => e.milestone === 'T0')
  .map((t0) => {
```

Le `cycleId` est l'`id` du T0 (ligne 97) ; il n'est ni persisté ni requêté.
`versionScore` provient d'une **constante globale** `VERSION_SCORE_EQUILIBRE = 'v1'`
(`web/src/lib/equilibre/constants.ts`, passée en dur par
`web/src/app/api/praticien/trajectoire/route.ts`).

## 2. Pourquoi « ≥ 2 cycles réels » casse aujourd'hui

Les jalons d'un cycle ne sont pas stockés reliés à leur T0 : chaque cycle re-dérive
J21/J42/J90 par **décalage de jours** depuis les réponses questionnaires
(`construireHistoriqueEquilibre` + `JOURS_JALON`). Avec **un seul T0**, l'ancre est
unique et la dérivation est déterministe. Avec **deux T0** (cycle 1 puis cycle 2),
une même réponse questionnaire peut tomber dans la fenêtre de deux ancres
différentes : rien dans le modèle ne dit à quel cycle elle appartient. La
comparaison côte à côte devient non déterministe — d'où le report.

## 3. Options de modèle comparées (technique, non décisionnel)

| Option | Changement schéma | Additive-only ? | Backfill | Pour | Contre |
|---|---|---|---|---|---|
| **(a)** colonne `cycleId` sur l'épisode | 1 colonne nullable + 1 index | Oui | Chaque T0 = son propre `cycleId` ; jalons rattachés par règle déterministe | Minimal, une seule table touchée | Sémantique du cycle éparse (portée par le T0), pas d'entité propre |
| **(b)** table `ProtocolCycle` | 1 table + FK sur l'épisode | Oui (FK nullable) | Un cycle par T0 historique | Entité claire, extensible (dates, statut) | Plus de surface ; jointures supplémentaires |
| **(c)** dérivation via `ProtocolDraft` | Aucune (réutilise l'existant) | Oui (zéro DDL) | Déjà relié à l'épisode | Pas de migration | `ProtocolDraft` groupe des *drafts sous un épisode*, pas des *épisodes en cycle* : détournement fragile |
| **(d)** `versionScore` par épisode | 1 colonne nullable | Oui | Backfill = constante actuelle `'v1'` | Fiabilise la garde A8-3 inter-cycles | Orthogonal au regroupement ; utile surtout combiné à (a)/(b) |

*Reco technique (indicative, non tranchée)* : (b) donne l'entité la plus propre si
le cycle doit porter des métadonnées ; (a) est le plus petit incrément si le seul
besoin est le rattachement ; (d) est complémentaire, à décider séparément ; (c) est
à écarter comme détournement. **Le choix reste à arbitrer.**

## 4. Implications migration

Régime imposé par le précédent C2A (gate levé en LOT-02/LOT-03) :

- **Additive-only** : uniquement des ajouts (colonne nullable / nouvelle table), pour
  que **les lignes existantes restent valides** sans rétro-remplissage obligatoire.
- **Une seule migration nommée** (ex. `c2b_multi_cycles_v1`).
- **Aucun DDL exécuté au titre de ce cadrage** : `schema.prisma` et
  `web/prisma/migrations/` restent intacts tant que le gate n'est pas levé par une
  confirmation humaine explicite et distincte.
- **Exécution** : base éphémère d'abord ; **production uniquement via le pipeline
  Vercel (`migrate deploy` au merge sur `main`)**, jamais à la main.
- **Rollback** documenté : `DROP` des seuls nouveaux objets (colonne/table/index).

## 5. Impact sur le code (esquisse, non à implémenter)

- `construireTrajectoire` (`web/src/lib/protocol/trajectoire.ts`) : la résolution de
  cycle passerait de `filter(e => e.milestone === 'T0')` à un regroupement **par la
  clé de cycle persistée** ; les jalons d'un cycle viendraient de leur rattachement
  stocké au lieu d'une re-dérivation par décalage.
- `web/src/app/api/praticien/trajectoire/route.ts` : `select` étendu à la clé de
  cycle (et à `versionScore` si option (d)).
- `TrajectoirePanel.tsx` : le rendu *read-only* actuel accueille déjà plusieurs
  cycles ; il consommerait des cycles réels au lieu de l'unique cycle in-memory.
- **Intouché** : le moteur `lib/equilibre` (score, jalons) — jamais réimplémenté.

## 6. Ce que la note dé-risque

- Confirme que le blocage est **structurel** (pas de clé de cycle), pas un manque de
  vue : la Spirale read-only est correcte, il lui manque des *cycles réels* à indexer.
- Montre que **toutes** les options envisageables sont **additives** → migration à
  faible risque, sous gate, sans réécriture destructive.
- Isole le sujet `versionScore`-par-épisode (d) comme **décision séparable**.
