---
id: "LOT-03-consentements-droits-cycle-vie"
titre: "Consentements, droits et cycle de vie"
statut: "terminé"
dépend_de: ["LOT-01", "LOT-02"]
---

# LOT-03 — Consentements, droits et cycle de vie

## But

Séparer les choix facultatifs, permettre leur consultation/retrait et définir le
cycle de vie du compte.

## Périmètre

- choix spécifiques ;
- historique ;
- retraits ;
- demandes de droits ;
- clôture/suspension ;
- export ;
- mineurs/représentants ;
- délégations.

## Gate

Aucune implémentation définitive avant validation juridique des bases légales,
droits applicables et durées.

## Étapes

1. Cartographier les finalités.
2. Identifier obligatoire/facultatif.
3. Prototyper « Mes choix ».
4. Définir demandes de droits.
5. Définir cycle de vie.
6. Définir délégation.
7. Écrire tests d’autorisation.
8. Planifier migration distincte si nécessaire.

## Interdits

- précochage ;
- refus bloquant sans justification ;
- suppression d’historique ;
- promesse d’effacement absolu ;
- partage par simple lien transférable ;
- migration implicite.

## Done

- [ ] Finalités séparées.
- [ ] Historique immuable.
- [ ] Retrait aussi simple que l’accord.
- [ ] Rôle aidant visible.
- [ ] Auteur réel tracé.
- [ ] Cycle de vie testé.
