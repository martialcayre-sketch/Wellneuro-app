# Campagnes WellNeuro — index

> Mis à jour le 2026-07-12. Les frontières, invariants et arbitrages sont
> dans `docs/claude/REGISTRE_FRONTIERES.md` (source normative). La séquence
> est dans `PROGRAMME_WELLNEURO_3_0.md`. Statuts « cadrée » = décisions et
> frontières figées, lots détaillés compilés en N+1 (une campagne d'avance).

| Ordre | Campagne | Statut | Dépendance | Lots |
|---|---|---|---|---|
| C0 | Alignement documentaire | **terminée** | — | 4 |
| C0-UX | Shell praticien 3.0 | **terminée** — socle livré, direction visuelle remplacée par HC-F | C0 | 6 |
| HC-F | Hybrid Clinical Foundation | à_faire (PR #31 amendée) | C0-UX | 6 |
| C1 | Décision clinique 21 jours V1 | compilée, à_faire | HC-F LOT-02 | 7 |
| QX | Expérience questionnaires | compilée, à_faire | HC-F LOT-01+04 | 5 |
| C3 | Documents contextuels multi-destinataires V1 | cadrée | C1 | N+1 |
| C2A | Points d'étape + persistance minimale | cadrée | C1 + gate migration | N+1 |
| C2B | Trajectoire et ajustement | cadrée | C2A + données réelles | N+1 |
| C4 | Compléments clean label (C4A/C4B) | cadrée | C4A : data-first ; C4B : C1 | N+1 |
| C5 | Boussole alimentaire (C5A/C5B) | cadrée | socle : data-first ; flux : C1 | N+1 |
| WN-AUTO | Orchestration | terminée | — | — |

## Campagne active

Voir : [ACTIVE_CAMPAIGN.md](ACTIVE_CAMPAIGN.md)

## Reprise de session

1. Lire la dernière entrée de `docs/claude/SESSION_LOG.md`.
2. Vérifier `ACTIVE_CAMPAIGN.md` et le registre.
3. Ouvrir le `CAMPAGNE.md` de la campagne active.
4. `/wn-campaign status` puis `/wn-campaign next`.
