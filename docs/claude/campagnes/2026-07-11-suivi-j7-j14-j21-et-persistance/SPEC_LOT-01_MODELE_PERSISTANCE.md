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

---

## 7. Amendements issus de l'audit LOT-00 (2026-07-17)

> L'audit LOT-00 (`lots/LOT-00-audit-flux-persistance.md`, section Résultats) a
> confronté les sections 1 à 6 au code réel. La proposition reste **globalement
> valide** ; les points ci-dessous la corrigent là où elle contredit le code. Les
> sections d'origine ne sont pas réécrites (traçabilité proposition → audit). Les
> constats 2, 3 et 4 touchent la provenance/sécurité et **doivent être tranchés en
> LOT-01 avant la levée du gate**.

1. **`assessment_episodes.input_hash` — à corriger (§3).** Le
   `ConfirmedAssessmentEpisode` (`web/src/lib/clinical-engine/assessmentEpisode.ts`)
   n'a **pas** de hash propre : c'est une sélection de réponses. Le hash canonique
   naît sur le `ClinicalSnapshot` (`clinicalSnapshot.ts`). → Retirer `input_hash` de
   la table épisode, ou le remplacer explicitement par le `proposalHash` runtime
   (`runtimeFromPrisma.ts`) sous un nom non ambigu. Corriger aussi `contract_version` :
   l'épisode se rattache à `objets-cliniques-v1`, pas à `c1-clinical-snapshot-v1`.

2. **Provenance de hash pendante — à trancher (§3, §4).** La table `protocol_drafts`
   référence `decision_card_input_hash` alors que DecisionCard/Review/Snapshot ne
   sont pas persistés (choix « snapshot recalculable »). La chaîne d'intégrité
   (`snapshot → review → decision_card → protocol_draft`) devient invérifiable sans
   recalcul. → **Option A** : persister a minima l'`input_hash` de la DecisionCard
   (petite table de provenance). **Option B** : documenter que la vérification exige
   un recalcul depuis les réponses. À décider en LOT-01.

3. **Lecture patient de `protocol_drafts` — à corriger (§4).** La matrice accorde au
   patient `read` sur `protocol_drafts` « via `PatientProtocolView` », mais
   `PatientProtocolView` (`patientProtocolView.ts`, `c1-patient-protocol-view-v1`)
   est un **objet dérivé distinct** et aucune table `patient_protocol_views` n'existe
   dans la spec. → Le patient ne lit **jamais** `protocol_drafts`. Ajouter une vue
   patient (persistée à la diffusion, ou dérivée à la volée) et retirer la ligne
   patient de `protocol_drafts` dans la matrice §4.

4. **Autorisation des check-ins non modélisée — à corriger (§3, §4).** La session
   portail est scopée **par assignation** (`isSessionAuthorizedForAssignment`,
   `web/src/lib/patient-session.ts`), or `protocol_checkins` ne porte pas
   d'`id_assignation`. → Documenter le chemin d'autorisation d'écriture
   (`session.idPatient` → `protocol_checkins.id_patient`) et **exclure explicitement**
   le chemin legacy email-gate (email + idAssignation sans token) de toute écriture
   de check-in. Envisager une colonne `id_assignation` pour rattacher le check-in à
   l'assignation active.

5. **Unicité `(protocol_draft_id, point_etape)` vs append-only — à corriger (§3).**
   La contrainte d'unicité empêche toute correction patient d'un check-in, ce qui
   contredit le principe append-only (§2). → Préférer une correction = **nouvelle
   ligne chaînée** (colonne `supersedes_checkin_id`, pattern `trust_choice_events`)
   plutôt qu'une unicité stricte.

6. **PK = identifiant du contrat (§2, §3).** Plutôt que `id @default(cuid())`,
   utiliser l'`*Id` déjà porté par l'objet C1 (`assessmentEpisodeId`,
   `protocolDraftId`, …) comme clé primaire, pour préserver la provenance
   (hash-chain) et rendre les écritures **idempotentes**. Le pattern `trust_*` génère
   un cuid car ses événements n'ont pas d'id métier amont ; ici il en existe un.

7. **`relecture_notes` : report recommandé à SP-TT (§3, §6).** Aucun contrat
   `RelectureNote` n'existe dans le code (`web/src/lib/`). L'option §3/§6 « différer à
   SP-TT » est **retenue par l'audit** : première migration plus étroite (3 tables :
   épisodes, drafts, check-ins), sans impact sur les autres. La checklist §6 (case
   « `relecture_notes` incluse ou différée ») penche donc vers **différée**.

8. **Granularité praticien — hypothèse à consigner (§4).** L'audit confirme un modèle
   **mono-praticien** : tout praticien authentifié du domaine voit tous les patients
   (`getServerSession` + `if(!session)`, aucun filtre par identité). La matrice §4 est
   correcte à cette hypothèse près, qui doit être **explicitée** et non traitée comme
   un oubli.

**Conséquence sur le gate (§6).** La première case de la checklist (« spec validée,
amendée le cas échéant par LOT-00/LOT-01 ») ne pourra être cochée qu'après arbitrage
des constats 2, 3, 4 en LOT-01. La deuxième case (`relecture_notes` incluse/différée)
est éclairée par le constat 7 (recommandation : différée).

---

## 8. Décisions LOT-01 — arbitrage des constats (2026-07-17)

> Audit LOT-00 **validé par l'utilisateur** le 2026-07-17. Ce chapitre **tranche**
> les 8 constats et fige le schéma cible. Il **prime** sur les sections 3 et 4 en cas
> d'écart (celles-ci restent la trace de la proposition initiale). Toujours
> document-seul : `schema.prisma` et `web/prisma/migrations/` restent intouchés
> jusqu'à la levée du gate (§6).

### 8.0 Store vs recalculer les snapshots — **recalculer, ancré par hash**

Le `ClinicalSnapshot`, la `ClinicalReview` et la `DecisionCard` **ne sont pas
persistés** en V1. Ils sont recalculables depuis (a) l'`assessment_episodes.payload`
(sélection de réponses figée par le praticien) et (b) les `questionnaire_reponses`
déjà en base. La provenance est **ancrée** par les hashes de la chaîne, stockés en
colonnes sur `protocol_drafts` (voir 8.2). Vérifier = recalculer et comparer les
hashes ; une divergence **signale** que les réponses sous-jacentes ont changé depuis
(propriété recherchée, pas un défaut). La comparabilité inter-versions du moteur est
portée par les colonnes `contract_version`.

- **Alternative écartée** — persister le snapshot en JSONB : duplique une donnée
  dérivée des réponses (contre la minimisation §2) et fige une plateforme générique
  trop tôt (point de vigilance LOT-01). Non retenue.

### 8.1 Constat 1 — hash de l'épisode

`assessment_episodes` **ne porte pas** `input_hash` (le `ConfirmedAssessmentEpisode`
est une sélection, sans hash moteur propre). À la place :
- `payload` JSONB : `ConfirmedAssessmentEpisode` canonique.
- `payload_hash` TEXT : `canonicalSha256(payload)` calculé **à la persistance**
  (intégrité + idempotence de l'écriture), explicitement **pas** une preuve moteur.
- `contract_version` = `objets-cliniques-v1` (étiqueté à la persistance ; l'objet ne
  porte pas de champ version).

### 8.2 Constat 2 — provenance de hash → **Option A-lite (colonnes d'ancrage, sans tables dérivées)**

Pas de table `decision_cards`/`clinical_reviews`/`clinical_snapshots`. Les ancres de
provenance sont des **colonnes** sur `protocol_drafts` :
`snapshot_input_hash`, `review_input_hash`, `decision_card_id`,
`decision_card_input_hash`, plus l'`input_hash` **propre** du `ProtocolDraft` (celui-ci
en a un réel, `protocolDraft.ts`). Cela rend la chaîne
`épisode → snapshot → review → decision_card → draft` **vérifiable par recalcul** sans
persister d'objets dérivés. Cohérent avec 8.0.

### 8.3 Constat 3 — vue patient → **dérivée à la volée, pas de table**

Le patient **ne lit jamais** `protocol_drafts`. La `PatientProtocolView`
(`patientProtocolView.ts`, `c1-patient-protocol-view-v1`) est **dérivée côté serveur**
à la lecture, à partir du `protocol_draft` persisté, et seule cette vue est renvoyée.
Aucune table `patient_protocol_views` en V1. La lecture patient est conditionnée à
`status = practitioner_reviewed` (le gating de diffusion complet relève de LOT-03).
- **Alternative écartée** — persister une table `patient_protocol_views` : 4ᵉ table +
  synchronisation prématurée, contre la minimisation. Non retenue.

### 8.4 Constat 4 — autorisation des check-ins → **colonne `id_assignation`, email-gate exclu**

`protocol_checkins` porte `id_assignation TEXT` (FK → `assignations(id_assignation)`,
clé `@unique` confirmée au schéma). Écriture autorisée **uniquement** via cookie
portail authentifié dont `isSessionAuthorizedForAssignment` réussit pour cette
assignation **et** `session.idPatient === protocol_checkins.id_patient`. Le **chemin
legacy email-gate** (email + idAssignation sans token) est **explicitement interdit**
en écriture de check-in. Les règles R8-lite (deadline/verrou) gouvernent la
disponibilité de l'écriture.

### 8.5 Constat 5 — unicité vs append-only → **append-only chaîné**

Pas de contrainte d'unicité `(protocol_draft_id, point_etape)`. Une correction est une
**nouvelle ligne** avec `supersedes_checkin_id` (pattern `trust_choice_events`). Le
check-in « courant » d'un point d'étape = la dernière ligne non supplantée pour
`(protocol_draft_id, point_etape)`. Index non-unique `(protocol_draft_id, point_etape)`.

### 8.6 Constat 6 — clés primaires → **id du contrat quand il existe**

- `assessment_episodes.id` = `assessmentEpisodeId` du contrat.
- `protocol_drafts.id` = `protocolDraftId` du contrat.
- `protocol_checkins.id` = cuid généré (aucun contrat `ProtocolCheckin` amont).

Objectif : provenance + **idempotence** des écritures pour les objets déjà identifiés.

### 8.7 Constat 7 — `relecture_notes` → **différée à SP-TT**

La première migration C2A ne crée **que 3 tables** : `assessment_episodes`,
`protocol_drafts`, `protocol_checkins`. `relecture_notes` sort du périmètre C2A et est
reportée à SP-TT (aucun contrat `RelectureNote` n'existe encore). La section 3 de la
spec conserve sa description à titre de référence pour SP-TT.

### 8.8 Constat 8 — granularité praticien → **hypothèse V1 consignée**

Modèle **mono-praticien** acté comme hypothèse explicite de la V1 : aucune colonne de
scoping par praticien. Un besoin multi-praticien déclencherait une campagne dédiée, pas
une rustine sur ce modèle.

### 8.9 Schéma cible figé (document seul — 3 tables, aucun DDL exécuté)

Conventions communes (pattern `20260716120000_trust_v1`) : PK `id TEXT`, FK
`id_patient TEXT → patients(id_patient) ON DELETE RESTRICT ON UPDATE CASCADE`,
`TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`, RLS `ENABLE` deny-all **sans policy** (accès
applicatif via Prisma en connexion directe). Migration **additive unique**
`c2a_persistance_v1`.

**`assessment_episodes`** — PK `id` (=`assessmentEpisodeId`) · `id_patient` FK ·
`milestone` (T0/J21/J42/J90, réf. `momentum.ts`) · `target_at` · `confirmed_at` ·
`payload` JSONB · `payload_hash` · `contract_version` (`objets-cliniques-v1`) ·
`created_at`. Index : `(id_patient, milestone)`, `(id_patient, confirmed_at)`.

**`protocol_drafts`** — PK `id` (=`protocolDraftId`) · `id_patient` FK ·
`assessment_episode_id` FK NULL → `assessment_episodes(id)` · `decision_card_id` ·
`decision_card_input_hash` · `snapshot_input_hash` · `review_input_hash` ·
`selected_priority_id` · `status` (`draft`/`practitioner_reviewed` ; diffusion en
LOT-03) · `payload` JSONB · `input_hash` (propre au draft) ·
`contract_version` (`c1-protocol-draft-v1`) · `supersedes_draft_id` NULL ·
`reviewed_at` NULL · `created_at` · `updated_at`. Index : `(id_patient, created_at)`,
`(decision_card_id)`, `(supersedes_draft_id)`.

**`protocol_checkins`** — PK `id` (cuid) · `id_patient` FK ·
`id_assignation` FK → `assignations(id_assignation)` · `protocol_draft_id` FK →
`protocol_drafts(id)` · `point_etape` (`J7`/`J14`/`J21`) · `reponses` JSONB (2-4
réponses courtes, libellés français) · `canal` DEFAULT `'portail'` ·
`supersedes_checkin_id` NULL · `soumis_le` DEFAULT CURRENT_TIMESTAMP.
Index : `(id_patient, point_etape)`, `(protocol_draft_id)`, `(id_assignation)`.
**Aucune contrainte d'unicité** (append-only chaîné, 8.5).

**Rollback** : `DROP TABLE` des 3 nouvelles tables uniquement (aucune table existante
touchée) ; l'application reste fonctionnelle sans elles tant que les routes LOT-02+ ne
sont pas mergées (déploiement séquencé : migration d'abord, routes ensuite).

### 8.10 Matrice create/read/update — version arbitrée

| Table | Praticien (NextAuth) | Patient (cookie portail + assignation vérifiée, hors email-gate) |
|---|---|---|
| `assessment_episodes` | create / read | — |
| `protocol_drafts` | create (nouvelle version) / read | — (jamais en direct) |
| vue patient (dérivée, non persistée) | — | read (sa seule assignation, `status = practitioner_reviewed`) |
| `protocol_checkins` | read | create / read (ses check-ins, assignation vérifiée) |

Aucune mise à jour destructive ; corrections append-only ; aucune suppression en V1.
Hypothèse mono-praticien (8.8).

### 8.11 Checklist de confirmation du gate — mise à jour

Remplace l'intention de la §6 sur les deux premiers points :
- [ ] Spec validée : sections 1-5 **telles qu'amendées par §7 et arbitrées par §8**.
- [ ] `relecture_notes` : **différée à SP-TT** (8.7) — migration C2A = **3 tables**.
- [ ] Migration confirmée : **additive-only, une seule migration**, nom `c2a_persistance_v1`.
- [ ] Environnement confirmé : base éphémère d'abord, production via pipeline Vercel au merge uniquement.
- [ ] Rollback (§5 / 8.9) lu et accepté.

Tant que l'utilisateur n'a pas coché ces points **par un message distinct**, LOT-02
reste `bloqué_confirmation` ; `schema.prisma` et `web/prisma/migrations/` restent
intouchés.
