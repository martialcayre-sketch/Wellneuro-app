---
id: "LOT-07"
titre: "Validation, conformité et handoff"
statut: "à_faire"
dépend_de: "LOT-04 + LOT-05 + LOT-06"
---

# LOT-07 — Validation, conformité et handoff

## But

Prouver la conformité de la tranche et rendre trois décisions go/no-go
indépendantes avant toute activation.

## Résultat observable

Un dossier de preuves, un handoff et des verdicts séparés pour C5A, C5B
praticien et C5B patient.

## Périmètre

- Frontières 5.0, clinique, provenance, versions et invalidation.
- RLS, grants, routes, ownership et isolation inter-patient.
- Rétrocompatibilité C1/C2/JA et protocole V1/V2.
- Accessibilité, responsive, français et vocabulaire non culpabilisant.
- Déploiement futur derrière WN_C5_ENABLED=false.
- Procédure d'activation explicite et rollback par désactivation du flag.

## Hors périmètre

Scan, OFF, chronobiologie, menus, panier, analyses journée/semaine, biologie,
documents C3 et tout DROP/DELETE.

## Fichiers probables

Tests C5, rapports de migration/import, matrice sécurité, preuves E2E, handoff,
CAMPAGNE.md, CHANGELOG.md et SESSION_LOG.md lors de la clôture réelle.

## Interdits

- Aucun verdict global masquant un volet en échec.
- Aucune activation implicite.
- Aucun DROP/DELETE dans une procédure de rollback.
- Aucun patient réel dans les preuves ; utiliser seulement les trois fixtures
  fictives autorisées.

## Étapes

- [ ] Exécuter la matrice clinique, données, API, compatibilité et sécurité.
- [ ] Exécuter les parcours E2E Sophie, Jennifer et Michel.
- [ ] Auditer accessibilité et vocabulaire.
- [ ] Émettre trois verdicts go/no-go avec dettes bloquantes.
- [ ] Produire le handoff et, seulement sur instruction, le plan d'activation.

## Tests

Type-check, tests ciblés puis élargis, certification clinique applicable,
prisma validate/generate, migration éphémère, intégrité import, RLS/advisors,
API 401/403/404, isolation, JA V1/V2, protocole caduc, E2E desktop/tablette/
mobile, clavier, zoom 200 %, contraste et anti-secrets.

## Critères de done

- Chaque volet a un verdict, des preuves et des blocages explicites.
- C5B patient ne peut être GO sans C5A intègre et C5B praticien validé.
- Le flag reste false tant qu'une activation séparée n'est pas demandée.
- Le handoff distingue rollback applicatif et action destructive interdite.

## Risques / points de vigilance

Une réussite UI ne compense jamais une preuve clinique, une migration ou une
isolation insuffisante ; les trois verdicts restent indépendants.

## Résultats

À renseigner lors de la clôture du lot.
