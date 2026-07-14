---
id: "2026-07-11-wn-auto-orchestration-github-boucles-autonomes"
titre: "WN-AUTO — Orchestration GitHub et boucles autonomes"
statut: "terminé"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "aucun"
---

# WN-AUTO — Orchestration GitHub et boucles autonomes

## Objectif

Structurer une autonomie sous contraintes pour WellNeuro : exploration, planification, codage sûr, tests,
réparation bornée, revue indépendante, preview protégée et maintenance continue, sans laisser l’IA
modifier seule les éléments cliniques, les données de santé, l’authentification, les migrations ou la
production.

## Résultat observable

Une campagne prête à exécuter par lots atomiques, avec matrice de risque, chemins d’arrêt, intégration
GitHub et revue indépendante, sans toucher à la logique métier.

## Contraintes non négociables

- Aucun secret en dur.
- Documentation et messages en français.
- Aucune donnée patient réelle.
- Patients fictifs limités à Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL sans confirmation distincte.
- Aucune écriture Supabase.
- Aucune modification clinique, d’authentification ou de droits sans validation explicite.
- Aucun déploiement production automatique.

## Décisions prises

- L’autonomie visée est bornée, pas absolue.
- Les tâches rouges restent planificatrices uniquement.
- La mémoire durable doit être GitHub + campagne + lots, pas la session courante.
- La revue indépendante est obligatoire avant toute fusion sensible.
- La séparation preview/release est retenue: preview en LOT-04, release gate explicite en LOT-05.

## Questions ouvertes

- Aucune pour le moment.

## Dépendances

- C0 en cours ; exécution WN-AUTO limitée au cadrage documentaire tant que C0 n'est pas clôturée.
- Flux `/wn-campaign-run` et `/wn-plan` conservés comme points d’entrée normatifs.
- Branch protection GitHub disponible.

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée.
- `CAMPAIGN_DRAFT.md` : séquence des lots.
- `MATRICE_RISQUE_LOT00.md` : matrice vert/orange/rouge et critères d'arrêt.
- `CONTRAT_OPERATIONNEL_LOT01.md` : état machine, transitions et règles de reprise.
- `ORCHESTRATEUR_GITHUB_LOT02.md` : triage GitHub, labels et sorties minimales.
- `BOUCLE_TEST_REPARATION_LOT03.md` : matrice de tests, retries et escalade `needs-human`.
- `REVUE_PREVIEW_LOT04.md` : critères de revue indépendante et gate preview protégé.
- `OBSERVABILITE_MAINTENANCE_LOT05.md` : maintenance hebdomadaire, incidents expurgés et gate release explicite.
- `sources/` : notes de cadrage si nécessaire.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Cadrage gouvernance et frontières | terminé | aucun |
| LOT-01 | Contrat opérationnel et état machine | terminé | LOT-00 |
| LOT-02 | Orchestrateur GitHub de base | terminé | LOT-01 |
| LOT-03 | Boucle tests et réparation bornées | terminé | LOT-02 |
| LOT-04 | Revue indépendante et preview protégée | terminé | LOT-03 |
| LOT-05 | Observabilité et maintenance continue | terminé | LOT-04 |

## Commande `/wn` de reproduction

```text
/wn-auto "Orchestration GitHub et boucles autonomes"
```

## Done de campagne

- [x] La matrice de risque est validée.
- [x] La machine à états est définie.
- [x] Le pipeline GitHub est borné et lisible.
- [x] La boucle tests/réparation est limitée.
- [x] La revue indépendante est obligatoire.
- [x] Le gate release est explicite.

## Backlog ultérieur

- Génération automatique des issues/labels/templates.
- Hardening des secrets et permissions GitHub Actions.
- Observabilité plus fine des incidents expurgés.
