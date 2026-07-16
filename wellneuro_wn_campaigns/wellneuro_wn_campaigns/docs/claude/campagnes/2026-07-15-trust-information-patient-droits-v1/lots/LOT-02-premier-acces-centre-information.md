---
id: "LOT-02-premier-acces-centre-information"
titre: "Premier accès et centre permanent"
statut: "terminé"
dépend_de: ["LOT-01"]
---

# LOT-02 — Premier accès et centre permanent

## But

Prototyper puis intégrer la séquence « Avant de commencer » et l’espace
« Informations, confidentialité et droits ».

## Périmètre

- quatre écrans ;
- navigation ;
- centre permanent ;
- cartes ;
- accordéons ;
- versions ;
- contenu court/long ;
- mobile ;
- accessibilité ;
- reprise.

## Dépendances

- charte patient HC-F ;
- portail permanent ;
- contrats LOT-01 ;
- textes validés pour le prototype.

## Étapes

1. Inventaire des surfaces patient.
2. Wireframes.
3. Prototype avec patients fictifs.
4. Test de compréhension.
5. Ajustement du langage.
6. Intégration sans blocage de l’onboarding historique.
7. E2E.
8. Feature flag.

## Fichiers probables

- routes portail ;
- composants patient ;
- contrats TRUST ;
- tests Playwright ;
- contenus versionnés de seed fictif.

## Interdits

- PDF comme source unique ;
- case « accepter tout » ;
- dark pattern ;
- jargon ;
- mention légale non validée ;
- activation avec données réelles.

## Done

- [ ] Accès en moins de 2 minutes.
- [ ] Centre disponible partout.
- [ ] Version visible.
- [ ] Reprise possible.
- [ ] Clavier/lecteur d’écran/mobile.
- [ ] Test de compréhension documenté.
