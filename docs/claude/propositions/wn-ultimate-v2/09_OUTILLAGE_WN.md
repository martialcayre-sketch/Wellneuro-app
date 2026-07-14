---
id: "wellneuro-outillage-wn-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Outillage `/wn-*`

## 1. Correction prioritaire

`wn-campaign.mjs` doit lire l’ID explicitement actif dans `ACTIVE_CAMPAIGN.md`.

Format :

```yaml
---
active_campaign_id: "2026-07-12-hybrid-clinical-experience-questionnaires"
active_lot: "LOT-05"
status: "active"
updated_at: "2026-07-13"
---
```

État réconcilié : le défaut est confirmé dans `scripts/wn-campaign.mjs`, qui
sélectionne actuellement la première campagne non close au lieu de lire ce
fichier. Cette correction relève d'une branche technique séparée.

## 2. Statuts

- `prepared_non_active` ;
- `planned` ;
- `active` ;
- `blocked` ;
- `suspended` ;
- `completed` ;
- `abandoned`.

## 3. Commandes campagne

```text
create --prepared
activate <campaign-id>
deactivate
status
next
validate <campaign-id>
```

L’activation vérifie dépendances, gates et lots.

## 4. `/wn-corpus`

```text
inventory
status
source-diff <source-id>
parse <source-id> --dry-run
validate --scope <domain>
compile --candidate
publish <build-id> --clinical-gate <gate-id>
rollback <build-id>
```

Lecture seule par défaut.

## 5. `/wn-rule-review`

Présente :

- conditions ;
- sorties ;
- sources ;
- conflits ;
- cas limites ;
- fixtures ;
- décisions attendues.

Résultats : valider, modifier, quarantiner, déprécier.

## 6. `/wn-clinical-audit`

Audite :

```text
source → claim → règle → finding → signal
→ décision → protocole → document
```

## 7. `/wn-source-delta`

Identifie les impacts d’une modification de source.

## 8. Context pack

Ajouter :

```json
{
  "activeCampaignId": "",
  "activeLot": "",
  "preparedCampaigns": [],
  "clinicalCorpusVersion": "",
  "corpusManifestHash": "",
  "corpusBuildStatus": "none",
  "openBlockingConflicts": 0,
  "pendingClinicalGates": [],
  "pilotDomain": "sleep_chronobiology"
}
```

## 9. Tests et clôture

`/wn-test clinical-corpus` vérifie :

- schémas ;
- provenance ;
- audience ;
- claims orphelins ;
- conflits ;
- règles sans source ;
- build hash ;
- replay ;
- firewall ;
- rollback.

`/wn-finish` bloque si :

- conflit bloquant ;
- gate non validé ;
- build candidat non publié utilisé ;
- hash absent ;
- fixtures non rejouées ;
- documentation non synchronisée ;
- migration non confirmée.

## 10. PR et review

Toute PR clinique inclut :

- objets touchés ;
- versions ;
- sources ;
- impacts fixtures ;
- audience ;
- migration ;
- décision praticien requise.
