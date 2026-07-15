---
id: "LOT-01"
titre: "Le Fil du jour (accueil praticien)"
statut: "en cours"
dépend_de: "aucun"
---

# LOT-01 — Le Fil du jour (accueil praticien)

## But

Remplacer l'accueil `/dashboard` par le Fil du jour (décision A6-4) : cartes
typées construites depuis les données existantes, chacune portant son
« pourquoi maintenant » et une action explicite.

## Résultat observable

Le praticien atterrit sur le Fil : synthèses en brouillon à valider,
assignations en retard, réponses reçues récemment, signaux de reprise
(> 6 mois, informatif, sans pack), et la carte métriques « le cabinet en un
coup d'œil » (réutilise `MetricsSection`).

## Périmètre

- `web/src/lib/fil/cartes.ts` : sélection et libellés, fonctions pures
  testées (patients fictifs uniquement) ;
- `GET /api/praticien/fil` : lecture seule Prisma, session requise ;
- `web/src/components/fil/FilDuJour.tsx` : états chargement/erreur/vide ;
- `web/src/app/dashboard/page.tsx` : le Fil remplace métriques + accès
  rapides + « patients à traiter » (absorbés) ;
- adaptation du test e2e « accueil » (`dashboard-praticien.spec.ts`).

## Hors périmètre

Rail regroupé (LOT-02), épisodes/persistance (C2A), runtime C1 (SP-RUN),
météo d'adhésion (SP-MET), agenda. Aucune migration, aucun scoring.
