---
id: "LOT-00"
titre: "Audit des données et arbitrages"
statut: "à_faire"
dépend_de: "HC-F LOT-02"
---

# LOT-00 — Audit des données et arbitrages

## But

Vérifier les données réellement disponibles, l'état de la fiche patient et
les frontières du registre avant toute construction du cockpit C1.

## Résultat observable

Une cartographie factuelle des entrées C1 et un arbitrage documenté du radar,
sans modification de logique clinique.

## Périmètre

- assignations, réponses, synthèses et statuts R8-lite en lecture seule ;
- API publiques de `web/src/lib/equilibre/` ;
- écrans actuels de fiche patient ;
- choix radar 3 strates / cinq objets cliniques.

## Hors périmètre

- implémentation du cockpit ;
- changement de formule, seuil ou scoring ;
- persistance longitudinale.

## Fichiers probables

- `web/src/lib/equilibre/`
- fiche patient praticien et APIs consommées
- `docs/claude/REGISTRE_FRONTIERES.md`
- `CAMPAGNE.md` de C1

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

Tests non applicables à ce lot d'audit. Vérifier les références par recherche
ciblée et consigner les preuves.

## Critères de done

- sources et limites recensées ;
- arbitrage radar explicite ;
- aucune donnée patient réelle ;
- go/no-go pour LOT-01.

## Résultats

À compléter à la clôture.
