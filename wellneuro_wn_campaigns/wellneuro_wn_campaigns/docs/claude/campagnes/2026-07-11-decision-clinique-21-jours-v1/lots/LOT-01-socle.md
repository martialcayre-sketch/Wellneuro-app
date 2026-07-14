---
id: "LOT-01"
titre: "Contrats cliniques et décisionnels"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Contrats cliniques et décisionnels

## But

Définir les contrats de la carte de décision, du protocole 21 jours, des
signaux, des données manquantes, des discordances et de la validation.

## Résultat observable

Des types et invariants testables, précédés par la validation praticien des
poids, seuils, règles d'abstention et budget de charge concernés.

## Périmètre

- provenance A/B/C/D et état « non mesuré » ;
- DecisionCard et ProtocolDraft ;
- trois actions maximum, plans idéal/minimal/secours ;
- règles de charge, blocage et validation.

## Hors périmètre

- migration Prisma/SQL ;
- persistance longitudinale ;
- contenu clinique inventé ou non validé.

## Fichiers probables

- `web/src/lib/equilibre/`
- futurs contrats C1 sous `web/src/lib/clinical-engine/`
- `CHANGELOG.md` pour toute décision clinique validée

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [ ] Vérifier les hypothèses.
- [ ] Implémenter le changement minimal.
- [ ] Exécuter les validations.
- [ ] Relire le diff.
- [ ] Documenter les résultats.

## Tests

Tests unitaires purs des contrats et invariants ; `npm run type-check` et
tests ciblés du moteur clinique.

## Critères de done

- décisions cliniques explicitement validées et tracées ;
- absence jamais assimilée à zéro ;
- contrats versionnés et testés ;
- aucune migration.

## Résultats

À compléter à la clôture.
