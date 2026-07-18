---
id: "LOT-07"
titre: "Validation, conformité et handoff"
statut: "terminé"
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

- [x] Exécuter la matrice clinique, données, API, compatibilité et sécurité
  (`MATRICE_CONFORMITE_ET_TESTS_C5.md` ; 573 tests verts, advisors sans alerte
  bloquante, gardes 404/403/isolation testées).
- [ ] Exécuter les parcours E2E Sophie, Jennifer et Michel — **partiel** : le
  portail générique (Michel) est rejoué en CI ; les parcours « boussole » des
  trois fixtures ne sont pas écrits → **dette D-C5-02**.
- [ ] Auditer accessibilité et vocabulaire — **non exécuté** (axe absent, lecteur
  d'écran/zoom/contraste/vocabulaire = revue humaine) → **dettes D-C5-01/D-C5-03**.
- [x] Émettre trois verdicts go/no-go avec dettes (`VALIDATION_FINALE_C5.md` :
  C5A GO, C5B praticien GO, C5B patient GO conditionnel).
- [x] Produire le handoff (`HANDOFF_C5.md`) et, sur instruction du responsable, le
  plan d'activation (`ACTIVATION_RUNBOOK_C5.md`).

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

Clôture le 2026-07-18 (arbre de preuve `81fad26`).

- **Matrice technique verte** : type-check 0, lint 0 (2 warnings préexistants hors
  C5), `npm run test` **573 tests / 102 fichiers**, scoring-check OK (63
  questionnaires), `prisma validate` OK, anti-secrets OK, audit campagnes exit 0.
- **Advisors Supabase** : sécurité = uniquement `rls_enabled_no_policy` (INFO) sur
  toutes les tables, dont les tables C5A ; **0 alerte ERROR/WARN**. Performance =
  `unindexed_foreign_keys` / `unused_index` (INFO), aucune bloquante.
- **Sécurité routes C5** : flag→404, ownership praticien→403, isolation patient→404
  testées (`MATRICE_CONFORMITE_ET_TESTS_C5.md` §4).
- **Trois verdicts indépendants** (`VALIDATION_FINALE_C5.md`) : **C5A GO**,
  **C5B praticien GO**, **C5B patient GO conditionnel** (dettes D-C5-01→04).
- **Dettes** consignées (`DETTE_C5.md`), **handoff** (`HANDOFF_C5.md`) et **runbook
  d'activation + rollback par flag** (`ACTIVATION_RUNBOOK_C5.md`) produits.
- Migration/RLS/E2E rejoués par la **CI** (Postgres 15) sur la PR LOT-07.
- Instruction d'activation explicite du responsable (Martial CAYRE) consignée.

Preuve Git de clôture : renseignée au commit du lot dans `CAMPAGNE.md`.
