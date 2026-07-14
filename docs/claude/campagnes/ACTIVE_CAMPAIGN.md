# Campagne active

**Campagne** : HC-F terminée — C1 et QX prêtes à démarrer
**Statut** : HC-F clôturée le 2026-07-14 (verdict GO avec dettes, voir
`2026-07-12-hybrid-clinical-experience-questionnaires/VALIDATION_FINALE.md`)
**Date de mise à jour** : 2026-07-14

> C0, C0-UX et **HC-F** sont désormais **terminées**. Le programme et les
> frontières font toujours foi dans :
> - `docs/claude/REGISTRE_FRONTIERES.md` (frontières, invariants, arbitrages)
> - `docs/claude/campagnes/PROGRAMME_WELLNEURO_3_0.md` (séquence)

## Séquence immédiate

1. **C1** (Décision clinique 21 jours V1) et **QX** (moteur de rendu
   questionnaires) sont toutes deux débloquées — leurs dépendances envers
   HC-F sont satisfaites (voir
   `2026-07-12-hybrid-clinical-experience-questionnaires/HANDOFF_FUTURES_IMPLANTATIONS.md`).
   Parallélisables. Démarrage sur instruction explicite.

## Organisation Git cible

- Une campagne a sa branche d’intégration dédiée.
- Chaque lot part d’une branche dérivée de cette branche de campagne.
- La PR d’un lot vise la branche de campagne, puis la PR finale vise `main`.

## Prochaine action

```bash
/wn-campaign status
```

## Navigation

- [Programme complet](PROGRAMME_WELLNEURO_3_0.md)
- [Registre de frontières](../REGISTRE_FRONTIERES.md)
- [HC-F (terminée)](2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md)
- [C1](2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md)
