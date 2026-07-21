# Campagnes WellNeuro — index

> Mis à jour le 2026-07-18. Les frontières, invariants et arbitrages sont
> dans `docs/claude/REGISTRE_FRONTIERES.md` (source normative). La séquence
> active est dans **`PROGRAMME_WELLNEURO_5_0.md`** (qui réintègre les
> campagnes cadrées du programme 3.2 sans les dupliquer). Statuts « cadrée »
> = décisions et frontières figées, lots détaillés compilés en N+1.

| Ordre | Campagne | Statut | Dépendance | Lots |
|---|---|---|---|---|
| C0 | Alignement documentaire | **terminée** | — | 4 |
| C0-UX | Shell praticien 3.0 | **terminée** — socle livré, direction visuelle remplacée par HC-F | C0 | 6 |
| HC-F | Hybrid Clinical Foundation | **terminée** (2026-07-14, GO avec dettes — `DETTE_UX_RESIDUELLE.md`) | C0-UX | 6 |
| C1 | Décision clinique 21 jours V1 | **terminée** (2026-07-14 — GO technique ; runtime/activation/diffusion : NO-GO, repris par SP-RUN) | HC-F LOT-02 | 7 |
| QX | Expérience questionnaires | **terminée** (2026-07-14, renderer `micro_batch` seul activé) | HC-F LOT-01+04 | 5 |
| **SP-FIL** | Le Fil du jour v1 | **terminée** (2026-07-15 — accueil = Fil, rail regroupé, PR #74-#76) | — | 2 |
| **SP-RUN** | Cockpit vivant (runtime C1) | **terminée** — runtime et branchement cockpit validés le 2026-07-17 | — | N+1 |
| C2A | Points d'étape + persistance minimale | **terminée** (2026-07-18 — 7 lots en prod, gate migration levé) | C1 ✓ | 7 |
| C2B | Trajectoire et ajustement (→ Spirale) | **terminée** (2026-07-18 — LOT-07→09 en prod, sans migration ; gate modèle multi-cycles différé) | C2A ✓ | 3 |
| C3 | Documents contextuels (→ fil de correspondance) | **terminée** (2026-07-18 — V1 + montage cockpit en prod, 6 lots sans migration ; fil médecin 5.0 et persistance (b) reportés) | C1 ✓ | 6 |
| C4 | Compléments clean label (C4A/C4B) | cadrée | C4A : intrinsèque ; C4B : C1/C2 | N+1 |
| C5 | Boussole alimentaire (C5A intrinsèque/C5B contextuel) | cadrée — LOT-00 et LOT-01 terminés (2/8), LOT-02 en attente de confirmation migration, inactive | C5A : référentiel Ciqual après gates migration/import ; C5B : C1/C2 actifs | 8 |
| JA | Ma spirale alimentaire (journal recadré 5.0) | recadrée 5.0 + adaptation contrepoint (2026-07-16, A7 — trois régimes : calibrage/essai/silence), règles candidates | audit JA-00 + terrain JA-0T ; domaine pur ; persistance : C2A + gate | N+1 |
| TRUST | Information patient, consentements et sécurité relationnelle V1 | **terminée** (2026-07-16 — V1 en production, dettes DETTE_TRUST.md) | transverse : HC-F + portail ; raccord QX/C1/C2/C3/auth ; nourrit IDP/SP-AMB | 8 |
| **SP-COP** | Copilote de consultation (pré-vol & minute d'après) | **livrée** (2026-07-19) | SP-RUN ✓ + C2A ✓ + C3 ✓ | 2 |
| **SP-TT** | Time-travel et note de relecture | **livrée** (2026-07-21 — gate migration `relecture_notes`/G3 appliquée) | C2A ✓ + C2B ✓ | 2 |
| **SP-MET** | Météo d'adhésion | **livrée** (2026-07-21) | C2A ✓ (sans migration) | 1 |
| **IDP** | Identité patient durable | cadrée (2026-07-19) | **gate migration + revue de sécurité** ; activation bloquée par TRUST | 2 |
| **SP-SPI** | « Ma spirale » et reprise patient | cadrée (2026-07-19) | IDP / LOT-01 | 1 |
| SP-CAB / SP-AMB | Disposition 5.0 (suite) | à cadrer — séquence au programme 5.0 | SP-CAB : `n ≥ 5` épisodes clos ; SP-AMB : **gate CNIL/RGPD bloquant** | — |
| WN-AUTO | Orchestration | terminée | — | — |

## Campagne active

Voir : [ACTIVE_CAMPAIGN.md](ACTIVE_CAMPAIGN.md)

Le pack WN Ultimate v2 reste disponible comme source d'audit dans
[`../propositions/wn-ultimate-v2/`](../propositions/wn-ultimate-v2/README.md).
Les arbitrages promus sont décrits dans
[`../ARCHITECTURE_CLINIQUE_3_2.md`](../ARCHITECTURE_CLINIQUE_3_2.md).

La campagne TRUST est transverse et documentaire à ce stade. Elle ne devient
pas automatiquement la campagne active et n'autorise aucune migration, aucune
activation de règle clinique ni aucun usage de données réelles.

## Convention de travail

- Une campagne est l’unité d’intégration Git.
- Une branche de campagne sert de base commune à tous les lots de la campagne.
- Une branche de lot est dérivée de la branche de campagne.
- Une PR de lot cible la branche de campagne ; une PR finale de campagne cible `main`.

> **Exception assumée — Vague 2 de la refonte UX 5.0 (décision utilisateur du
> 2026-07-19)** : les campagnes SP-COP, SP-TT, SP-MET, IDP et SP-SPI sont
> livrées en **PR successives directes vers `main`**, une PR = un périmètre,
> comme la Vague 1 (#144/#145/#146/#147). Pas de branche d'intégration par
> campagne. Le gardien reste le CI : aucune PR n'est mergée sans `verify` vert.

## Reprise de session

1. Lire la dernière entrée de `docs/claude/SESSION_LOG.md`.
2. Vérifier `.wn/state.json`, puis sa vue générée `ACTIVE_CAMPAIGN.md` et le registre.
3. Ouvrir le `CAMPAGNE.md` de la campagne active.
4. `/wn-campaign status` puis `/wn-campaign next`.
