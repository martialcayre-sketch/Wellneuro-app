# Campagne active

**Campagne** : Étape 0 — Réalignement documentaire (registre de frontières)
**Statut** : EN COURS — puis activation de HC-F au merge de la PR #31 amendée
**Date de mise à jour** : 2026-07-12

> C0 et C0-UX sont **terminées** (tous lots `fait`, handoff livré). C0-UX est
> actée « socle technique livré — direction visuelle remplacée par Hybrid
> Clinical ». Le programme et les frontières font désormais foi dans :
> - `docs/claude/REGISTRE_FRONTIERES.md` (frontières, invariants, arbitrages)
> - `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md` (séquence)

## Séquence immédiate

1. Merger la PR #31 amendée (HC-F + QX).
2. Activer **HC-F** (`2026-07-12-hybrid-clinical-experience-questionnaires`),
   démarrer LOT-00 sur instruction explicite.
3. C1 est compilée et prête ; elle démarre après HC-F LOT-02.
4. QX démarre après HC-F LOT-01 + LOT-04, parallélisable avec C1.

## Organisation Git cible

- Une campagne aura sa branche d’intégration dédiée.
- Chaque lot partira d’une branche dérivée de cette branche de campagne.
- La PR d’un lot visera la branche de campagne, puis la PR finale visera `main`.
- Cette organisation est active à partir du lot suivant la validation de LOT-04.

## Prochaine action

```bash
/wn-campaign status
```

## Navigation

- [Programme complet](PROGRAMME_WELLNEURO_3_0.md)
- [Registre de frontières](../REGISTRE_FRONTIERES.md)
- [HC-F](2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md)
- [C1](2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md)
