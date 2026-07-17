---
id: "LOT-01"
titre: "Spécification du modèle et gate migration"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Spécification du modèle et gate migration

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-01-spec-modele-gate.md`.
> La proposition de travail est `../SPEC_LOT-01_MODELE_PERSISTANCE.md`
> (document seul, rédigé à la compilation) : ce lot la valide, l'amende et
> consigne la checklist de confirmation — il ne repart pas de zéro.

## But

Formaliser le schéma cible, l'API et la stratégie de migration **sans
l'exécuter**.

## Décision de nommage (ADR, actée à la compilation)

Nommage **registre 5.0** : `AssessmentEpisode`, `ProtocolDraft`,
`ProtocolCheckin`, `RelectureNote` (décision A6-1) — mêmes noms que les
contrats réels de `web/src/lib/clinical-engine/types.ts`. L'alternative
`CarePlan`/`CarePlanPhase`/`CareAction` du brouillon initial est **écartée** :
elle introduirait une couche de renommage entre le code C1 livré et la base,
sans bénéfice. Détail et conséquences : `../SPEC_LOT-01_MODELE_PERSISTANCE.md`.

## Résultat observable

ADR/modèle validé et checklist de confirmation du gate prête à être soumise
à l'utilisateur.

## Périmètre

- Spécifier `assessment_episodes`, `protocol_drafts`, `protocol_checkins`,
  `relecture_notes` : index, relations, statuts, stratégie de suppression.
- Définir la compatibilité avec le protocole local V1 (brouillon
  `ProtocolDraft` en mémoire, hashes `inputHash` conservés).
- Comparer stocker vs recalculer les snapshots.
- Consigner la checklist de confirmation du gate (voir spec, section 6).

## Hors périmètre

- Modifier `schema.prisma`.
- Lancer Prisma migrate.

## Fichiers probables

- `docs/claude/**` (spec, ADR)
- `web/prisma/schema.prisma` en lecture seulement
- Types protocole existants (`clinical-engine/types.ts`, lecture seule)

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

- [x] Valider/amender la spec (diagramme, contrats, index).
- [x] Comparer les alternatives stocker/calculer pour les snapshots.
- [x] Valider la minimisation des données.
- [x] Finaliser la checklist de confirmation — la confirmation elle-même
      relève de l'utilisateur, avant LOT-02.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `node scripts/wn-campaign-audit.mjs` (vert)

## Critères de done

- [x] La migration est estimable et réversible (additive-only, rollback documenté).
- [x] La checklist de confirmation est consignée avant LOT-02.

## Risques / points de vigilance

- Transformer le modèle V1 en plateforme générique trop tôt.

## Résultats (2026-07-17)

Audit LOT-00 validé par l'utilisateur ; les 8 constats structurants et le choix
stocker/recalculer sont **tranchés** dans `../SPEC_LOT-01_MODELE_PERSISTANCE.md`
**section 8** (qui prime sur les sections 3-4 en cas d'écart). Aucun `schema.prisma`
ni migration touchés (hors périmètre, gate LOT-02 verrouillé).

### Décisions actées (spec §8)

- **§8.0 Snapshots : recalculer, ancré par hash** — snapshot/review/decision-card
  non persistés, recalculables depuis l'épisode confirmé + les réponses ; provenance
  ancrée par colonnes de hash sur `protocol_drafts`. Alternative « stocker le
  snapshot » écartée (duplication de donnée dérivée, contre minimisation).
- **§8.1** épisode sans `input_hash` : `payload` + `payload_hash` (calculé à la
  persistance) + `contract_version = objets-cliniques-v1`.
- **§8.2** provenance = colonnes d'ancrage sur `protocol_drafts` (pas de tables
  dérivées).
- **§8.3** vue patient **dérivée à la volée** (aucune table), lecture gâtée sur
  `status = practitioner_reviewed`.
- **§8.4** check-in : colonne `id_assignation`, autorisation par session portail
  vérifiée, **email-gate exclu en écriture**.
- **§8.5** append-only chaîné (`supersedes_checkin_id`), pas d'unicité stricte.
- **§8.6** PK = id du contrat pour épisodes/drafts, cuid pour check-ins.
- **§8.7** `relecture_notes` **différée à SP-TT** → migration C2A = **3 tables**.
- **§8.8** hypothèse **mono-praticien** consignée.

### Résultat observable

- Schéma cible figé (§8.9), matrice CRU arbitrée (§8.10), checklist de gate
  actualisée (§8.11) : migration additive unique `c2a_persistance_v1`, 3 tables,
  rollback = `DROP` des 3 tables, réversible.

### Écarts / dette

- La checklist §8.11 reste **non cochée** : sa validation relève exclusivement de
  l'utilisateur (message distinct) avant LOT-02.
- Dette reportée hors C2A : `relecture_notes`/SP-TT ; nettoyage du chemin legacy
  email-gate ; besoin multi-praticien (campagne dédiée si nécessaire).

### Commandes de validation

- `bash scripts/check_no_secrets.sh` — vert.
- `cd web && npm run type-check` — vert (aucun code modifié).
- `node scripts/wn-campaign-audit.mjs` — vert.
- `git diff --stat web/prisma` — vide.

### Décision de poursuite

LOT-01 clos. **LOT-02 reste `bloqué_confirmation`** : il n'est déverrouillé que par la
checklist §8.11 cochée explicitement par l'utilisateur. Aucun DDL d'ici là.
