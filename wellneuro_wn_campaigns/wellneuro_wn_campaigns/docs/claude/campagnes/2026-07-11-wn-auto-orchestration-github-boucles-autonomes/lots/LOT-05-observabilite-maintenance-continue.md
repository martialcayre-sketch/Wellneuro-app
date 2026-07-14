---
id: "LOT-05"
titre: "observabilite-maintenance-continue"
statut: "terminé"
dépend_de: "LOT-04"
---

# LOT-05 — Observabilité et maintenance continue

## But

Prévoir la surveillance, les incidents expurgés et la maintenance hebdomadaire.

## Résultat observable

Une boucle de suivi continue et non sensible, prête à alimenter des incidents automatisés.

## Périmètre

- maintenance hebdomadaire ;
- dépendances ;
- dérive documentaire ;
- incidents Sentry expurgés.

## Hors périmètre

- collecte de PII ;
- données patient ;
- action de production automatique.

## Fichiers probables

- `docs/claude/SESSION_LOG.md`
- `docs/claude/campagnes/README.md`
- `.claude/skills/wn-context/SKILL.md`
- `OBSERVABILITE_MAINTENANCE_LOT05.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de déploiement production automatique.
- Pas de modification clinique.

## Étapes

- [x] Définir les signaux de maintenance.
- [x] Définir le format des incidents.
- [x] Définir le rythme hebdomadaire.
- [x] Définir les sorties d’audit.

## Tests

- Audit documentaire.
- Vérification de non-régression des garde-fous.

## Critères de done

- La maintenance continue est décrite.
- Les incidents restent expurgés.
- Le flux de suivi est reproductible.

## Résultats

- Lot clôturé le 2026-07-11.
- Contrat observabilité/maintenance produit dans `OBSERVABILITE_MAINTENANCE_LOT05.md`.
- Format d'incident expurgé et rythme hebdomadaire définis.
- Gate release explicite formalisé (GO/NO-GO non automatique).
