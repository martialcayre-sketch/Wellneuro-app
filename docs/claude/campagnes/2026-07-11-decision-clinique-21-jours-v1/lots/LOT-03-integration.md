---
id: "LOT-03"
titre: "Cockpit — décision"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-03 — Cockpit — décision

## But

Présenter la carte de décision explicable après qualification déterministe
des signaux, manques, discordances et bloqueurs.

## Résultat observable

Le praticien voit ce qui manque et ce qui limite l'interprétation avant la
priorité proposée, avec historique technique repliable.

## Périmètre

- DecisionCard ;
- signaux convergents et discordants ;
- données manquantes, bloqueurs et contre-factuels ;
- abstention possible.

## Hors périmètre

- protocole 21 jours ;
- rédaction patient finale ;
- priorité choisie ou diffusée automatiquement par l'IA.

## Fichiers probables

- contrats produits en LOT-01
- cockpit de lecture LOT-02
- mécanisme `TwoLevelReading`

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

Tests unitaires des règles validées, replay des fixtures fictives et E2E du
flux de décision sans diffusion.

## Critères de done

- manques et discordances précèdent la décision ;
- abstention et bloqueurs testés ;
- provenance accessible ;
- aucune diffusion automatique.

## Résultats

À compléter à la clôture.
