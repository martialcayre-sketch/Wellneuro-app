# SPEC LOT-01 — Modèle de persistance C2A (document seul)

> Rédigée à la compilation (2026-07-16), **proposition à valider en LOT-01**
> après l'audit LOT-00. Ce document ne modifie ni `web/prisma/schema.prisma`
> ni `web/prisma/migrations/` : la migration relève exclusivement de LOT-02
> (`bloqué_confirmation`) et n'est autorisée qu'après la checklist de la
> section 6, cochée explicitement par l'utilisateur.

## 1. ADR — Nommage : registre 5.0

**Décision.** Les entités persistées reprennent les noms du registre 5.0 et
des contrats C1 réels (`web/src/lib/clinical-engine/types.ts`) :
`AssessmentEpisode`, `ProtocolDraft`, `ProtocolCheckin`, `RelectureNote`
(décision A6-1 du registre des frontières).

**Alternative écartée.** `CarePlan`/`CarePlanPhase`/`CareAction` (brouillon
initial du cadrage) : introduirait une couche de renommage entre le code C1
livré et la base, sans bénéfice fonctionnel ; le contrat `ProtocolDraft`
porte déjà phases et actions dans son payload versionné.

**Conséquences.** Tables snake_case alignées : `assessment_episodes`,
`protocol_drafts`, `protocol_checkins`, `relecture_notes`. Les modèles Prisma
porteront `@@map` vers ces noms, comme les tables `trust_*`.

## 2. Principes (hérités de l'audit de cadrage et de trust_v1)

- **Additive-only** : aucune table existante modifiée, aucune colonne
  existante altérée. Rollback = suppression des seules nouvelles tables.
- **Append-only pour les événements** : une révision de protocole crée une
  nouvelle ligne (`supersedes_draft_id`), un check-in n'est jamais réécrit.
- **Payload canonique + colonnes indexées** : l'objet C1 complet est stocké
  en JSONB canonique avec son `input_hash` (déjà calculé par le moteur) ;
  seules les colonnes nécessaires aux requêtes sont extraites et indexées.
  Le snapshot clinique n'est **pas** persisté en V1 (recalculable depuis les
  réponses ; à réexaminer en LOT-01 — alternative « stocker »).
- **Minimisation** : aucun champ narratif libre côté patient au-delà des
  réponses de check-in ; aucune biologie ; aucune donnée hors périmètre C2A.
- **Conventions du dépôt** (pattern `20260716120000_trust_v1`) : `id TEXT`
  PK, `id_patient TEXT` FK → `patients(id_patient)` `ON DELETE RESTRICT ON
  UPDATE CASCADE`, `TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`, RLS activée
  deny-all sans policy (l'app accède via Prisma en connexion directe qui
  contourne RLS ; défense en profondeur contre l'accès direct).

## 3. Schéma cible (document seul — aucun DDL exécuté)

### `assessment_episodes`

Persiste les épisodes **confirmés** par le praticien (les propositions
restent en mémoire).

| Colonne | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `assessmentEpisodeId` du contrat |
| `id_patient` | TEXT FK | → `patients(id_patient)` |
| `milestone` | TEXT | jalon T0/J21/J42/J90 (référence `momentum.ts`, jamais réimplémenté) |
| `target_at` | TIMESTAMP(3) | |
| `confirmed_at` | TIMESTAMP(3) | |
| `payload` | JSONB | épisode confirmé canonique (fenêtre, réponses incluses/exclues) |
| `input_hash` | TEXT | hash canonique du moteur |
| `contract_version` | TEXT | ex. `c1-clinical-snapshot-v1` de rattachement |
| `created_at` | TIMESTAMP(3) | DEFAULT CURRENT_TIMESTAMP |

Index : `(id_patient, milestone)`, `(id_patient, confirmed_at)`.

### `protocol_drafts`

Versions **append-only** du protocole 21 jours (brouillon → relu → validé
pour diffusion → envoyé ; les statuts de diffusion arrivent en LOT-03).

| Colonne | Type | Notes |
|---|---|---|
| `id` | TEXT PK | une ligne par version |
| `id_patient` | TEXT FK | → `patients(id_patient)` |
| `assessment_episode_id` | TEXT FK NULL | → `assessment_episodes(id)` |
| `decision_card_id` | TEXT | référence contrat C1 |
| `decision_card_input_hash` | TEXT | clé de cohérence (contrat C1) |
| `selected_priority_id` | TEXT | |
| `status` | TEXT | `draft` / `practitioner_reviewed` (+ diffusion en LOT-03) |
| `payload` | JSONB | `ProtocolDraft` canonique complet (purpose, critère J21, actions, charge, review) |
| `input_hash` | TEXT | |
| `contract_version` | TEXT | `c1-protocol-draft-v1` |
| `supersedes_draft_id` | TEXT NULL | chaînage des révisions (pattern `trust_choice_events`) |
| `reviewed_at` | TIMESTAMP(3) NULL | |
| `created_at` / `updated_at` | TIMESTAMP(3) | |

Index : `(id_patient, created_at)`, `(decision_card_id)`,
`(supersedes_draft_id)`.

### `protocol_checkins`

Check-ins patient J7/J14/J21 — instrument de **pilotage**, jamais un score,
jamais un jalon de mesure (arbitrage A1).

| Colonne | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `id_patient` | TEXT FK | → `patients(id_patient)` |
| `protocol_draft_id` | TEXT FK | → `protocol_drafts(id)` (version active au moment du check-in) |
| `point_etape` | TEXT | `J7` / `J14` / `J21` |
| `reponses` | JSONB | 2 à 4 réponses courtes : tolérance, ressenti, adhésion (libellés français) |
| `canal` | TEXT | DEFAULT `'portail'` |
| `soumis_le` | TIMESTAMP(3) | DEFAULT CURRENT_TIMESTAMP |

Index : `(id_patient, point_etape)`, `(protocol_draft_id)`.
Unicité : `(protocol_draft_id, point_etape)` — un check-in par point d'étape
et par version de protocole (à confronter à l'audit LOT-00).

### `relecture_notes` (décision A6-1)

Note de relecture time-travel : toujours horodatée **au présent**,
visuellement séparée, le snapshot historique reste immuable. C2A ne fait que
**modéliser et créer** la table ; l'interface relève de SP-TT.

| Colonne | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `id_patient` | TEXT FK | → `patients(id_patient)` |
| `cible_type` | TEXT | ex. `assessment_episode` / `protocol_draft` |
| `cible_id` | TEXT | id de l'objet relu |
| `cible_hash` | TEXT | hash de la version relue (immuabilité vérifiable) |
| `texte` | TEXT | note praticien (français) |
| `acteur_role` | TEXT | DEFAULT `'practitioner'` |
| `created_at` | TIMESTAMP(3) | DEFAULT CURRENT_TIMESTAMP — jamais antidaté |

Index : `(id_patient, cible_type, cible_id)`.
**Option consignée au gate** : si la confirmation préfère une première
migration plus étroite, la création de `relecture_notes` peut être différée
à SP-TT sans impact sur les trois autres tables.

## 4. Droits d'accès (matrice à confirmer en LOT-00)

| Table | Praticien (NextAuth) | Patient (session portail + assignation) |
|---|---|---|
| `assessment_episodes` | create/read | — |
| `protocol_drafts` | create/read | read (uniquement la vue patient approuvée pour diffusion, contrat `PatientProtocolView`) |
| `protocol_checkins` | read | create/read (ses propres check-ins, via assignation vérifiée) |
| `relecture_notes` | create/read | — |

Aucun update destructif : les corrections passent par de nouvelles lignes
(append-only). Aucune suppression en V1 (droits RGPD : voir flux TRUST
`trust_rights_requests`, hors périmètre C2A).

## 5. Stratégie de migration et rollback (document seul)

- **Une seule migration additive** (`c2a_persistance_v1`) créant les tables,
  index, FK et l'activation RLS — même structure que
  `20260716120000_trust_v1`.
- Créée et validée d'abord sur base éphémère (`npm run test:worktree` :
  `migrate deploy` + gate de dérive schéma↔migrations + seed fictif).
- Production : uniquement via le pipeline existant (`vercel-build.sh`,
  `migrate deploy` au merge sur `main`) — jamais à la main.
- **Rollback documenté** : `DROP TABLE` des seules nouvelles tables (aucune
  table existante touchée) ; l'application reste fonctionnelle sans elles
  tant que les routes LOT-02+ ne sont pas mergées (déploiement séquencé :
  migration d'abord, routes ensuite).

## 6. Checklist de confirmation du gate (avant tout LOT-02)

Le gate n'est levé que si **l'utilisateur** coche explicitement ces points
dans la conversation, par un message distinct (ni la compilation, ni
l'activation de campagne, ni un « ok » général ne valent confirmation) :

- [ ] La spec (sections 1 à 5) est validée, amendée le cas échéant par LOT-00/LOT-01.
- [ ] Le choix « `relecture_notes` incluse ou différée à SP-TT » est tranché.
- [ ] La migration est confirmée : **additive-only, une seule migration**, nom `c2a_persistance_v1`.
- [ ] L'environnement d'exécution est confirmé (base éphémère d'abord, production via pipeline Vercel au merge uniquement).
- [ ] Le rollback (section 5) est lu et accepté.

Tant que cette checklist n'est pas cochée : LOT-02 reste
`bloqué_confirmation`, `schema.prisma` et `web/prisma/migrations/` restent
intouchés.
