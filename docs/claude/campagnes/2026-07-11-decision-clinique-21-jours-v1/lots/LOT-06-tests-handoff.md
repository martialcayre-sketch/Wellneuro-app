---
id: "LOT-06"
titre: "Tests, documentation et handoff"
statut: "à_faire"
dépend_de: "LOT-05"
---

# LOT-06 — Tests, documentation et handoff

## But

Prouver le parcours complet C1 et préparer les contrats consommés par C2 et
C3 sans ouvrir leur périmètre.

## Résultat observable

Un verdict go/no-go documenté, un replay des fixtures fictives et un handoff
explicite pour protocole actif, suivi et composition documentaire.

## Périmètre

- tests unitaires, intégration et E2E C1 ;
- critères comprendre en moins de deux minutes / préparer en dix minutes ;
- accessibilité et contrôle d'audience ;
- documentation, `CHANGELOG.md` et handoff C2/C3.

## Hors périmètre

- migration de persistance C2 ;
- templates et diffusion C3 ;
- correction silencieuse d'un écart clinique.

## Interdits

- Ne pas déclarer réussi un test non exécuté.
- Ne pas utiliser de patient réel.
- Ne pas fermer avec une décision clinique ou une divergence bloquante ouverte.

## Tests

```bash
cd web && npm run type-check
cd web && npm run lint
cd web && npm run test
cd web && npm run scoring-check
bash scripts/check_no_secrets.sh
```

Compléter par les parcours E2E C1 applicables et une validation manuelle des
audiences praticien/patient.

## Critères de done

- sept lots C1 cohérents et documentés ;
- fixtures fictives rejouées ;
- aucune régression scoring ;
- handoffs C2/C3 acceptables ;
- verdict final consigné.

## Résultats

À compléter à la clôture.
