---
id: "LOT-02"
titre: "Cockpit — lecture"
statut: "à_faire"
dépend_de: "LOT-01"
---

# LOT-02 — Cockpit — lecture

## But

Construire la lecture praticien du cockpit depuis les API publiques de Mon
équilibre, sans réimplémenter les calculs.

## Résultat observable

La fiche affiche PatientHeader, radar retenu, 12 besoins, preuves A/B/C/D,
cinq objets cliniques et momentum comparable.

## Périmètre

- composants de lecture du cockpit ;
- second niveau pour sources, limites et détails ;
- états non mesuré, chargement, vide et erreur.

## Hors périmètre

- décision et protocole ;
- recalcul de Mon équilibre ;
- exposition patient des notes internes.

## Fichiers probables

- `web/src/lib/equilibre/`
- fiche patient praticien
- mécanisme `TwoLevelReading` fourni par HC-F

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

Tests unitaires des adaptateurs, tests composants et E2E praticien ciblé.

## Critères de done

- score identique avant/après adaptation ;
- provenance et limites visibles ;
- aucun calcul dupliqué ;
- navigation clavier et contraste conformes.

## Résultats

À compléter à la clôture.
