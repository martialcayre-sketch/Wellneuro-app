---
id: "LOT-01-modele-documentaire-versionnement"
titre: "Modèle documentaire, versionnement et événements"
statut: "terminé"
dépend_de: ["LOT-00"]
---

# LOT-01 — Modèle documentaire, versionnement et événements

## But

Définir les contrats purs du centre d’information sans persistance.

## Périmètre

- documents normatifs ;
- versions ;
- hash ;
- niveaux de changement ;
- accusés de lecture ;
- événements de choix ;
- provenance ;
- statuts ;
- événements métier.

## Étapes

1. Auditer les objets existants (`Consentement`, `BookletEnvoi`, audits).
2. Définir les types TypeScript purs.
3. Définir les invariants.
4. Définir les projections patient/praticien.
5. Définir l’idempotence.
6. Écrire les tests unitaires.
7. Préparer un plan de migration séparé, non exécuté.

## Livrables

- contrats TypeScript ;
- tests ;
- diagrammes d’état ;
- ADR « information vs document personnalisé » ;
- ADR « acknowledgement vs choice event ».

## Interdits

- migration Prisma ;
- écriture DB ;
- remplacement du consentement existant ;
- duplication du `PatientDocument` futur de C3.

## Done

- [ ] Version publiée immuable.
- [ ] Retrait append-only.
- [ ] Projection patient explicite.
- [ ] Statuts testés.
- [ ] Idempotence définie.
- [ ] Handoff C3 documenté.
