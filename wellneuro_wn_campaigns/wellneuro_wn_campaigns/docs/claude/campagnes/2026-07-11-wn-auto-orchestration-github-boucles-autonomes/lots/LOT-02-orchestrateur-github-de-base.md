---
id: "LOT-02"
titre: "orchestrateur-github-de-base"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-02 — Orchestrateur GitHub de base

## But

Préparer le triage d’une intention `/wn-auto` en issue, labels, branche ou PR préparée.

## Résultat observable

Un pipeline conceptuel de base, borné à la préparation et au triage.

## Périmètre

- issues GitHub ;
- labels de risque ;
- templates de ticket ;
- préparation de PR.

## Hors périmètre

- exécution de code ;
- écriture dans les dépôts externes ;
- déploiement.

## Fichiers probables

- `README_AUTOMATISATION_CLAUDE_CODE.md`
- `.claude/skills/wn-auto/SKILL.md`
- `docs/claude/campagnes/README.md`
- `ORCHESTRATEUR_GITHUB_LOT02.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration.
- Pas d’écriture Supabase.

## Étapes

- [x] Définir le mapping intention → campagne.
- [x] Définir les labels de risque.
- [x] Définir les sorties minimales de l’orchestrateur.
- [x] Définir la stratégie de reprise.

## Tests

- Revue du contrat de sortie.
- Vérification qu’aucune action rouge n’est implicite.

## Critères de done

- Le triage est borné.
- La préparation de PR est distincte de l’implémentation.
- Aucune opération sensible n’est automatique.

## Résultats

- Lot clôturé le 2026-07-11.
- Contrat d'orchestrateur de base produit dans `ORCHESTRATEUR_GITHUB_LOT02.md`.
- Labels de risque et sorties minimales normalisés.
- Reprise de triage définie sans automatisation sensible.
