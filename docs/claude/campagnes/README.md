# Campagnes WellNeuro — index

> Mis à jour le 2026-07-15. Les frontières, invariants et arbitrages sont
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
| **SP-FIL** | Le Fil du jour v1 | **cadrée — lots compilés** | — | 2 |
| **SP-RUN** | Cockpit vivant (runtime C1) | cadrée — **gate humain** (validation ergonomique C1) | gate | N+1 |
| C2A | Points d'étape + persistance minimale | cadrée | C1 ✓ + gate migration | N+1 |
| C2B | Trajectoire et ajustement (→ Spirale) | cadrée | C2A + données réelles | N+1 |
| C3 | Documents contextuels (→ fil de correspondance) | cadrée | C1 ✓ | N+1 |
| C4 | Compléments clean label (C4A/C4B) | cadrée | C4A : intrinsèque ; C4B : C1/C2 | N+1 |
| C5 | Boussole alimentaire (C5A intrinsèque/C5B contextuel) | cadrée | C5A : data-first ; C5B : C1/C2 | N+1 |
| JA | Journal alimentaire 21 jours V1 | cadrée, règles candidates | domaine pur ; persistance : C2A + gate | N+1 |
| SP-TT / SP-COP / IDP / SP-SPI / SP-MET / SP-CAB / SP-AMB | Disposition 5.0 (suite) | à cadrer — séquence au programme 5.0 | voir programme | — |
| WN-AUTO | Orchestration | terminée | — | — |

## Campagne active

Voir : [ACTIVE_CAMPAIGN.md](ACTIVE_CAMPAIGN.md)

Le pack WN Ultimate v2 reste disponible comme source d'audit dans
[`../propositions/wn-ultimate-v2/`](../propositions/wn-ultimate-v2/README.md).
Les arbitrages promus sont décrits dans
[`../ARCHITECTURE_CLINIQUE_3_2.md`](../ARCHITECTURE_CLINIQUE_3_2.md).

## Convention de travail

- Une campagne est l’unité d’intégration Git.
- Une branche de campagne sert de base commune à tous les lots de la campagne.
- Une branche de lot est dérivée de la branche de campagne.
- Une PR de lot cible la branche de campagne ; une PR finale de campagne cible `main`.

## Reprise de session

1. Lire la dernière entrée de `docs/claude/SESSION_LOG.md`.
2. Vérifier `.wn/state.json`, puis sa vue générée `ACTIVE_CAMPAIGN.md` et le registre.
3. Ouvrir le `CAMPAGNE.md` de la campagne active.
4. `/wn-campaign status` puis `/wn-campaign next`.
