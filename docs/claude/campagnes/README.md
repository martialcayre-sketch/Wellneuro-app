# WellNeuro 3.0 — Campagnes autonomes

> Programme de développement par campagnes (C0-C5).
> Dernier update : 2026-07-11

## Ordre d'exécution

| # | Campagne | Status | Dépendances | Lots |
|---|----------|--------|-------------|------|
| C0 | Alignement documentaire | **ACTIVE** | — | 4 |
| C1 | Décision clinique 21j | Prête | C0 | 5 |
| C2 | Persistance J7/J14/J21 | Prête | C1 + confirmation | 5 |
| C3 | Fiches conseils | Prête | C1 | 5 |
| C4 | Compléments clean label | Prête | C1 + C3 | 5 |
| C5 | Boussole alimentaire | Prête | C1 + validation | 5 |

## Campagne active

Voir : [ACTIVE_CAMPAIGN.md](ACTIVE_CAMPAIGN.md)

## Prochaine action

```bash
/wn-campaign-run      # Affiche le prochain lot
/wn-campaign next     # Alias court
```

## Programme complet

Voir : [PROGRAMME_WELLNEURO_3_0.md](PROGRAMME_WELLNEURO_3_0.md)

## Guide de lecture

1. **Première visite** : Lire PROGRAMME_WELLNEURO_3_0.md
2. **Campagne active** : Ouvrir `2026-07-11-*/CAMPAGNE.md`
3. **Prochain lot** : `/wn-campaign next` (affiche LOT-NN-titre.md)
4. **Reprise contexte** : `/wn-context` ou `/wn-handoff`
