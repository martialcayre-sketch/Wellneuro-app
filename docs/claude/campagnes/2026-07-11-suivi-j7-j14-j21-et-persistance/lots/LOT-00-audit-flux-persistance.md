---
id: "LOT-00"
titre: "Audit des flux et besoins de persistance"
statut: "terminé"
dépend_de: "aucun"
---

# LOT-00 — Audit des flux et besoins de persistance

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-00-audit-flux-persistance.md`,
> à lire avec `../CAMPAGNE.md` (arbitrages A1, scission C2A/C2B) et
> `../SPEC_LOT-01_MODELE_PERSISTANCE.md` (proposition à valider).

## But

Identifier exactement ce qui doit être stocké et les contraintes d'accès, en
partant de l'état réel post-C1 : `AssessmentEpisode`, `ClinicalSnapshot`,
`ClinicalReview`, `DecisionCard` et `ProtocolDraft` existent en mémoire
seulement (`web/src/lib/clinical-engine/`), rien n'est persisté.

## Arbitrage compilé (exigé par la campagne)

**V1 avec persistance.** Une campagne intitulée « persistance » ne reste pas
ambiguë : la cible V1 persiste les épisodes confirmés, les protocoles relus
et leurs check-ins. L'exécution reste néanmoins entièrement suspendue au gate
migration (LOT-02 `bloqué_confirmation`) : sans confirmation humaine
explicite et distincte, la campagne s'arrête à la spécification (LOT-01) sans
modifier une ligne de `schema.prisma`.

## Résultat observable

Contrat de persistance minimal et matrice des droits create/read/update par
acteur (praticien NextAuth, patient via assignation R8-lite).

## Périmètre

- Auditer auth patient (cookie `wn_portail`), routes praticien, modèles
  Prisma existants et génération de document.
- Lister les événements de cycle de vie du protocole (brouillon, relu,
  validé, envoyé, check-in, révision).
- Définir les données strictement nécessaires aux check-ins J7/J14/J21.
- Confronter la proposition `../SPEC_LOT-01_MODELE_PERSISTANCE.md` à cet
  audit (la corriger, pas s'y conformer).

## Hors périmètre

- Écrire le schéma.
- Créer une migration.
- Modifier les contrats `clinical-engine`.

## Fichiers probables

- `web/prisma/schema.prisma` (lecture seule)
- `web/src/app/api/**`
- `web/src/lib/patient-session.ts`, `web/src/lib/auth.ts`
- `web/src/lib/clinical-engine/**` (lecture seule)
- Composants protocole C1 (`web/src/components/patient-cockpit/**`)

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [x] Cartographier acteurs et droits.
- [x] Définir les données minimales (minimisation RGPD, pas de biologie).
- [x] Vérifier HDS/RGPD sans inclure la biologie.
- [x] Produire la matrice create/read/update.
- [x] Amender la spec LOT-01 si l'audit contredit la proposition.

## Tests

- Aucun diff DB.
- Relecture sécurité.
- `node scripts/wn-campaign-audit.mjs` (vert).

## Critères de done

- [x] Le besoin est réduit au minimum.
- [x] Les droits patient/praticien sont explicites.
- [x] La spec LOT-01 est confirmée ou amendée par l'audit.

## Risques / points de vigilance

- Stocker des champs narratifs inutiles.

## Résultats (audit du 2026-07-17)

Audit conduit en lecture seule sur trois axes : contrats `clinical-engine`,
authentification/droits (praticien NextAuth + patient portail), et pattern de
persistance `trust_*` (schéma Prisma + migration `20260716120000_trust_v1`).
Aucun code, schéma ni migration modifiés.

### A. Acteurs et droits (cartographie réelle)

- **Praticien** — NextAuth JWT Google, restreint au domaine `@wellneuro.fr` à la
  connexion (`web/src/lib/auth.ts`). Chaque route `/api/praticien/*` refait la
  garde en tête de handler (`getServerSession(authOptions)` + `if (!session)`), il
  n'y a **pas de middleware**. Garde **binaire** : « session valide = praticien du
  domaine ». **Aucune granularité par praticien** : tout praticien authentifié voit
  tous les patients ; il n'y a pas d'`id_patient` côté praticien. → Modèle
  mono-praticien à acter comme hypothèse explicite de la matrice (constat 8).
- **Patient** — portail hors NextAuth : cookie HMAC-SHA256 `wn_portail`
  (`web/src/lib/patient-session.ts`, TTL 12 h, secret `NEXTAUTH_SECRET`), payload
  `{ idPatient, email, accessTokenFingerprint, exp }`. La propriété est vérifiée
  **au niveau de l'assignation** par `isSessionAuthorizedForAssignment`
  (`session.idPatient === assignation.idPatient` + re-lecture DB : patient `actif`,
  token non révoqué, empreinte concordante). Résolution identité :
  `resolvePortailPatient(token, email)` (`web/src/lib/consultation/portail.ts`) →
  un `idPatient` unique via `accessToken` (clé unique patient).
- **Chemin legacy email-gate** — en l'absence de cookie, les routes patient
  retombent sur un contrôle `email + idAssignation` (sans token). À **exclure
  explicitement de toute écriture** de check-in (constat 4).
- **R8-lite** — règle de droit, pas un acteur (`web/src/lib/consultation/mapAssignation.ts`) :
  la deadline bloque l'écriture (remplissage), jamais la lecture des réponses
  `verrouille`/`modification_demandee`. Un check-in reste donc du ressort d'une
  assignation active/déverrouillée, pas un droit permanent.

### B. Matrice create/read/update (livrable)

| Table | Praticien (NextAuth) | Patient (session portail + assignation vérifiée) |
|---|---|---|
| `assessment_episodes` | create / read | — |
| `protocol_drafts` | create (nouvelle version) / read | — (jamais `protocol_drafts` en direct ; voir vue patient, constat 3) |
| vue patient du protocole | create (dérivée à la diffusion) / read | read (sa seule assignation, via `PatientProtocolView`) |
| `protocol_checkins` | read | create / read (ses propres check-ins, assignation vérifiée, hors email-gate) |
| `relecture_notes` (si retenue) | create / read | — |

- **Update** : aucune mise à jour destructive. Les corrections sont **append-only**
  (nouvelle ligne + chaînage `supersedes_*`, pattern `trust_choice_events`). Aucune
  suppression en V1 (droits RGPD via le flux `trust_rights_requests`, hors périmètre C2A).
- La lecture patient ne porte **jamais** sur les objets praticien (`protocol_drafts`,
  `assessment_episodes`, `relecture_notes`) : uniquement une vue patient approuvée
  pour diffusion.

### C. Données minimales (minimisation RGPD, sans biologie)

- **Épisodes** : ne persister que les `ConfirmedAssessmentEpisode` (les propositions
  restent en mémoire) — fenêtre, jalon `momentum` et **ids de réponses incluses**
  (pas de recopie des contenus de réponses au-delà des refs).
- **Check-ins J7/J14/J21** : 2 à 4 réponses courtes maximum — tolérance, ressenti,
  adhésion à l'action principale. **Aucun champ narratif libre** patient au-delà de
  ces réponses ; aucune donnée émotionnelle, aucun score, aucun jalon de mesure
  (arbitrage A1). Instrument de **pilotage** uniquement.
- **Aucune biologie** dans aucune table du périmètre. Conforme à la minimisation ;
  la rétention légale s'appuie sur le `ON DELETE RESTRICT` du pattern `trust_*`.

### D. Confrontation à SPEC_LOT-01 — 8 constats (amendements portés en addendum daté de la spec)

1. **`input_hash` sur `assessment_episodes` erroné** : le `ConfirmedAssessmentEpisode`
   n'a pas de hash propre (c'est une sélection). Le hash naît sur `ClinicalSnapshot`
   (`clinicalSnapshot.ts`). Retirer la colonne ou la renommer d'après le
   `proposalHash` runtime ; corriger `contract_version` (l'épisode n'est pas
   `c1-clinical-snapshot-v1`).
2. **Provenance de hash pendante** : la spec persiste `protocol_drafts` avec
   `decision_card_input_hash` sans persister DecisionCard/Review/Snapshot. La chaîne
   d'intégrité devient invérifiable sans recalcul. Trancher : persister a minima
   l'`input_hash` de la DecisionCard, ou documenter le recalcul comme mode de
   vérification.
3. **Lecture patient de `protocol_drafts` contredit la minimisation** : la matrice de
   la spec accorde au patient `read` sur `protocol_drafts`, mais `PatientProtocolView`
   est un objet **dérivé distinct** (aucune table `patient_protocol_views`). Le patient
   ne doit jamais lire `protocol_drafts` : persister/dériver une vue patient dédiée.
4. **Autorisation des check-ins non modélisée** : `protocol_checkins` porte
   `id_patient` + `protocol_draft_id` mais pas d'`id_assignation`, alors que la
   session portail est scopée par assignation. Documenter le chemin d'autorisation
   d'écriture (`session.idPatient` → check-in) et exclure le chemin legacy email-gate.
5. **Unicité `(protocol_draft_id, point_etape)` vs append-only** : la contrainte
   interdit toute correction d'un check-in. Préférer une correction = nouvelle ligne
   chaînée (type `supersedes`) plutôt qu'une unicité stricte.
6. **PK = `*Id` du contrat** plutôt que `@default(cuid())`, pour préserver la
   provenance (hash-chain) et l'idempotence des écritures.
7. **`relecture_notes` : report recommandé à SP-TT** — aucun contrat `RelectureNote`
   n'existe dans le code ; une première migration plus étroite (3 tables) est plus sûre.
8. **Granularité praticien** : modèle mono-praticien (tout praticien voit tout) — à
   consigner comme hypothèse explicite, pas un oubli.

### E. Fichiers consultés (lecture seule)

- `web/src/lib/clinical-engine/{types.ts,assessmentEpisode.ts,clinicalSnapshot.ts,clinicalReview.ts,decisionCard.ts,protocolDraft.ts,patientProtocolView.ts,canonical.ts,runtimeFromPrisma.ts}`
- `web/src/lib/equilibre/{types.ts,constants.ts,momentum.ts}`
- `web/src/lib/{auth.ts,patient-session.ts}`, `web/src/lib/consultation/{portail.ts,mapAssignation.ts}`
- `web/src/app/api/praticien/{cockpit,synthese,reponses,metrics,patients,trust}/route.ts`,
  `web/src/app/api/patient/**`, `web/src/app/api/portail/session/route.ts`
- `web/prisma/schema.prisma`, `web/prisma/migrations/20260716120000_trust_v1/migration.sql`

### F. Écarts, dette et décision de poursuite

- **Écart principal** : la spec LOT-01 est **globalement valide mais amendée sur 8
  points** ; les constats 2, 3 et 4 touchent la sécurité/provenance et doivent être
  tranchés en LOT-01 avant toute confirmation du gate.
- **Dette laissée ouverte** : nettoyage éventuel du chemin legacy email-gate (hors
  périmètre C2A) ; la question de la persistance de DecisionCard/Review (constat 2).
- **Décision** : LOT-00 clos. Poursuite vers **LOT-01** (spécification et gate) pour
  arbitrer les constats 2-7. **LOT-02 reste `bloqué_confirmation`** : aucun DDL tant
  que la checklist de gate (SPEC section 6) n'est pas cochée explicitement par
  l'utilisateur.

### Commandes de validation

- `node scripts/wn-campaign-audit.mjs` — vert.
- `bash scripts/check_no_secrets.sh` — vert.
- `git diff --stat web/prisma` — vide (aucun diff DB).
